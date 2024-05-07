import {
    normalizeLongitude,
    parseCategories,
    parseLatitude,
    parseNonEmptyString,
    parseObjectId,
    removeDuplicates,
    throwIfNullOrUndefined,
} from "../helpers.js";
import { Place } from "../config/database.js";
import { distanceBetweenPointsMiles, parseOsmId, parseOsmType, parseSearchRadius } from "./geolocation.js";
import { ObjectId } from "mongodb";
import Enumerable from "linq";

/**
 * The disability category for physical disabilities.
 * @type {string}
 */
export const DISABILITY_CATEGORY_PHYSICAL = "physical";

/**
 * The disability category for neurodivergency.
 * @type {string}
 */
export const DISABILITY_CATEGORY_NEURODIVERGENT = "neurodivergent";

/**
 * The disability category for sensory disabilities.
 * @type {string}
 */
export const DISABILITY_CATEGORY_SENSORY = "sensory";

export const parsePlaceFields = (name, description, osmType, osmId) => {
    // If name and description are not strings or are empty strings, the method should throw.
    return {
        name: parseNonEmptyString(name, "Place name"),
        description: parseNonEmptyString(description, "Place description"),
        osmId: parseOsmId(osmId),
        osmType: parseOsmType(osmType),
    };
};

export const createPlace = async (name, description, osmType, osmId, address, longitude, latitude) => {
    const parsed = parsePlaceFields(name, description, osmType, osmId);
    const document = new Place({
        _id: new ObjectId(),
        name: parsed.name,
        description: parsed.description,
        comments: [],
        location: {
            _id: new ObjectId(),
            osmId: parsed.osmId,
            osmType: parsed.osmType,
            address: address.displayName,
            longitude: longitude,
            latitude: latitude,
            //lookup happened in routes - API calls are expensive
        },
        reviews: [],
    });

    await document.save();
    return document;
};

/**
 *
 * @param placeId
 * @returns {Promise<module:mongoose.Schema<any, Model<RawDocType, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, ApplySchemaOptions<ObtainDocumentType<any, RawDocType, ResolveSchemaOptions<TSchemaOptions>>, ResolveSchemaOptions<TSchemaOptions>>, HydratedDocument<FlatRecord<DocType>, TVirtuals & TInstanceMethods>> extends Schema<infer EnforcedDocType, infer M, infer TInstanceMethods, infer TQueryHelpers, infer TVirtuals, infer TStaticMethods, infer TSchemaOptions, infer DocType> ? DocType : unknown extends any[] ? Require_id<FlattenMaps<module:mongoose.Schema<any, Model<RawDocType, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, ApplySchemaOptions<ObtainDocumentType<any, RawDocType, ResolveSchemaOptions<TSchemaOptions>>, ResolveSchemaOptions<TSchemaOptions>>, HydratedDocument<FlatRecord<DocType>, TVirtuals & TInstanceMethods>> extends Schema<infer EnforcedDocType, infer M, infer TInstanceMethods, infer TQueryHelpers, infer TVirtuals, infer TStaticMethods, infer TSchemaOptions, infer DocType> ? DocType : unknown>>[] : Require_id<FlattenMaps<module:mongoose.Schema<any, Model<RawDocType, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, ApplySchemaOptions<ObtainDocumentType<any, RawDocType, ResolveSchemaOptions<TSchemaOptions>>, ResolveSchemaOptions<TSchemaOptions>>, HydratedDocument<FlatRecord<DocType>, TVirtuals & TInstanceMethods>> extends Schema<infer EnforcedDocType, infer M, infer TInstanceMethods, infer TQueryHelpers, infer TVirtuals, infer TStaticMethods, infer TSchemaOptions, infer DocType> ? DocType : unknown>>>}
 */
export const getPlace = async (placeId) => {
    placeId = parseObjectId(placeId, "Place id");
    const foundPlace = await Place.findOne({ _id: ObjectId.createFromHexString(placeId) }).exec();
    if (!foundPlace) {
        throw new Error(`Failed to find place with id ${placeId}`);
    }
    foundPlace.avgRatings = await getAverageCategoryRatings(foundPlace);
    return foundPlace;
};

//review functions:

//create
export const addReview = async (placeId, author, content, categories) => {
    placeId = parseObjectId(placeId, "Place Id");
    author = parseObjectId(author, "Author Id");
    content = parseNonEmptyString(content, "Content of review");
    categories = parseCategories(categories);
    const placeReviewed = await getPlace(placeId);
    const review = await Place.updateOne(
        { _id: placeId },
        {
            $push: {
                reviews: {
                    _id: new ObjectId(),
                    author: author,
                    content: content,
                    createdAt: new Date(),
                    likes: [],
                    dislikes: [],
                    categories: categories,
                    comments: [],
                },
            },
        }
    ).exec();
    if (!review) {
        throw new Error(`Could not insert review in place with id ${placeId}`);
    }
    return review;
};
//get specific review
export const getReview = async (reviewId) => {
    reviewId = parseObjectId(reviewId, "Review Id");
    const searchedReview = await Place.findOne(
        { "reviews._id": new ObjectId(reviewId) },
        { projection: { "reviews.$": true, _id: false } }
    ).exec();
    if (searchedReview === null) {
        throw new Error(`Review with that id could not be found!`);
    }
    return searchedReview;
};
//get all from specific place

/**
 *
 * @param placeId
 * @returns {Promise<*>}
 */
export const getAllReviewsFromPlace = async (placeId) => {
    placeId = parseObjectId(placeId);
    return (await Place
        .findOne({ _id: ObjectId.createFromHexString(placeId) }, null, null)
        .select("reviews")
        .exec()).reviews;
};

//update review
export const updateReview = async (reviewId, content, categories) => {
    reviewId = parseObjectId(reviewId, "Review Id");
    content = parseNonEmptyString(content, "Review content");
    categories = parseCategories(categories);
    const searchedReview = getReview(reviewId);
    //if no changes were actually made, end early
    if (content === searchedReview.content && categories === searchedReview.categories) {
        return;
    }
    const updatedPlace = await Place.findOneAndUpdate(
        { "reviews._id": new ObjectId(reviewId) },
        { $set: { "reviews.content": content, "reviews.categories": categories } }
    ).exec();
    throwIfNullOrUndefined(updateReview);
    //recompute average
    getAverageCategoryRatings(updatedPlace._id);
    return searchedReview;
};
//delete review
export const deleteReview = async (reviewId) => {
    reviewId = parseObjectId(reviewId, "Review Id");
    const placeReviewed = await Place.findOne({ "reviews._id": new ObjectId(reviewId) }).exec();
    const updateResult = await Place.updateOne(
        { "reviews._id": new ObjectId(reviewId) },
        { $pull: { reviews: { _id: new ObjectId(reviewId) } } }
    ).exec();
    if (!updateResult) {
        throw new Error(`Failed to delete review with id ${reviewId}`);
    }
    return placeReviewed;
};

/**
 * Tests if the given user has a review for the given place.
 * @param {string} placeId
 * @param {string} userId
 * @returns {Promise<boolean>} True if the user has already reviewed this place, false otherwise.
 * @author Anthony Webster
 */
export const userHasReviewForPlace = async (placeId, userId) =>
{
    placeId = parseObjectId(placeId);
    userId = parseObjectId(userId);
    const placeReviews = await getAllReviewsFromPlace(placeId);
    return placeReviews.some(r => parseObjectId(r.author) === userId);
};

/**
 * Computes the average ratings for each disability category for a place.
 *
 * @param {string} placeId The ID of the place to calculate the average for.
 * @returns {Promise<{overall: (number|null), byCategory: {DISABILITY_CATEGORY_NEURODIVERGENT: (number|null),
 * DISABILITY_CATEGORY_PHYSICAL: (number|null), DISABILITY_CATEGORY_SENSORY: (number|null)}}>} An object
 * containing the overall average rating and average ratings by category. If a place does not have ratings
 * for a given category, then that category's average rating is `null`.
 * @author Anthony Webster
 */
export const getAverageCategoryRatings = async (placeId) => {
    // Let's take the easy way out and do this in JS instead.
    const place = await getPlace(placeId);
    let overallTotal = 0;
    let overallCount = 0;
    const ratings = {
        DISABILITY_CATEGORY_NEURODIVERGENT: { count: 0, total: 0 },
        DISABILITY_CATEGORY_PHYSICAL: { count: 0, total: 0 },
        DISABILITY_CATEGORY_SENSORY: { count: 0, total: 0 },
    };
    for (const categories of place.reviews.map((r) => r.categories)) {
        for (const { categoryName, rating } of categories) {
            if (ratings[categoryName] === undefined) {
                ratings[categoryName] = { count: 0, total: 0 };
            }
            ratings[categoryName].count++;
            ratings[categoryName].total += rating;
            overallTotal += rating;
            overallCount++;
        }
    }

    const averaged = {};
    for (const [category, { count, total }] in Object.entries(ratings)) {
        averaged[category] = count === 0 ? null : total / count;
    }

    return {
        overall: overallCount === 0 ? null : overallTotal / overallCount,
        byCategory: averaged,
    };
};

//comment functions:

//create place comment
export const addPlaceComment = async (placeId, author, content) => {
    author = parseObjectId(author, "Author Id");
    content = parseNonEmptyString(content, "Content of comment");
    placeId = parseObjectId(placeId, "Place Id");

    await getPlace(placeId); //check if the place exists

    const comment = await Place.updateOne(
        { _id: placeId },
        {
            $push: {
                comments: {
                    author: author,
                    content: content,
                    createdAt: new Date(),
                    likes: [],
                    dislikes: [],
                },
            },
        }
    ).exec();

    if (!comment) {
        throw new Error(`Could not insert comment in place with id ${placeId}`);
    }

    return comment;
};

//create review comment
export const addReviewComment = async (reviewId, author, content) => {
    author = parseObjectId(author, "Author Id");
    content = parseNonEmptyString(content, "Content of comment");
    reviewId = parseObjectId(reviewId, "Review Id");

    await getReview(reviewId); //check if the place exists

    const comment = await Place.updateOne(
        { "reviews._id": reviewId },
        {
            $push: {
                comments: {
                    author: author,
                    content: content,
                    createdAt: new Date(),
                    likes: [],
                    dislikes: [],
                },
            },
        }
    ).exec();

    if (!comment) {
        throw new Error(`Could not insert comment in place with id ${reviewId}`);
    }

    return comment;
};

//get all comments from place/review
export const getAllCommentsFromPlace = async (placeId) => {
    placeId = parseObjectId(placeId);
    const place = await getPlace(placeId);

    return place.comments;
};

export const getAllCommentsFromReview = async (reviewId) => {
    reviewId = parseObjectId(reviewId);
    const review = await getReview(reviewId);

    return review.comments;
};

//get specific comment
export const getComment = async (reviewId, commentId) => {
    reviewId = parseObjectId(reviewId);
    commentId = parseObjectId(commentId);

    const comments = await getAllCommentsFromReview(reviewId);

    for (let i = 0; i < comments.length; i++) {
        if (String(comments[i]._id) === String(commentId)) {
            return comments[i];
        }
    }
    throw new Error("No such comment found");
};

//Increase Review Likes
export const increaseReviewLikes = async (name, reviewId) => {
    reviewId = parseObjectId(reviewId);
    let review = await getReview(reviewId);
    review.likes.append(name);
};
//Decrease Review Likes
export const decreaseReviewLikes = async (name, reviewId) => {
    reviewId = parseObjectId(reviewId);
    let review = await getReview(reviewId);
    const index = review.likes.indexOf(name);
    if (index === -1) {
        throw new error("User has already removed their like");
    } else {
        review.likes.splice(index, 1);
    }
};
//Increase Comment Likes
export const increaseCommentLikes = async (name, reviewId, commentId) => {
    reviewId = parseObjectId(reviewId);
    commentId = parseObjectId(commentId);
    let comment = await getComment(reviewId, commentId);
    comment.likes.append(name);
};
//Decrease Comment Likes
export const decreaseCommentLikes = async (name, reviewId, commentId) => {
    reviewId = parseObjectId(reviewId);
    commentId = parseObjectId(commentId);
    let comment = await getComment(reviewId, commentId);
    const index = comment.likes.indexOf(name);
    if (index === -1) {
        throw new error("User has already removed their like");
    } else {
        comment.likes.splice(index, 1);
    }
};
//Increase Review Dislikes
export const increaseReviewDislikes = async (name, reviewId) => {
    reviewId = parseObjectId(reviewId);
    let review = await getReview(reviewId);
    review.dislikes.append(name);
};
//Decrease Review Dislikes
export const decreaseReviewDislikes = async (name, reviewId) => {
    reviewId = parseObjectId(reviewId);
    let review = await getReview(reviewId);
    const index = review.dislikes.indexOf(name);
    if (index === -1) {
        throw new error("User has already removed their like");
    } else {
        review.dislikes.splice(index, 1);
    }
};
//Increase Comment Dislikes
export const increaseCommentDisikes = async (name, reviewId, commentId) => {
    reviewId = parseObjectId(reviewId);
    commentId = parseObjectId(commentId);
    let comment = await getComment(reviewId, commentId);
    comment.dislikes.append(name);
};
//Decrease Comment Dislikes
export const decreaseCommentDislikes = async (name, reviewId, commentId) => {
    reviewId = parseObjectId(reviewId);
    commentId = parseObjectId(commentId);
    let comment = await getComment(reviewId, commentId);
    const index = comment.dislikes.indexOf(name);
    if (index === -1) {
        throw new error("User has already removed their like");
    } else {
        comment.dislikes.splice(index, 1);
    }
};

//search
const stateAbbreviationToFullNameMap = {
    al: "alabama",
    ak: "alaska",
    az: "arizona",
    ar: "arkansas",
    ca: "california",
    co: "colorado",
    ct: "connecticut",
    de: "delaware",
    dc: "district of columbia",
    fl: "florida",
    ga: "georgia",
    hi: "hawaii",
    id: "idaho",
    il: "illinois",
    in: "indiana",
    ia: "iowa",
    ks: "kansas",
    ky: "kentucky",
    la: "louisiana",
    me: "maine",
    md: "maryland",
    ma: "massachusetts",
    mi: "michigan",
    mn: "minnesota",
    ms: "mississippi",
    mo: "missouri",
    mt: "montana",
    ne: "nebraska",
    nv: "nevada",
    nh: "new hampshire",
    nj: "new jersey",
    nm: "new mexico",
    ny: "new york",
    nc: "north carolina",
    nd: "north dakota",
    oh: "ohio",
    ok: "oklahoma",
    or: "oregon",
    pa: "pennsylvania",
    ri: "rhode island",
    sc: "south carolina",
    sd: "south dakota",
    tn: "tennessee",
    tx: "texas",
    ut: "utah",
    vt: "vermont",
    va: "virginia",
    wa: "washington",
    wv: "west virginia",
    wi: "wisconsin",
    wy: "wyoming",
};

const stateAbbreviationToFullName = (abbreviation) => {
    abbreviation = parseNonEmptyString(abbreviation, "state abbreviation");
    if (abbreviation.length !== 2) {
        throw new Error("State abbreviation must be exactly 2 characters");
    }
    if (!(abbreviation in stateAbbreviationToFullNameMap)) {
        throw new Error(`Invalid state abbreviation ${abbreviation}`);
    }
    return stateAbbreviationToFullNameMap[abbreviation];
};

/**
 * Normalizes a search query.
 *
 * @param {string} query The search query to normalize.
 * @returns {string[]} The normalized search query (akin to a list of "tags").
 * @author Anthony Webster
 */
const normalizeSearchQuery = (query) => {
    // TODO: Replacing non-alphanumeric with spaces breaks state abbreviations
    // State abbreviations could be written as "N.Y." instead of "NY"
    const qs = query
        .toLowerCase()
        .replaceAll(/[^a-zA-Z0-9]+/g, " ")
        .replaceAll(/\s+/g, " ")
        .split(/\s+/)
        .filter((s) => s.length > 0)
        .flatMap((p) => {
            // The abbreviation converter will throw an exception if not given an abbreviation.
            // We'll have both the abbreviation and the full name for good measure.
            try {
                return [p, stateAbbreviationToFullName(p).split(" ")];
            } catch (e) {
                return [p];
            }
        });

    return removeDuplicates(qs);
};

const computeSearchMatchScore = async (normalizedQuery, placeData) => {
    // Display names have expanded state names
    let totalMatches = 0;

    for (let against of [placeData.location.address, placeData.name, placeData.description]) {
        against = normalizeSearchQuery(against);
        totalMatches += normalizedQuery.reduce((acc, e) => (against.some((p) => p.indexOf(e) >= 0) ? 1 : 0), 0);
    }

    return totalMatches;
};

/**
 * Performs a generic search over all places in the database.
 *
 * @param {string} query The search query.
 * @returns {Promise<(FlattenMaps<InferSchemaType<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, content: StringConstructor, likes: NumberConstructor}], reviews: [{createdAt: DateConstructor, comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, likes: NumberConstructor}], author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, categories: [{rating: NumberConstructor, category: StringConstructor}], content: StringConstructor, likes: NumberConstructor}], name: StringConstructor, description: StringConstructor, location: {address: StringConstructor, osmId: StringConstructor, latitude: NumberConstructor, osmType: StringConstructor, _id: ObjectId, longitude: NumberConstructor}, _id: ObjectId}, HydratedDocument<FlatRecord<{comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, content: StringConstructor, likes: NumberConstructor}], reviews: [{createdAt: DateConstructor, comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, likes: NumberConstructor}], author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, categories: [{rating: NumberConstructor, category: StringConstructor}], content: StringConstructor, likes: NumberConstructor}], name: StringConstructor, description: StringConstructor, location: {address: StringConstructor, osmId: StringConstructor, latitude: NumberConstructor, osmType: StringConstructor, _id: ObjectId, longitude: NumberConstructor}, _id: ObjectId}>, {}>>>> & Required<{_id: ObjectId}>)[]>}
 * A list of database place objects that match.
 *
 * @author Anthony Webster
 */
export const search = async (query) => {
    const normalizedQuery = normalizeSearchQuery(parseNonEmptyString(query, "search query"));
    const places = await Place.find({}, ["_id", "location"], null).exec();

    return Enumerable.from(places)
        .select((p) => [computeSearchMatchScore(normalizedQuery, p), p])
        .where((p) => p[0] > 0)
        .orderByDescending((p) => p[0])
        .select((p) => p[1])
        .toArray();
};

/**
 * Performs a generic search over all places in the database.
 *
 * @param {string} query The search query.
 * @returns {Promise<string[]>} A list of {@linkcode ObjectId}s of the places that match the search query.
 * @author Anthony Webster
 */
export const genericSearch = async (query) => {
    return (await search(query)).map((r) => r.location._id.toString());
};

/**
 * Searches within a radius of the given latitude and longitude.
 *
 * @param {String} query The search query.
 * @param {number} latitude The latitude of the center of the search radius.
 * @param {number} longitude The longitude of the center of the search radius.
 * @param {number} radius The search radius, in miles.
 * @returns {Promise<string[]>} A list of {@linkcode ObjectId}s of the search results.
 * @author Anthony Webster
 */
export const searchNear = async (query, latitude, longitude, radius) => {
    latitude = parseLatitude(latitude);
    longitude = normalizeLongitude(longitude);
    radius = parseSearchRadius(radius);

    const searchResults = await search(query);
    return searchResults
        .filter(
            (r) => distanceBetweenPointsMiles(latitude, longitude, r.location.latitude, r.location.longitude) <= radius
        )
        .map((r) => r._id.toString());
};
