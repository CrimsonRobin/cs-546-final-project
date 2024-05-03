// This data file should export all functions using the ES6 standard as shown in the lecture code

import { posts as getPosts } from "../config/mongoCollections.js";
import { ObjectId } from "mongodb";
import {
    assertIsNotInfinity,
    assertIsNotNaN,
    assertTypeIs,
    parseNonEmptyString,
    parseObjectId,
    roundTo,
} from "../helpers.js";
import { get as getProduct } from "./places.js";
import { DateTime } from "luxon";

export const parseReviewTitle = (title) => parseNonEmptyString(title, "Title");

export const parseReviewerName = (name) => parseNonEmptyString(name, "Reviewer name");

export const parseReviewBody = (review) => parseNonEmptyString(review, "Review");

export const parseReviewRating = (rating) => {
    // If rating is not a number in the range of 1 to 5, the method should throw (floats will be accepted as long
    // as they are in the valid range of 1-5.  1.5 or 4.8 for example, would be valid. .5, 5.5 or 3.65 would not be
    // valid We will only use one decimal place).
    // If rating has more than one decimal place, the method should throw.
    assertTypeIs(rating, "number", "Rating");
    assertIsNotNaN(rating, "Rating");
    assertIsNotInfinity(rating, "Rating");

    if (rating < 1 || rating > 5) {
        throw new Error("Rating must fall in interval [0, 5]");
    }

    if (rating - roundTo(rating, 1) !== 0) {
        throw new Error("Rating must have at most 1 decimal place");
    }

    return rating;
};

const getProductWithReview = async (reviewId) => {
    const collection = await getPosts();
    reviewId = ObjectId.createFromHexString(reviewId);
    return await collection.findOne({ reviews: { _id: reviewId } });
};

const recomputeAverageRating = async (productId) => {
    // const allPosts = await posts();
    //
    // // This aggregate query makes me so sad. Mongo really is something quite special (derogatory).
    // const product = await getProduct(productId);
    //
    // let average = 0;
    // if (product.reviews.length > 0) {
    //     average = product.reviews.reduce((acc, e) => acc + e.rating, 0) / product.reviews.length;
    // }
    //
    // await allPosts.updateOne({_id: ObjectId.createFromHexString(productId)},
    //     {$set: {averageRating: average}});
    productId = ObjectId.createFromHexString(productId);

    const allPosts = await getPosts();

    // This aggregate query makes me so sad. Mongo really is something quite special (derogatory).
    // This is rather needlessly complicated for expressing a simple query.
    const aggregation = await allPosts
        .aggregate([
            { $match: { _id: productId } },
            { $limit: 1 },
            { $project: { _id: false, reviews: true } },
            { $unwind: "$reviews" },
            //             vvvv   ?!  Really?? That's really how you group by nothing and aggregate over all data? Come on.
            { $group: { _id: null, len: { $sum: 1 }, sum: { $sum: "$reviews.rating" } } },
            {
                $project: {
                    _id: null,
                    average: {
                        $cond: {
                            if: { $eq: ["$len", 0] },
                            then: 0,
                            else: { $divide: ["$sum", "$len"] },
                        },
                    },
                },
            },
        ])
        .toArray();

    const average = aggregation.length === 0 ? 0 : aggregation[0].average;
    await allPosts.updateOne({ _id: productId }, { $set: { averageRating: average } });
};

export const createReview = async (productId, title, reviewerName, review, rating) => {
    // If the productId  provided is not a valid ObjectId, the method should throw
    productId = parseObjectId(productId, "Product id");
    title = parseReviewTitle(title);
    reviewerName = parseReviewerName(reviewerName);
    review = parseReviewBody(review);
    rating = parseReviewRating(rating);

    // If the product  does not exist with that productId, the method should throw.
    const allPosts = await getPosts();
    productId = ObjectId.createFromHexString(productId);
    const product = await allPosts.findOne({ _id: productId });
    if (product == null) {
        throw new Error(`Product with id ${productId.toHexString()} does not exist`);
    }

    const inserted = await allPosts.updateOne(
        { _id: productId },
        {
            $push: {
                reviews: {
                    _id: new ObjectId(),
                    title: title,
                    reviewerName: reviewerName,
                    review: review,
                    rating: rating,
                    reviewDate: DateTime.now().toFormat("MM/dd/yyyy"),
                },
            },
        }
    );
    if (!inserted) {
        throw new Error(`Insert review to product with id ${productId.toString()} failed`);
    }
    await recomputeAverageRating(productId.toString());
    return getProduct(productId.toString());
};

export const getAllReviews = async (productId) => {
    productId = parseObjectId(productId, "Product id");
    const collection = await getPosts();
    return collection
        .aggregate([
            { $match: { _id: ObjectId.createFromHexString(productId) } },
            { $project: { _id: false, reviews: true } },
            { $unwind: "$reviews" },
            {
                $project: {
                    _id: "$reviews._id",
                    title: "$reviews.title",
                    reviewerName: "$reviews.reviewerName",
                    review: "$reviews.review",
                    rating: "$reviews.rating",
                    reviewDate: "$reviews.reviewDate",
                },
            },
        ])
        .toArray();
};

export const getReview = async (reviewId) => {
    reviewId = ObjectId.createFromHexString(parseObjectId(reviewId, "Review id"));
    const collection = await getPosts();
    const aggregation = await collection
        .aggregate([
            { $match: { "reviews._id": reviewId } },
            { $project: { _id: false, reviews: true } },
            { $unwind: "$reviews" },
            { $match: { "reviews._id": reviewId } },
            { $limit: 1 },
        ])
        .toArray();
    // TODO: Handling aggregation results and errors
    if (!aggregation) {
        throw new Error(`Cannot get review with id ${reviewId}`);
    }
    const review = aggregation[0].reviews;
    review._id = review._id.toString();
    return review;
};

export const updateReview = async (reviewId, updateObject) => {
    reviewId = parseObjectId(reviewId, "Review id");

    // Find product with review
    const collection = await getPosts();
    const reviewIdObject = ObjectId.createFromHexString(reviewId);

    // Cheeky hack. Find product, search reviews manually.
    const product = await collection.findOne({ "reviews._id": reviewIdObject });
    if (!product) {
        throw new Error(`No product found with review with id ${reviewId}`);
    }

    const parsedUpdateObject = { "reviews.$.reviewDate": DateTime.now().toFormat("MM/dd/yyyy") };
    if ("title" in updateObject) {
        parsedUpdateObject["reviews.$.title"] = parseReviewTitle(updateObject.title);
    }
    if ("reviewerName" in updateObject) {
        parsedUpdateObject["reviews.$.reviewerName"] = parseReviewerName(updateObject.reviewerName);
    }
    if ("review" in updateObject) {
        parsedUpdateObject["reviews.$.review"] = parseReviewBody(updateObject.review);
    }
    if ("rating" in updateObject) {
        parsedUpdateObject["reviews.$.rating"] = parseReviewRating(updateObject.rating);
    }

    await collection.updateOne({ "reviews._id": ObjectId.createFromHexString(reviewId) }, { $set: parsedUpdateObject });
    await recomputeAverageRating(product._id.toString());
    return await getProduct(product._id.toString());
};

export const removeReview = async (reviewId) => {
    reviewId = parseObjectId(reviewId, "Review id");
    const collection = await getPosts();
    const reviewIdObject = ObjectId.createFromHexString(reviewId);
    const productWithReview = await collection.findOne({ "reviews._id": reviewIdObject });
    const updateResult = await collection.updateOne(
        { "reviews._id": reviewIdObject },
        { $pull: { reviews: { _id: reviewIdObject } } }
    );
    if (!updateResult) {
        throw new Error(`Failed to delete review with id ${reviewId}`);
    }
    await recomputeAverageRating(productWithReview._id.toString());
    return await getProduct(productWithReview._id.toString());
};
