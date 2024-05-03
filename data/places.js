import {
	assertTypeIs,
	isInfinity,
	isNullOrUndefined,
	parseDate,
	parseNonEmptyString,
	parseObjectId,
	roundTo,
	throwIfNullOrUndefined,
} from "../helpers.js";
import { places } from "../config/database.js";
import { ObjectId } from "mongodb";
import { DateTime } from "luxon";

export const parsePlaceFields = (name, description, osmType, osmId) => {
	const parsed = {};
	// If name and description are not strings or are empty strings, the method should throw.
	parsed.name = parseNonEmptyString(name, "Place name");
	parsed.description = parseNonEmptyString(description, "Place} description");
	return parsed;
};

export const createPlace = async (name, description, osmType, osmId) => {
	const parsed = parsePlaceFields(name, description, osmType, osmId);
	const collection = await places();
	// If no product ID, insert.
	const inserted = await collection.insertOne({
		name: parsed.name,
		description: parsed.description,
		comments: [],
		location: {
			_id: ObjectId(),
			osmId: parsed.osmId,
			osmType: parsed.osmType,
		},
		reviews: [],
	});

	if (!inserted) {
		throw new Error("Failed to create place");
	}

	return await get(inserted.insertedId.toString());
};

export const getAll = async () => {
	const collection = await places();
	const products = await collection.find().project({ _id: 1, name: 1 }).toArray();
	for (const prod of products) {
		prod._id = prod._id.toString();
	}
	return products;
};

export const get = async (productId) => {
	productId = parseObjectId(productId, "Product id");
	const collection = await places();
	const result = await collection.findOne({ _id: ObjectId.createFromHexString(productId) });
	if (!result) {
		throw new Error(`Failed to find product with id ${productId}`);
	}
	result._id = result._id.toString();
	return result;
};

export const remove = async (productId) => {
	productId = parseObjectId(productId, "Product id");
	const collection = await places();
	const deleteResult = await collection.deleteOne({ _id: ObjectId.createFromHexString(productId) });
	if (!deleteResult) {
		throw new Error("Remove failed");
	}

	return;
};

export const update = async (
	productId,
	name,
	productDescription,
	modelNumber,
	price,
	manufacturer,
	manufacturerWebsite,
	keywords,
	categories,
	dateReleased,
	discontinued
) => {
	productId = parseObjectId(productId, "Product id");

	const parsed = parseProductFields(
		name,
		productDescription,
		modelNumber,
		price,
		manufacturer,
		manufacturerWebsite,
		keywords,
		categories,
		dateReleased,
		discontinued
	);

	const collection = await places();

	const updateResult = await collection.updateOne(
		{ _id: ObjectId.createFromHexString(productId) },
		{
			$set: {
				name: parsed.name,
				productDescription: parsed.productDescription,
				modelNumber: parsed.modelNumber,
				price: parsed.price,
				manufacturer: parsed.manufacturer,
				manufacturerWebsite: parsed.manufacturerWebsite,
				keywords: parsed.keywords,
				categories: parsed.categories,
				dateReleased: parsed.dateReleased,
				discontinued: parsed.discontinued,
			},
		}
	);

	if (!updateResult) {
		throw new Error(`Failed to update product with id ${productId}`);
	}

	return await get(productId);
};
