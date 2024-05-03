import {Schema, model} from "mongoose";
import {ObjectId} from "mongodb";

const usersSchema = new Schema({
    _id: ObjectId,
    username: String,
    hashedPassword: String,
    createdAt: Date,
    qualifications: [String],
});

const placesSchema = new Schema({
    _id: ObjectId,
    name: String,
    description: String,
    comments: [
        {
            author: {type: String, ref: "users"},
            content: String,
            createdAt: Date,
            likes: Number,
            dislikes: Number,
        },
    ],
    location: {
        _id: ObjectId,
        osmId: String,
        osmType: String,
        address: String,
        longitude: Number,
        latitude: Number,
    },
    reviews: [
        {
            author: {type: String, ref: "users"},
            content: String,
            createdAt: Date,
            likes: Number,
            dislikes: Number,
            categories: [
                {
                    category: String,
                    rating: Number,
                },
            ],
            comments: [
                {
                    author: {type: String, ref: "users"},
                    createdAt: Date,
                    likes: Number,
                    dislikes: Number,
                },
            ],
        },
    ],
});

export const users = model("users", usersSchema);
export const places = model("places", placesSchema);
