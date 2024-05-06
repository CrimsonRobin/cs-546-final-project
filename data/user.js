import {
    parseNonEmptyString,
    parseObjectId,
    parsePassword,
    parseQualifications,
    parseUsername,
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
export const createUser = async (firstname, lastname, username, password, qualifications) =>
{
    const document = new User({
        _id: new ObjectId(),
        firstname: parseNonEmptyString(firstname, "First name"),
        lastname: parseNonEmptyString(lastname, "Last name"),
        username: parseUsername(username),
        hashedPassword: await bcrypt.hash(parsePassword(password), BCRYPT_SALT_ROUNDS),
        createdAt: DateTime.now().toBSON(),
        qualifications: parseQualifications(qualifications),
    });

    await document.save();
    return true;
};

// Get User
export const getUser = async (userId) =>
{
    userId = parseObjectId(userId, "User id");
    const result = await User.findOne({ _id: ObjectId.createFromHexString(userId) }, null, null).exec();
    if (!result)
    {
        throw new Error(`Failed to find user with id ${userId}`);
    }
    result._id = result._id.toString();
    return result;
};

// Get All Users
/**
 * Gets all users from the database.
 * @returns {Promise<Require_id<FlattenMaps<InferSchemaType<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {createdAt: DateConstructor, qualifications: StringConstructor[], firstname: StringConstructor, hashedPassword: StringConstructor, _id: ObjectId, lastname: StringConstructor, username: StringConstructor}, HydratedDocument<FlatRecord<{createdAt: DateConstructor, qualifications: StringConstructor[], firstname: StringConstructor, hashedPassword: StringConstructor, _id: ObjectId, lastname: StringConstructor, username: StringConstructor}>, {}>>>>>[]>}
 * @author Chris Kang, Anthony Webster
 */
export const getUsers = async () =>
{
    return (await User.find({}, null, null).exec());
};

// Get expertise
export const getQualifications = async (userId) =>
{
    return (await getUser(userId)).qualifications;
};

/**
 * Logs in a user.
 *
 * @param {string} username The username.
 * @param {string} password The password to log in with.
 * @returns {Promise<{createdAt: FlattenProperty<InferSchemaType<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {createdAt: DateConstructor, qualifications: StringConstructor[], firstname: StringConstructor, hashedPassword: StringConstructor, _id: ObjectId, lastname: StringConstructor, username: StringConstructor}, HydratedDocument<FlatRecord<{createdAt: DateConstructor, qualifications: StringConstructor[], firstname: StringConstructor, hashedPassword: StringConstructor, _id: ObjectId, lastname: StringConstructor, username: StringConstructor}>, {}>>>["createdAt"]>, qualifications: FlattenProperty<InferSchemaType<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {createdAt: DateConstructor, qualifications: StringConstructor[], firstname: StringConstructor, hashedPassword: StringConstructor, _id: ObjectId, lastname: StringConstructor, username: StringConstructor}, HydratedDocument<FlatRecord<{createdAt: DateConstructor, qualifications: StringConstructor[], firstname: StringConstructor, hashedPassword: StringConstructor, _id: ObjectId, lastname: StringConstructor, username: StringConstructor}>, {}>>>["qualifications"]>, firstname: FlattenProperty<InferSchemaType<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {createdAt: DateConstructor, qualifications: StringConstructor[], firstname: StringConstructor, hashedPassword: StringConstructor, _id: ObjectId, lastname: StringConstructor, username: StringConstructor}, HydratedDocument<FlatRecord<{createdAt: DateConstructor, qualifications: StringConstructor[], firstname: StringConstructor, hashedPassword: StringConstructor, _id: ObjectId, lastname: StringConstructor, username: StringConstructor}>, {}>>>["firstname"]>, lastname: FlattenProperty<InferSchemaType<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {createdAt: DateConstructor, qualifications: StringConstructor[], firstname: StringConstructor, hashedPassword: StringConstructor, _id: ObjectId, lastname: StringConstructor, username: StringConstructor}, HydratedDocument<FlatRecord<{createdAt: DateConstructor, qualifications: StringConstructor[], firstname: StringConstructor, hashedPassword: StringConstructor, _id: ObjectId, lastname: StringConstructor, username: StringConstructor}>, {}>>>["lastname"]>, username: FlattenProperty<InferSchemaType<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {createdAt: DateConstructor, qualifications: StringConstructor[], firstname: StringConstructor, hashedPassword: StringConstructor, _id: ObjectId, lastname: StringConstructor, username: StringConstructor}, HydratedDocument<FlatRecord<{createdAt: DateConstructor, qualifications: StringConstructor[], firstname: StringConstructor, hashedPassword: StringConstructor, _id: ObjectId, lastname: StringConstructor, username: StringConstructor}>, {}>>>["username"]>}>}
 * @author Chris Kang, Anthony Webster
 */
export const loginUser = async (username, password) =>
{
    username = parseUsername(username);
    password = parsePassword(password);

    const existingUser = await User.findOne({ username: username }, null, null).exec();

    if (!existingUser)
    {
        throw new Error("Either the username or password is invalid");
    }

    if (!await bcrypt.compare(password, existingUser.hashedPassword))
    {
        throw new Error("Either the username or password is invalid");
    }

    return {
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
 * @returns {Promise<{_id: string, reviews: any[]}[]>} The reviews that the user has posted across all places.
 * @author Anthony Webster
 */
export const getUserReviews = async (userId) =>
{
    const parsedId = parseObjectId(userId, "user id");
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

/**
 * Computes the average ratings by category for a user across all reviews that the given user has posted.
 * @param {string} userId The ID of the user to compute averages for.
 * @returns {Promise<{overall: (number|null), byCategory: {DISABILITY_CATEGORY_NEURODIVERGENT: (number|null),
 * DISABILITY_CATEGORY_PHYSICAL: (number|null), DISABILITY_CATEGORY_SENSORY: (number|null)}}>} An object
 * containing the overall average rating and average ratings by category. If a place does not have ratings
 * for a given category, then that category's average rating is `null`.
 * @author Anthony Webster
 */
export const getUserAverageRatings = async (userId) =>
{
    const userReviews = (await getUserReviews(userId)).flatMap(u => u.reviews).flatMap(r => r.categories);
    let overallTotal = 0;
    let overallCount = 0;
    const aggregates = {
        DISABILITY_CATEGORY_SENSORY: { count: 0, total: 0 },
        DISABILITY_CATEGORY_PHYSICAL: { count: 0, total: 0 },
        DISABILITY_CATEGORY_NEURODIVERGENT: { count: 0, total: 0 }
    };

    for (const { categoryName, rating } of userReviews)
    {
        if (aggregates[categoryName] === undefined)
        {
            aggregates[categoryName] = { count: 0, total: 0 };
        }
        aggregates[categoryName].count++;
        aggregates[categoryName].total += rating;
        overallTotal += rating;
        overallCount++;
    }

    const averages = {};
    for (const [categoryName, { count, total }] of Object.entries(aggregates))
    {
        averages[categoryName] = count === 0 ? null : total / count;
    }
    return {
        overall: overallCount === 0 ? null : overallTotal / overallCount,
        byCategory: averages
    };
};
