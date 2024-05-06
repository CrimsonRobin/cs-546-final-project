import {
    parseNonEmptyString,
    parseObjectId,
    parseQualifications
} from "../helpers.js";
import { Place, User } from "../config/database.js";
import { ObjectId } from "mongodb";
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
        throw new Error(`Failed to find product with id ${userId}`);
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

/**
 * Gets all reviews for the given user.
 *
 * @param {string} userId The ID of the user.
 * @returns {Promise<{_id: string, reviews: any[]}>} The reviews that the user has posted across all places.
 * @author Anthony Webster
 */
export const getUserReviews = async (userId) =>
{
    const parsedId = ObjectId.createFromHexString(parseObjectId(userId, "user id"));
    const reviews = await Place
        .aggregate([
            { $match: { "reviews.author": parsedId } },
            { $project: { "_id": true, "reviews": true } },
            { $unwind: "$reviews" }
        ])
        .exec();

    for (const review of reviews)
    {
        review._id = review._id.toString();
    }

    return reviews;
};
