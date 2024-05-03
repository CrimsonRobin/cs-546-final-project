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
import { parseOsmId, parseOsmType } from "./geolocation.js";
import { DateTime } from "luxon";

export const parsePlaceFields = (name, description, osmType, osmId) => {
	// If name and description are not strings or are empty strings, the method should throw.
	return {
		name: parseNonEmptyString(name, "Place name"),
		description: parseNonEmptyString(description, "Place description"),
		osmId: parseOsmId(osmId),
		osmType: parseOsmType(osmType),
	};
};

export const createPlace = async (name, description, osmType, osmId, address, longitude, latitude) => {
	const parsed = parsePlaceFields(name, description, osmType, osmId);
	const collection = await places();
	// If no product ID, insert.
	const inserted = await collection.insertOne({
		name: parsed.name,
		description: parsed.description,
		comments: [],
		location: {
			_id: new ObjectId(),
			osmId: parsed.osmId,
			osmType: parsed.osmType,
			address: address.displayName,
			longitude: longitude,
			latitude: latitude,
			//lookup happened in routes - API calls are expensive
		},
		reviews: [],
	});

	if (!inserted) {
		throw new Error("Failed to create place");
	}

	return await get(inserted.insertedId.toString());
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

//delete places?

export const updatePlace = async (
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
