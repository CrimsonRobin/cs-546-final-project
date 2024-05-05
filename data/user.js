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

// Create User
export const parseUserFields = (username, createdAt, hashedPassword, qualifications) => {
  // If name and description are not strings or are empty strings, the method should throw.
  return {
    username: parseNonEmptyString(username, "Place name"),
    hashedPassword: parseNonEmptyString(hashedPassword, "Password"),
    qualifications: (qualifications),
  };
};

export const createUser = async (username, createdAt, hashedPassword, qualifications) => {
  const parsed = parseUserFields(username, createdAt, hashedPassword, qualifications);
  const document = new User({
    _id: ObjectId,
    username: String,
    hashedPassword: String,
    createdAt: Date,
    qualifications: [String],
  });

  await document.save();
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
export const getUsers = () => {};
// Get Average Rating
export const getAvgRating = () => {};
// Get amount of reviews
export const getReview = () => {};
// Get expertise
export const getExpertise = () => {};
