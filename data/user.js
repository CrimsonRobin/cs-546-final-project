import {
    assertTypeIs,
    isInfinity,
    isNullOrUndefined,
    parseCategories,
    parseDate,
    parseNonEmptyString,
    parseObjectId,
    parseQualifications,
    roundTo,
    throwIfNullOrUndefined,
    nonEmptyStringOrDefault,
} from "../helpers.js";
import {
    connectToDatabase,
    closeDatabaseConnection,
} from "../config/mongoConnection.js";
import { User } from "../config/database.js";
import { parseOsmId, parseOsmType } from "./geolocation.js";
import { ObjectId } from "mongodb";
import Enumerable from "linq";
import { DateTime } from "luxon";

// Create User
export const parseUserFields = (username, hashedPassword, qualifications) => {
    // If name and description are not strings or are empty strings, the method should throw.
    return {
        username: parseNonEmptyString(username, "Username"),
        hashedPassword: parseNonEmptyString(hashedPassword, "Password"),
        qualifications: parseQualifications(qualifications),
    };
};

export const createUser = async (username, hashedPassword, qualifications) => {
    const parsed = parseUserFields(username, hashedPassword, qualifications);
    const document = new User({
        _id: ObjectId,
        username: username,
        hashedPassword: hashedPassword,
        createdAt: DateTime.now().toBSON(),
        qualifications: qualifications,
    });

    await document.save();
    return document;
};

// Get User
export const getUser = async (userId) => {
    userId = parseObjectId(userId, "User id");
    const collection = await User();
    const result = await collection.findOne({
        _id: ObjectId.createFromHexString(userId),
    });
    if (!result) {
        throw new Error(`Failed to find user with id ${userId}`);
    }
    result._id = result._id.toString();
    return result;
};
// Get All Users
export const getUsers = async () => {
    const userCollection = await User();
    let userList = await userCollection.find({}).toArray();
    return userList;
};
// Update User
export const updateUser = async () => {};
// Get Average Rating
export const getAvgRating = () => {};
// Get amount of reviews
export const getReview = () => {};
// Get expertise
export const getExpertise = () => {};
