// This data file should export all functions using the ES6 standard as shown in the lecture code

import {
    assertTypeIs,
    isInfinity,
    isNullOrUndefined,
    parseDate,
    parseNonEmptyString,
    parseObjectId,
    roundTo,
    throwIfNullOrUndefined
} from "../helpers.js";
import {posts} from "../config/mongoCollections.js";
import {ObjectId} from "mongodb";
import {DateTime} from "luxon";

export const parseProductFields = (
    productName,
    productDescription,
    modelNumber,
    price,
    manufacturer,
    manufacturerWebsite,
    keywords,
    categories,
    dateReleased,
    discontinued) =>
{
    throwIfNullOrUndefined(productName, "Product name");
    throwIfNullOrUndefined(productDescription, "Product description");
    throwIfNullOrUndefined(modelNumber, "Model number");
    throwIfNullOrUndefined(price, "Price");
    throwIfNullOrUndefined(manufacturer, "Manufacturer");
    throwIfNullOrUndefined(manufacturerWebsite, "Manufacturer website");
    throwIfNullOrUndefined(keywords, "Keywords");
    throwIfNullOrUndefined(categories, "Categories");
    throwIfNullOrUndefined(dateReleased, "Date released");
    throwIfNullOrUndefined(discontinued, "Discontinued");

    const parsed = {};

    // If id, productName, productDescription, modelNumber, manufacturer, manufacturerWebsite, dateReleased are not
    // strings or are empty strings, the method should throw.
    parsed.productName = parseNonEmptyString(productName, "Product name");
    parsed.productDescription = parseNonEmptyString(productDescription, "Product description");
    parsed.modelNumber = parseNonEmptyString(modelNumber, "Model number");
    parsed.manufacturer = parseNonEmptyString(manufacturer, "Manufacturer");
    parsed.manufacturerWebsite = parseNonEmptyString(manufacturerWebsite, "Manufacturer website");
    parsed.dateReleased = parseNonEmptyString(dateReleased, "Date released");

    // If price is not a number greater than 0, whole numbers and decimals allowed (only allow 2 decimal points for
    // the cents, no more than two!), the method should throw.
    assertTypeIs(price, "number", "Price");

    if (Number.isNaN(price))
    {
        throw new Error("Price must not be NaN");
    }

    if (isInfinity(price))
    {
        throw new Error("Price must not be infinity");
    }

    if (price < 0)
    {
        throw new Error("Price must be a positive, non-zero decimal");
    }

    if (price - roundTo(price, 2) !== 0.0)
    {
        throw new Error("Price must have at most 2 decimal places");
    }

    parsed.price = price;

    // If manufacturerWebsite does not start with http://www. and end in a .com, and have at least 5 characters
    // in-between the http://www. and .com this method will throw.
    const urlRegex = /^http:\/\/www\..{5,}\.com$/ug;
    if (!manufacturerWebsite.match(urlRegex))
    {
        throw new Error("Manufacturer website must start with `http://www.` and end with `.com` and have a domain name of at least 5 characters");
    }

    parsed.manufacturerWebsite = manufacturerWebsite;

    // If keywords, categories are not arrays and if they do not have at least one element in each of them that is
    // a valid string, or are empty strings the method should throw. (each element should be a valid string but the
    // arrays should contain at LEAST one element that's a valid string.
    const validateArray = (arr, paramName) =>
    {
        assertTypeIs(arr, "array", paramName);

        if (arr.length === 0)
        {
            throw new Error(`${paramName} cannot be an empty array`);
        }

        return arr.map(e => parseNonEmptyString(e, `Element of ${paramName}`));
    };

    keywords = validateArray(keywords, "Keywords");
    parsed.keywords = keywords;

    categories = validateArray(categories, "Categories");
    parsed.categories = categories;

    // If dateReleased is not a valid date in mm/dd/yyyy format then the method should throw. You will not have to
    // take into account leap years but it must be a valid date. For example:09/31/2022 would not be valid as there
    // are not 31 days in September. 02/30/1995 would not be valid as there are never 30 days in Feb.
    //
    // We want to store the date as a string, so to avoid converting back and forth, we'll just use the parse
    // function like validation and ignore the result.
    const parsedDate = parseDate(dateReleased, "MM/dd/yyyy", "Date released");
    if (DateTime.now().startOf("day").diff(parsedDate, "milliseconds").milliseconds < 0)
    {
        // throw new Error("Year of date must fall in range [1000, 2024].");
        throw new Error("Date released must fall on or before today's date");
    }
    parsed.dateReleased = dateReleased;

    // If discontinued is not a boolean, then the method should throw.
    assertTypeIs(discontinued, "boolean", "Discontinued");
    parsed.discontinued = discontinued;

    return parsed;
};

export const create = async (
    productName,
    productDescription,
    modelNumber,
    price,
    manufacturer,
    manufacturerWebsite,
    keywords,
    categories,
    dateReleased,
    discontinued
) =>
{
    const parsed = parseProductFields(productName, productDescription, modelNumber, price, manufacturer,
        manufacturerWebsite, keywords, categories, dateReleased, discontinued);

    const collection = await posts();

    // If no product ID, insert.
    const inserted = await collection.insertOne({
        productName: parsed.productName,
        productDescription: parsed.productDescription,
        modelNumber: parsed.modelNumber,
        price: parsed.price,
        manufacturer: parsed.manufacturer,
        manufacturerWebsite: parsed.manufacturerWebsite,
        keywords: parsed.keywords,
        categories: parsed.categories,
        dateReleased: parsed.dateReleased,
        discontinued: parsed.discontinued,
        reviews: [],
        averageRating: 0
    });

    if (!inserted)
    {
        throw new Error("Failed to create product");
    }

    return await get(inserted.insertedId.toString());
};

export const getAll = async () =>
{
    const collection = await posts();
    const products = await collection.find().project({_id: 1, productName: 1}).toArray();
    for (const prod of products)
    {
        prod._id = prod._id.toString();
    }
    return products;
};

export const get = async (productId) =>
{
    productId = parseObjectId(productId, "Product id");
    const collection = await posts();
    const result = await collection.findOne({_id: ObjectId.createFromHexString(productId)});
    if (!result)
    {
        throw new Error(`Failed to find product with id ${productId}`);
    }
    result._id = result._id.toString();
    return result;
};

export const remove = async (productId) =>
{
    productId = parseObjectId(productId, "Product id");
    const collection = await posts();
    const deleteResult = await collection.deleteOne({_id: ObjectId.createFromHexString(productId)});
    if (!deleteResult)
    {
        throw new Error("Remove failed");
    }

    return;
};

export const update = async (
    productId,
    productName,
    productDescription,
    modelNumber,
    price,
    manufacturer,
    manufacturerWebsite,
    keywords,
    categories,
    dateReleased,
    discontinued
) =>
{
    productId = parseObjectId(productId, "Product id");

    const parsed =
        parseProductFields(productName, productDescription, modelNumber, price, manufacturer, manufacturerWebsite,
            keywords, categories, dateReleased, discontinued);

    const collection = await posts();

    const updateResult =
        await collection.updateOne({_id: ObjectId.createFromHexString(productId)},
            {
                $set: {
                    productName: parsed.productName,
                    productDescription: parsed.productDescription,
                    modelNumber: parsed.modelNumber,
                    price: parsed.price,
                    manufacturer: parsed.manufacturer,
                    manufacturerWebsite: parsed.manufacturerWebsite,
                    keywords: parsed.keywords,
                    categories: parsed.categories,
                    dateReleased: parsed.dateReleased,
                    discontinued: parsed.discontinued
                }
            });

    if (!updateResult)
    {
        throw new Error(`Failed to update product with id ${productId}`);
    }

    return await get(productId);
};
