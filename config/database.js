import { Schema, model } from "mongoose";
import { ObjectId } from "mongodb";

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
            author: { type: String, ref: "users" },
            content: String,
            createdAt: Date,
            likes: Number,
            dislikes: Number,
        },
    ],
    location: {
        _id: Schema.Types.ObjectId,
        osmId: String,
        osmType: String,
        address: String,
        longitude: Number,
        latitude: Number,
    },
    reviews: [
        {
            author: { type: String, ref: "users" },
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
                    author: { type: String, ref: "users" },
                    createdAt: Date,
                    likes: Number,
                    dislikes: Number,
                },
            ],
        },
    ],
});

/**
 *
 * @type {Model<InferSchemaType<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {createdAt: DateConstructor, qualifications: StringConstructor[], hashedPassword: StringConstructor, _id: ObjectId, username: StringConstructor}, HydratedDocument<FlatRecord<{createdAt: DateConstructor, qualifications: StringConstructor[], hashedPassword: StringConstructor, _id: ObjectId, username: StringConstructor}>, {}>>>, ObtainSchemaGeneric<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {createdAt: DateConstructor, qualifications: StringConstructor[], hashedPassword: StringConstructor, _id: ObjectId, username: StringConstructor}, HydratedDocument<FlatRecord<{createdAt: DateConstructor, qualifications: StringConstructor[], hashedPassword: StringConstructor, _id: ObjectId, username: StringConstructor}>, {}>>, "TQueryHelpers">, ObtainSchemaGeneric<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {createdAt: DateConstructor, qualifications: StringConstructor[], hashedPassword: StringConstructor, _id: ObjectId, username: StringConstructor}, HydratedDocument<FlatRecord<{createdAt: DateConstructor, qualifications: StringConstructor[], hashedPassword: StringConstructor, _id: ObjectId, username: StringConstructor}>, {}>>, "TInstanceMethods">, ObtainSchemaGeneric<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {createdAt: DateConstructor, qualifications: StringConstructor[], hashedPassword: StringConstructor, _id: ObjectId, username: StringConstructor}, HydratedDocument<FlatRecord<{createdAt: DateConstructor, qualifications: StringConstructor[], hashedPassword: StringConstructor, _id: ObjectId, username: StringConstructor}>, {}>>, "TVirtuals">, HydratedDocument<InferSchemaType<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {createdAt: DateConstructor, qualifications: StringConstructor[], hashedPassword: StringConstructor, _id: ObjectId, username: StringConstructor}, HydratedDocument<FlatRecord<{createdAt: DateConstructor, qualifications: StringConstructor[], hashedPassword: StringConstructor, _id: ObjectId, username: StringConstructor}>, {}>>>, ObtainSchemaGeneric<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {createdAt: DateConstructor, qualifications: StringConstructor[], hashedPassword: StringConstructor, _id: ObjectId, username: StringConstructor}, HydratedDocument<FlatRecord<{createdAt: DateConstructor, qualifications: StringConstructor[], hashedPassword: StringConstructor, _id: ObjectId, username: StringConstructor}>, {}>>, "TVirtuals"> & ObtainSchemaGeneric<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {createdAt: DateConstructor, qualifications: StringConstructor[], hashedPassword: StringConstructor, _id: ObjectId, username: StringConstructor}, HydratedDocument<FlatRecord<{createdAt: DateConstructor, qualifications: StringConstructor[], hashedPassword: StringConstructor, _id: ObjectId, username: StringConstructor}>, {}>>, "TInstanceMethods">, ObtainSchemaGeneric<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {createdAt: DateConstructor, qualifications: StringConstructor[], hashedPassword: StringConstructor, _id: ObjectId, username: StringConstructor}, HydratedDocument<FlatRecord<{createdAt: DateConstructor, qualifications: StringConstructor[], hashedPassword: StringConstructor, _id: ObjectId, username: StringConstructor}>, {}>>, "TQueryHelpers">>, module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {createdAt: DateConstructor, qualifications: StringConstructor[], hashedPassword: StringConstructor, _id: ObjectId, username: StringConstructor}, HydratedDocument<FlatRecord<{createdAt: DateConstructor, qualifications: StringConstructor[], hashedPassword: StringConstructor, _id: ObjectId, username: StringConstructor}>, {}>>> & ObtainSchemaGeneric<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {createdAt: DateConstructor, qualifications: StringConstructor[], hashedPassword: StringConstructor, _id: ObjectId, username: StringConstructor}, HydratedDocument<FlatRecord<{createdAt: DateConstructor, qualifications: StringConstructor[], hashedPassword: StringConstructor, _id: ObjectId, username: StringConstructor}>, {}>>, "TStaticMethods">}
 */
export const User = model("users", usersSchema);

/**
 *
 * @type {Model<InferSchemaType<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, content: StringConstructor, likes: NumberConstructor}], reviews: [{createdAt: DateConstructor, comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, likes: NumberConstructor}], author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, categories: [{rating: NumberConstructor, category: StringConstructor}], content: StringConstructor, likes: NumberConstructor}], name: StringConstructor, description: StringConstructor, location: {address: StringConstructor, osmId: StringConstructor, latitude: NumberConstructor, osmType: StringConstructor, _id: ObjectId, longitude: NumberConstructor}, _id: ObjectId}, HydratedDocument<FlatRecord<{comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, content: StringConstructor, likes: NumberConstructor}], reviews: [{createdAt: DateConstructor, comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, likes: NumberConstructor}], author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, categories: [{rating: NumberConstructor, category: StringConstructor}], content: StringConstructor, likes: NumberConstructor}], name: StringConstructor, description: StringConstructor, location: {address: StringConstructor, osmId: StringConstructor, latitude: NumberConstructor, osmType: StringConstructor, _id: ObjectId, longitude: NumberConstructor}, _id: ObjectId}>, {}>>>, ObtainSchemaGeneric<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, content: StringConstructor, likes: NumberConstructor}], reviews: [{createdAt: DateConstructor, comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, likes: NumberConstructor}], author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, categories: [{rating: NumberConstructor, category: StringConstructor}], content: StringConstructor, likes: NumberConstructor}], name: StringConstructor, description: StringConstructor, location: {address: StringConstructor, osmId: StringConstructor, latitude: NumberConstructor, osmType: StringConstructor, _id: ObjectId, longitude: NumberConstructor}, _id: ObjectId}, HydratedDocument<FlatRecord<{comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, content: StringConstructor, likes: NumberConstructor}], reviews: [{createdAt: DateConstructor, comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, likes: NumberConstructor}], author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, categories: [{rating: NumberConstructor, category: StringConstructor}], content: StringConstructor, likes: NumberConstructor}], name: StringConstructor, description: StringConstructor, location: {address: StringConstructor, osmId: StringConstructor, latitude: NumberConstructor, osmType: StringConstructor, _id: ObjectId, longitude: NumberConstructor}, _id: ObjectId}>, {}>>, "TQueryHelpers">, ObtainSchemaGeneric<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, content: StringConstructor, likes: NumberConstructor}], reviews: [{createdAt: DateConstructor, comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, likes: NumberConstructor}], author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, categories: [{rating: NumberConstructor, category: StringConstructor}], content: StringConstructor, likes: NumberConstructor}], name: StringConstructor, description: StringConstructor, location: {address: StringConstructor, osmId: StringConstructor, latitude: NumberConstructor, osmType: StringConstructor, _id: ObjectId, longitude: NumberConstructor}, _id: ObjectId}, HydratedDocument<FlatRecord<{comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, content: StringConstructor, likes: NumberConstructor}], reviews: [{createdAt: DateConstructor, comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, likes: NumberConstructor}], author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, categories: [{rating: NumberConstructor, category: StringConstructor}], content: StringConstructor, likes: NumberConstructor}], name: StringConstructor, description: StringConstructor, location: {address: StringConstructor, osmId: StringConstructor, latitude: NumberConstructor, osmType: StringConstructor, _id: ObjectId, longitude: NumberConstructor}, _id: ObjectId}>, {}>>, "TInstanceMethods">, ObtainSchemaGeneric<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, content: StringConstructor, likes: NumberConstructor}], reviews: [{createdAt: DateConstructor, comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, likes: NumberConstructor}], author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, categories: [{rating: NumberConstructor, category: StringConstructor}], content: StringConstructor, likes: NumberConstructor}], name: StringConstructor, description: StringConstructor, location: {address: StringConstructor, osmId: StringConstructor, latitude: NumberConstructor, osmType: StringConstructor, _id: ObjectId, longitude: NumberConstructor}, _id: ObjectId}, HydratedDocument<FlatRecord<{comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, content: StringConstructor, likes: NumberConstructor}], reviews: [{createdAt: DateConstructor, comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, likes: NumberConstructor}], author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, categories: [{rating: NumberConstructor, category: StringConstructor}], content: StringConstructor, likes: NumberConstructor}], name: StringConstructor, description: StringConstructor, location: {address: StringConstructor, osmId: StringConstructor, latitude: NumberConstructor, osmType: StringConstructor, _id: ObjectId, longitude: NumberConstructor}, _id: ObjectId}>, {}>>, "TVirtuals">, HydratedDocument<InferSchemaType<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, content: StringConstructor, likes: NumberConstructor}], reviews: [{createdAt: DateConstructor, comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, likes: NumberConstructor}], author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, categories: [{rating: NumberConstructor, category: StringConstructor}], content: StringConstructor, likes: NumberConstructor}], name: StringConstructor, description: StringConstructor, location: {address: StringConstructor, osmId: StringConstructor, latitude: NumberConstructor, osmType: StringConstructor, _id: ObjectId, longitude: NumberConstructor}, _id: ObjectId}, HydratedDocument<FlatRecord<{comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, content: StringConstructor, likes: NumberConstructor}], reviews: [{createdAt: DateConstructor, comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, likes: NumberConstructor}], author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, categories: [{rating: NumberConstructor, category: StringConstructor}], content: StringConstructor, likes: NumberConstructor}], name: StringConstructor, description: StringConstructor, location: {address: StringConstructor, osmId: StringConstructor, latitude: NumberConstructor, osmType: StringConstructor, _id: ObjectId, longitude: NumberConstructor}, _id: ObjectId}>, {}>>>, ObtainSchemaGeneric<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, content: StringConstructor, likes: NumberConstructor}], reviews: [{createdAt: DateConstructor, comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, likes: NumberConstructor}], author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, categories: [{rating: NumberConstructor, category: StringConstructor}], content: StringConstructor, likes: NumberConstructor}], name: StringConstructor, description: StringConstructor, location: {address: StringConstructor, osmId: StringConstructor, latitude: NumberConstructor, osmType: StringConstructor, _id: ObjectId, longitude: NumberConstructor}, _id: ObjectId}, HydratedDocument<FlatRecord<{comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, content: StringConstructor, likes: NumberConstructor}], reviews: [{createdAt: DateConstructor, comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, likes: NumberConstructor}], author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, categories: [{rating: NumberConstructor, category: StringConstructor}], content: StringConstructor, likes: NumberConstructor}], name: StringConstructor, description: StringConstructor, location: {address: StringConstructor, osmId: StringConstructor, latitude: NumberConstructor, osmType: StringConstructor, _id: ObjectId, longitude: NumberConstructor}, _id: ObjectId}>, {}>>, "TVirtuals"> & ObtainSchemaGeneric<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, content: StringConstructor, likes: NumberConstructor}], reviews: [{createdAt: DateConstructor, comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, likes: NumberConstructor}], author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, categories: [{rating: NumberConstructor, category: StringConstructor}], content: StringConstructor, likes: NumberConstructor}], name: StringConstructor, description: StringConstructor, location: {address: StringConstructor, osmId: StringConstructor, latitude: NumberConstructor, osmType: StringConstructor, _id: ObjectId, longitude: NumberConstructor}, _id: ObjectId}, HydratedDocument<FlatRecord<{comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, content: StringConstructor, likes: NumberConstructor}], reviews: [{createdAt: DateConstructor, comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, likes: NumberConstructor}], author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, categories: [{rating: NumberConstructor, category: StringConstructor}], content: StringConstructor, likes: NumberConstructor}], name: StringConstructor, description: StringConstructor, location: {address: StringConstructor, osmId: StringConstructor, latitude: NumberConstructor, osmType: StringConstructor, _id: ObjectId, longitude: NumberConstructor}, _id: ObjectId}>, {}>>, "TInstanceMethods">, ObtainSchemaGeneric<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, content: StringConstructor, likes: NumberConstructor}], reviews: [{createdAt: DateConstructor, comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, likes: NumberConstructor}], author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, categories: [{rating: NumberConstructor, category: StringConstructor}], content: StringConstructor, likes: NumberConstructor}], name: StringConstructor, description: StringConstructor, location: {address: StringConstructor, osmId: StringConstructor, latitude: NumberConstructor, osmType: StringConstructor, _id: ObjectId, longitude: NumberConstructor}, _id: ObjectId}, HydratedDocument<FlatRecord<{comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, content: StringConstructor, likes: NumberConstructor}], reviews: [{createdAt: DateConstructor, comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, likes: NumberConstructor}], author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, categories: [{rating: NumberConstructor, category: StringConstructor}], content: StringConstructor, likes: NumberConstructor}], name: StringConstructor, description: StringConstructor, location: {address: StringConstructor, osmId: StringConstructor, latitude: NumberConstructor, osmType: StringConstructor, _id: ObjectId, longitude: NumberConstructor}, _id: ObjectId}>, {}>>, "TQueryHelpers">>, module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, content: StringConstructor, likes: NumberConstructor}], reviews: [{createdAt: DateConstructor, comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, likes: NumberConstructor}], author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, categories: [{rating: NumberConstructor, category: StringConstructor}], content: StringConstructor, likes: NumberConstructor}], name: StringConstructor, description: StringConstructor, location: {address: StringConstructor, osmId: StringConstructor, latitude: NumberConstructor, osmType: StringConstructor, _id: ObjectId, longitude: NumberConstructor}, _id: ObjectId}, HydratedDocument<FlatRecord<{comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, content: StringConstructor, likes: NumberConstructor}], reviews: [{createdAt: DateConstructor, comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, likes: NumberConstructor}], author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, categories: [{rating: NumberConstructor, category: StringConstructor}], content: StringConstructor, likes: NumberConstructor}], name: StringConstructor, description: StringConstructor, location: {address: StringConstructor, osmId: StringConstructor, latitude: NumberConstructor, osmType: StringConstructor, _id: ObjectId, longitude: NumberConstructor}, _id: ObjectId}>, {}>>> & ObtainSchemaGeneric<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, content: StringConstructor, likes: NumberConstructor}], reviews: [{createdAt: DateConstructor, comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, likes: NumberConstructor}], author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, categories: [{rating: NumberConstructor, category: StringConstructor}], content: StringConstructor, likes: NumberConstructor}], name: StringConstructor, description: StringConstructor, location: {address: StringConstructor, osmId: StringConstructor, latitude: NumberConstructor, osmType: StringConstructor, _id: ObjectId, longitude: NumberConstructor}, _id: ObjectId}, HydratedDocument<FlatRecord<{comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, content: StringConstructor, likes: NumberConstructor}], reviews: [{createdAt: DateConstructor, comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, likes: NumberConstructor}], author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, categories: [{rating: NumberConstructor, category: StringConstructor}], content: StringConstructor, likes: NumberConstructor}], name: StringConstructor, description: StringConstructor, location: {address: StringConstructor, osmId: StringConstructor, latitude: NumberConstructor, osmType: StringConstructor, _id: ObjectId, longitude: NumberConstructor}, _id: ObjectId}>, {}>>, "TStaticMethods">}
 */
export const Place = model("places", placesSchema);
