import {
    parseNonEmptyString,
    parseObjectId,
    parsePassword,
    parseQualifications,
    removeDuplicates,
} from "../helpers.js";
import { Place, User } from "../config/database.js";
import { ObjectId } from "mongodb";
import { DateTime } from "luxon";
import bcrypt from 'bcryptjs';

/**
 * The number of salt rounds to use when hashing user passwords.
 * @type {number}
 */
export const BCRYPT_SALT_ROUNDS = 12;

// Create User
export const parseUserFields = (firstname, lastname, username, password, qualifications) => {
    // If name and description are not strings or are empty strings, the method should throw.
    return {
        firstname: parseNonEmptyString(firstname, "Firstname"),
        lastname: parseNonEmptyString(lastname, "Lastname"),
        username: parseNonEmptyString(username, "Username"),
        hashedPassword: parseNonEmptyString(password, "Password"),
        qualifications: parseQualifications(qualifications),
    };
};

export const createUser = async (firstname, lastname, username, password, qualifications) => {
    const parsed = parseUserFields(firstname, lastname, username, hashedPassword, qualifications);
    const document = new User({
        _id: ObjectId,
        firstname: firstname,
        lastname: lastname,
        username: username,
        hashedPassword: await bcrypt.hash(password, BCRYPT_SALT_ROUNDS),
        createdAt: DateTime.now().toBSON(),
        qualifications: removeDuplicates(qualifications),
    });

    await document.save();
    return true;
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
export const updateUser = async (userId) => {};
// Get Average Rating
export const getAvgRating = (userId) => {
    let allReviews = getUserReviews(userId).reviews;
    let sum = allReviews.reduce((total, currVal) => total + Number(currVal.rating), 0);
    let avg = sum / allReviews.length;
    return avg;
};
// Get amount of reviews
export const getNumReview = (userId) => {
    let allReviews = getUserReviews(userId).reviews;
    return allReviews.length;
};
// Get expertise
export const getExpertise = (userId) => {
    return getUser(userId).qualifications;
};

export const loginUser = async (username, password) => {

    username = parseStringWithLengthBounds(username, 3, 25);
    password = parsePassword(password);
  
    const userCollection = await User();
    const existingUser = await userCollection.findOne({ username: username });
  
    if (!existingUser) {
      throw "Either the username or password is invalid";
    }
  
    const isPasswordValid = await bcrypt.compare(password, existingUser.password);
  
    if (!isPasswordValid) {
      throw "Either the username or password is invalid";
    }
  
    return {
        _id: existingUser._id.toString(),
        firstname: existingUser.firstname,
        lastname: existingUser.lastname,
        username: existingUser.username,
        createdAt: existingUser.createdAt,
        qualifications: existingUser.qualifications,
    };
};

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
