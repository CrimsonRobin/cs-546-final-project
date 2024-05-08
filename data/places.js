import {
    isNullOrUndefined,
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
    return document.toObject();
};

/**
 *
 * @param placeId
 * @returns {Promise<module:mongoose.Schema<any, Model<RawDocType, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, ApplySchemaOptions<ObtainDocumentType<any, RawDocType, ResolveSchemaOptions<TSchemaOptions>>, ResolveSchemaOptions<TSchemaOptions>>, HydratedDocument<FlatRecord<DocType>, TVirtuals & TInstanceMethods>> extends Schema<infer EnforcedDocType, infer M, infer TInstanceMethods, infer TQueryHelpers, infer TVirtuals, infer TStaticMethods, infer TSchemaOptions, infer DocType> ? DocType : unknown extends any[] ? Require_id<FlattenMaps<module:mongoose.Schema<any, Model<RawDocType, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, ApplySchemaOptions<ObtainDocumentType<any, RawDocType, ResolveSchemaOptions<TSchemaOptions>>, ResolveSchemaOptions<TSchemaOptions>>, HydratedDocument<FlatRecord<DocType>, TVirtuals & TInstanceMethods>> extends Schema<infer EnforcedDocType, infer M, infer TInstanceMethods, infer TQueryHelpers, infer TVirtuals, infer TStaticMethods, infer TSchemaOptions, infer DocType> ? DocType : unknown>>[] : Require_id<FlattenMaps<module:mongoose.Schema<any, Model<RawDocType, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, ApplySchemaOptions<ObtainDocumentType<any, RawDocType, ResolveSchemaOptions<TSchemaOptions>>, ResolveSchemaOptions<TSchemaOptions>>, HydratedDocument<FlatRecord<DocType>, TVirtuals & TInstanceMethods>> extends Schema<infer EnforcedDocType, infer M, infer TInstanceMethods, infer TQueryHelpers, infer TVirtuals, infer TStaticMethods, infer TSchemaOptions, infer DocType> ? DocType : unknown>>>}
 */
export const getPlace = async (placeId) => {
    placeId = parseObjectId(placeId, "Place id");
    const place = (await Place.findOne({ _id: ObjectId.createFromHexString(placeId) }, null, null).exec()).toObject();
    if (!place) {
        throw new Error(`Failed to find place with id ${placeId}`);
    }
    //place.avgRatings = await getAverageCategoryRatings(placeId);

    const avgRatings = await getAverageCategoryRatings(placeId);
    const letterRatings = mapAvgRatingsToLetters(avgRatings);

    place.averageRatings = {
        overallRating: letterRatings.overall,
        physicalRating: letterRatings.byCategory[DISABILITY_CATEGORY_PHYSICAL],
        sensoryRating: letterRatings.byCategory[DISABILITY_CATEGORY_SENSORY],
        neurodivergentRating: letterRatings.byCategory[DISABILITY_CATEGORY_NEURODIVERGENT],
    };

    return place;
};

export const getAllPlaces = async () => {
    return (await Place.find({}, null, null).exec()).map((place) => place.toObject());
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
    return review.toObject();
};
//get specific review
export const getReview = async (reviewId) => {
    reviewId = parseObjectId(reviewId, "Review Id");

    const objectId = ObjectId.createFromHexString(reviewId);
    const results = await Place.aggregate([
        { $match: { "reviews._id": objectId } },
        { $unwind: "$reviews" },
        { $match: { "reviews._id": objectId } },
        { $project: { _id: false, reviews: true } },
    ]).exec();

    if (results.length !== 1) {
        throw new Error(`Review with id ${reviewId} does not exist`);
    }
    return results[0].reviews;
};
//get all from specific place

/**
 *
 * @param placeId
 * @returns {Promise<*>}
 */
export const getAllReviewsFromPlace = async (placeId) => {
    placeId = parseObjectId(placeId);
    return (await Place.findOne({ _id: ObjectId.createFromHexString(placeId) }, null, null)
        .select("reviews")
        .exec()).reviews.map((review) => review.toObject());
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
    return placeReviewed.toObject();
};

/**
 * Tests if the given user has a review for the given place.
 * @param {string} placeId
 * @param {string} userId
 * @returns {Promise<boolean>} True if the user has already reviewed this place, false otherwise.
 * @author Anthony Webster
 */
export const userHasReviewForPlace = async (placeId, userId) => {
    placeId = parseObjectId(placeId);
    userId = parseObjectId(userId);
    const placeReviews = await getAllReviewsFromPlace(placeId);
    return placeReviews.some((r) => parseObjectId(r.author) === userId);
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
    //const place = await getPlace(placeId);
    const place = await Place.findOne({ _id: ObjectId.createFromHexString(placeId) }, null, null).exec();
    if (!place) {
        throw new Error(`Failed to find place with id ${placeId}`);
    }

    let overallTotal = 0;
    let overallCount = 0;
    const ratings = {};
    ratings[DISABILITY_CATEGORY_NEURODIVERGENT] = { count: 0, total: 0 };
    ratings[DISABILITY_CATEGORY_PHYSICAL] = { count: 0, total: 0 };
    ratings[DISABILITY_CATEGORY_SENSORY] = { count: 0, total: 0 };

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
    for (const [category, { count, total }] of Object.entries(ratings)) {
        averaged[category] = count === 0 ? null : total / count;
    }

    return {
        overall: overallCount === 0 ? null : overallTotal / overallCount,
        byCategory: averaged,
    };
};
//for place average ratings
export const mapAvgRatingsToLetters = (avgRatings) => {
    const letterRatings = {
        overall: ratingToLetter(avgRatings.overall),
        byCategory: Object.fromEntries(Object.entries(avgRatings.byCategory).map(([key, value]) => [key, ratingToLetter(value)])),
    };
    return letterRatings;
};

export const ratingToLetter = (rating) => {
    if (isNullOrUndefined(rating) || rating < 1) {
        return "N/A";
    } else if (rating >= 1 && rating < 1.5) {
        return "F";
    } else if (rating >= 1.5 && rating < 2.5) {
        return "D";
    } else if (rating >= 2.5 && rating < 3.5) {
        return "C";
    } else if (rating >= 3.5 && rating < 4.5) {
        return "B";
    } else {
        return "A";
    }
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
                    replies: [],
                },
            },
        }
    ).exec();

    if (!comment) {
        throw new Error(`Could not insert comment in place with id ${placeId}`);
    }

    return comment.toObject();
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
                    replies: [],
                },
            },
        }
    ).exec();

    if (!comment) {
        throw new Error(`Could not insert comment in place with id ${reviewId}`);
    }

    return comment.toObject();
};

//get all comments from place/review
export const getAllCommentsFromPlace = async (placeId) => {
    return (await getPlace(parseObjectId(placeId))).comments.map((comment) => comment.toObject());
};

export const getAllCommentsFromReview = async (reviewId) => {
    return (await getReview(parseObjectId(reviewId))).comments.map((comment) => comment.toObject());
};

//get specific comment
export const getCommentFromPlace = async (placeId, commentId) => {
    placeId = parseObjectId(placeId);
    commentId = parseObjectId(commentId);

    const comments = await getAllCommentsFromPlace(placeId);

    for (const comment of comments) {
        if (comment._id.toString() === commentId) {
            return comment.toObject();
        }
    }
    throw new Error("No such comment found");
};

//get specific comment
export const getCommentFromReview = async (reviewId, commentId) => {
    reviewId = parseObjectId(reviewId);
    commentId = parseObjectId(commentId);

    const comments = await getAllCommentsFromReview(reviewId);

    for (const comment of comments) {
        if (comment._id.toString() === commentId) {
            return comment.toObject();
        }
    }
    throw new Error("No such comment found");
};

/**
 * Mark that a user has liked the specified review.
 * @param {string} reviewId The ID of the review.
 * @param {string} userId The ID of the user that has liked the review.
 * @returns {Promise<void>}
 */
const addReviewLike = async (reviewId, userId) => {
    userId = parseObjectId(userId);
    await Place.updateOne(
        { "reviews._id": ObjectId.createFromHexString(parseObjectId(reviewId)) },
        { $push: { reviews: { likes: userId } } }
    ).exec();
};

/**
 * Remove a user from the list of users that have liked a review.
 *
 * If the user has not liked the review, nothing special happens.
 *
 * @param {string} reviewId The ID of the review.
 * @param {string} userId The ID of the user to remove.
 * @returns {Promise<void>}
 */
const removeReviewLike = async (reviewId, userId) => {
    userId = parseObjectId(userId);
    await Place.updateOne(
        { "reviews._id": ObjectId.createFromHexString(parseObjectId(reviewId)) },
        { $pull: { reviews: { likes: userId } } }
    ).exec();
};

export const toggleReviewLike = async (reviewId, userId) => {
    reviewId = parseObjectId(reviewId);
    userId = parseObjectId(userId);
    const review = await getReview(reviewId);
    if (review.likes.some((id) => id === userId)) {
        await removeReviewLike(reviewId, userId);
    } else if (review.dislikes.some((id) => id === userId)) {
        await removeReviewDislike(reviewId, userId);
        await addReviewLike(reviewId, userId);
    } else {
        await addReviewLike(reviewId, userId);
    }
    return await getReview(reviewId);
};

export const toggleReviewDislike = async (reviewId, userId) => {
    reviewId = parseObjectId(reviewId);
    userId = parseObjectId(userId);
    const review = await getReview(reviewId);
    if (review.dislikes.some((id) => id === userId)) {
        await removeReviewDislike(reviewId, userId);
    } else if (review.likes.some((id) => id === userId)) {
        await removeReviewLike(reviewId, userId);
        await addReviewDislike(reviewId, userId);
    } else {
        await addReviewDislike(reviewId, userId);
    }
    return await getReview(reviewId);
};

const addReviewDislike = async (reviewId, userId) => {
    reviewId = parseObjectId(reviewId);
    userId = parseObjectId(userId);

    await Place.updateOne(
        { "reviews._id": ObjectId.createFromHexString(parseObjectId(reviewId)) },
        { $push: { reviews: { dislikes: userId } } }
    ).exec();
};

const removeReviewDislike = async (reviewId, userId) => {
    reviewId = parseObjectId(reviewId);
    userId = parseObjectId(userId);

    await Place.updateOne(
        { "reviews._id": ObjectId.createFromHexString(parseObjectId(reviewId)) },
        { $pull: { reviews: { dislikes: userId } } }
    ).exec();
};

/**
 * Mark that a user has liked the specified comment.
 * @param {string} commentId The ID of the comment.
 * @param {string} userId The ID of the user that has liked the review.
 * @returns {Promise<void>}
 */

export const togglePlaceCommentLike = async (placeId, commentId, userId) => {
    placeId = parseObjectId(placeId);
    commentId = parseObjectId(commentId);
    userId = parseObjectId(userId);
    const comment = await getCommentFromPlace(placeId, commentId);
    if (comment.likes.some((c) => c === userId)) {
        await removePlaceCommentLike(commentId, userId);
    } else if (comment.dislikes.some((c) => c === userId)) {
        await removePlaceCommentDislike(commentId, userId);
        await addPlaceCommentLike(commentId, userId);
    } else {
        await addPlaceCommentLike(commentId, userId);
    }
    return await getCommentFromPlace(placeId, commentId);
};

export const togglePlaceCommentDislike = async (placeId, commentId, userId) => {
    placeId = parseObjectId(placeId);
    commentId = parseObjectId(commentId);
    userId = parseObjectId(userId);
    const comment = await getCommentFromPlace(placeId, commentId);
    if (comment.dislikes.some((c) => c === userId)) {
        await removePlaceCommentDislike(commentId, userId);
    } else if (comment.likes.some((c) => c === userId)) {
        await removePlaceCommentLike(commentId, userId);
        await addPlaceCommentDislike(commentId, userId);
    } else {
        await addPlaceCommentDislike(commentId, userId);
    }
    return await getCommentFromPlace(placeId, commentId);
};

const addPlaceCommentLike = async (commentId, userId) => {
    userId = parseObjectId(userId);
    await Place.updateOne(
        { "comments._id": ObjectId.createFromHexString(parseObjectId(commentId)) },
        { $push: { comments: { likes: userId } } }
    ).exec();
};

const removePlaceCommentLike = async (commentId, userId) => {
    userId = parseObjectId(userId);
    await Place.updateOne(
        { "comments._id": ObjectId.createFromHexString(parseObjectId(commentId)) },
        { $pull: { comments: { likes: userId } } }
    ).exec();
};

const addPlaceCommentDislike = async (commentId, userId) => {
    userId = parseObjectId(userId);
    await Place.updateOne(
        { "comments._id": ObjectId.createFromHexString(parseObjectId(commentId)) },
        { $push: { comments: { dislikes: userId } } }
    ).exec();
};

const removePlaceCommentDislike = async (commentId, userId) => {
    userId = parseObjectId(userId);
    await Place.updateOne(
        { "comments._id": ObjectId.createFromHexString(parseObjectId(commentId)) },
        { $pull: { comments: { dislikes: userId } } }
    ).exec();
};

export const toggleReviewCommentLike = async (reviewId, commentId, userId) => {
    reviewId = parseObjectId(reviewId);
    commentId = parseObjectId(commentId);
    userId = parseObjectId(userId);
    const comment = await getCommentFromReview(reviewId, commentId);
    if (comment.likes.some((id) => id === userId)) {
        await removeReviewCommentLike(reviewId, userId);
    } else if (comment.dislikes.some((id) => id === userId)) {
        await removeReviewCommentDislike(reviewId, userId);
        await addReviewCommentLike(reviewId, userId);
    } else {
        await addReviewCommentLike(reviewId, userId);
    }
    return await getCommentFromReview(reviewId, commentId);
};

export const toggleReviewCommentDislike = async (reviewId, commentId, userId) => {
    reviewId = parseObjectId(reviewId);
    commentId = parseObjectId(commentId);
    userId = parseObjectId(userId);
    const comment = await getCommentFromReview(reviewId, commentId);
    if (comment.dislikes.some((id) => id === userId)) {
        await removeReviewCommentDislike(reviewId, userId);
    } else if (comment.likes.some((id) => id === userId)) {
        await removeReviewCommentLike(reviewId, userId);
        await addReviewCommentDislike(reviewId, userId);
    } else {
        await addReviewCommentDislike(reviewId, userId);
    }
    return await getCommentFromReview(reviewId, commentId);
};

export const addReviewCommentLike = async (commentId, userId) => {
    userId = parseObjectId(userId);
    await Place.updateOne(
        { "reviews.comments._id": ObjectId.createFromHexString(parseObjectId(commentId)) },
        { $push: { reviews: { comments: { likes: userId } } } }
    ).exec();
};

export const removeReviewCommentLike = async (commentId, userId) => {
    userId = parseObjectId(userId);
    await Place.updateOne(
        { "comments._id": ObjectId.createFromHexString(parseObjectId(commentId)) },
        { $pull: { reviews: { comments: { likes: userId } } } }
    ).exec();
};

export const addReviewCommentDislike = async (commentId, userId) => {
    userId = parseObjectId(userId);
    await Place.updateOne(
        { "comments._id": ObjectId.createFromHexString(parseObjectId(commentId)) },
        { $push: { reviews: { comments: { dislikes: userId } } } }
    ).exec();
};

export const removeReviewCommentDislike = async (commentId, userId) => {
    userId = parseObjectId(userId);
    await Place.updateOne(
        { "comments._id": ObjectId.createFromHexString(parseObjectId(commentId)) },
        { $pull: { reviews: { comments: { dislikes: userId } } } }
    ).exec();
};

export const addPlaceCommentReply = async (commentId, authorId, content) => {
    commentId = parseObjectId(commentId, "comment id");
    authorId = parseObjectId(authorId, "author id");
    content = parseNonEmptyString(content, "reply content");
    await Place.updateOne(
        { "comments._id": ObjectId.createFromHexString(commentId) },
        {
            $push: {
                comments: {
                    replies: {
                        _id: new ObjectId(),
                        author: authorId,
                        content: content,
                    },
                },
            },
        }
    ).exec();
};

export const addReviewCommentReply = async (commentId, authorId, content) => {
    commentId = parseObjectId(commentId, "comment id");
    authorId = parseObjectId(authorId, "author id");
    content = parseNonEmptyString(content, "reply content");
    await Place.updateOne(
        { "reviews.comments._id": ObjectId.createFromHexString(commentId) },
        {
            $push: {
                reviews: {
                    comments: {
                        replies: {
                            _id: new ObjectId(),
                            author: authorId,
                            content: content,
                        },
                    },
                },
            },
        }
    ).exec();
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
    query = parseNonEmptyString(query, "search query");
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
        if (isNullOrUndefined(against)) {
            continue;
        }
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
    const places = (await Place.find({}, null, null).exec()).map(r => r.toObject());

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
    query = parseNonEmptyString(query, "Search query");
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

export const findAllNear = async (latitude, longitude, radius) => {
    latitude = parseLatitude(latitude);
    longitude = normalizeLongitude(longitude);
    radius = parseSearchRadius(radius);

    const places = await Place.find({}, null, null).exec();
    const placesNear = Enumerable.from(places)
        .select(p => p.toObject())
        .select((p) => [distanceBetweenPointsMiles(latitude, longitude, p.location.latitude, p.location.longitude), p])
        .where((p) => p[0] <= radius)
        .orderByDescending((p) => p[0])
        .select((p) => p[1]._id.toString())
        .toArray();

    const get = [];
    for (const placeId of placesNear) {
        get.push(await getPlace(placeId));
    }

    return get;
};

export const getLikedItems = async (userId) => {
    userId = parseObjectId(userId, "user id");
    const allReviews = (await Place.aggregate([
        {$unwind: "$reviews"},
        {$project: {_id: false, reviews: true}}
    ]).exec()).map(r => r.toObject());

    const likedReviews = allReviews
        .filter(r => r.likes.includes(userId))
        .map(r => r._id.toString());

    const likedReviewComments = allReviews
        .map(r => r.comments)
        .filter(r => r.likes.includes(userId))
        .map(r => r._id.toString());

    const allPlaceComments = (await Place.aggregate([
        {$unwind: "$comments"},
        {$project: {_id: false, comments: true}}
    ]).exec()).map(r => r.toObject());
    const likedPlaceComments = allPlaceComments
        .filter(c => c.likes.includes(userId))
        .map(c => c._id.toString());

    return {
        likedReviewComments: likedReviewComments,
        likedPlaceComments: likedPlaceComments,
        likedReviews: likedReviews
    };
};

export const getDislikedItems = async (userId) => {
    userId = parseObjectId(userId, "user id");
    const allReviews = (await Place.aggregate([
        {$unwind: "$reviews"},
        {$project: {_id: false, reviews: true}}
    ]).exec()).map(r => r.toObject());

    const dislikedReviews = allReviews
        .filter(r => r.dislikes.includes(userId))
        .map(r => r._id.toString());

    const dislikedReviewComments = allReviews
        .map(r => r.comments)
        .filter(r => r.dislikes.includes(userId))
        .map(r => r._id.toString());

    const allPlaceComments = (await Place.aggregate([
        {$unwind: "$comments"},
        {$project: {_id: false, comments: true}}
    ]).exec()).map(r => r.toObject());
    const dislikedPlaceComments = allPlaceComments
        .filter(c => c.dislikes.includes(userId))
        .map(c => c._id.toString());

    return {
        dislikedReviewComments: dislikedReviewComments,
        dislikedPlaceComments: dislikedPlaceComments,
        dislikedReviews: dislikedReviews
    };
};
