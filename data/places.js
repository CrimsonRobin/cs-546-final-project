import {
    parseCategories,
    parseNonEmptyString,
    parseObjectId,
    normalizeLongitude,
    parseLatitude,
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

export const getPlace = async (placeId) => {
    placeId = parseObjectId(placeId, "Place id");
    const result = await Place.findOne({ _id: ObjectId.createFromHexString(placeId) }).exec();
    if (!result) {
        throw new Error(`Failed to find place with id ${placeId}`);
    }
    return result;
};

//delete places?

//review functions:

//create
export const addReview = async (placeId, author, content, categories) => {
    placeId = parseObjectId(placeId, "Place id");
    author = parseNonEmptyString(author, "Name of author");
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
    //TODO: recompute average rating of place

    return review;
};
//get specific review
export const getReview = async (reviewId) => {
    reviewId = parseObjectId(reviewId, "Review id");
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
export const getAllReviewsFromPlace = async (placeId) => {
    placeId = parseObjectId(placeId);
    const placeReviewed = await getPlace(placeId);
    return placeReviewed.reviews;
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
    const updatedReview = await Place.updateOne(
        { "reviews._id": new ObjectId(reviewId) },
        { $set: { "reviews.content": content, "reviews.categories": categories } }
    ).exec();
    throwIfNullOrUndefined(updateReview);
    //TODO: recompute average
    return updatedReview;
};
//delete review
export const deleteReview = async (reviewId) => {
    reviewId = parseObjectId(reviewId, "Review Id");
    const placeReviewed = await Place.findOne({ "reviews._id": new ObjectId(reviewId) });
    const updateResult = await collection.updateOne(
        { "reviews._id": reviewIdObject },
        { $pull: { reviews: { _id: reviewIdObject } } }
    );
    if (!updateResult) {
        throw new Error(`Failed to delete review with id ${reviewId}`);
    }
    //TODO recompute average
    return placeReviewed;
};

//comment functions:

//create place comment
export const addPlaceComment = async (placeId, author, content) => {
    author = parseNonEmptyString(author, "Name of author");
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
    author = parseNonEmptyString(author, "Name of author");
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
export const getComment = async () => {};

//update comment

//delete comment

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
