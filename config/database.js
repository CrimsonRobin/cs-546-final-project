import { Schema, model } from "mongoose";
import { ObjectId } from "mongodb";

const disabilityCategoriesSchema = new Schema({
	_id: ObjectId,
	category: String,
});

const usersSchema = new Schema({
	_id: ObjectId,
	username: String,
	hashedPassword: String,
	createdAt: Date,
	qualifications: [
		{
			category: { type: Schema.Types.ObjectId, ref: "disabilityCategory" },
		},
	],
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
		_id: ObjectId,
		osmId: String,
		osmType: String,
		address: String,
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
					category: { type: Schema.Types.ObjectId, ref: "disabilityCategory" },
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
	averageRatings: {
		overallAvgRating: Number,
		physicalAvgRating: Number,
		sensoryAvgRating: Number,
		neuroDivergentAvgRating: Number,
	},
});

export const disabilityCategories = model("disabilityCategories", disabilityCategoriesSchema);
export const users = model("users", usersSchema);
export const places = model("places", placesSchema);
