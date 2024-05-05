import {
    assertTypeIs,
    isInfinity,
    isNullOrUndefined,
    parseCategories,
    parseDate,
    parseNonEmptyString,
    parseObjectId,
    roundTo,
    throwIfNullOrUndefined,
} from "../helpers.js";
import { connectToDatabase, closeDatabaseConnection } from "../config/mongoConnection.js";
import { Place } from "../config/database.js";
import { parseOsmId, parseOsmType } from "./geolocation.js";
import { DateTime } from "luxon";
import { ObjectId } from "mongodb";
import { configDotenv } from "dotenv";
import { getMongoConfig } from "../config/settings.js";

//place functions
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
};

export const getPlace = async (placeId) => {
    placeId = parseObjectId(placeId, "Product id");
    const collection = await Place();
    const result = await collection.findOne({ _id: ObjectId.createFromHexString(placeId) });
    if (!result) {
        throw new Error(`Failed to find product with id ${placeId}`);
    }
    result._id = result._id.toString();
    return result;
};

//delete places?

//review functions:

//create
export const addReview = async (author, content, categories) => {
    author = parseNonEmptyString(author, "Name of author");
    content = parseNonEmptyString(content, "Content of review");
    categories = parseCategories(categories);
};
//get specific review

//get all from specific place

//update review

//delete review

//comment functions

//create comment

//get all comments from place/review

//get specific comment

//update comment

//delete comment
