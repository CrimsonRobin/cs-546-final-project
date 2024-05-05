import { parseNonEmptyString, parseObjectId, removeDuplicates, } from "../helpers.js";
import { Place } from "../config/database.js";
import { parseOsmId, parseOsmType } from "./geolocation.js";
import { ObjectId } from "mongodb";
import Enumerable from "linq";

export const parsePlaceFields = (name, description, osmType, osmId) =>
{
    // If name and description are not strings or are empty strings, the method should throw.
    return {
        name: parseNonEmptyString(name, "Place name"),
        description: parseNonEmptyString(description, "Place description"),
        osmId: parseOsmId(osmId),
        osmType: parseOsmType(osmType),
    };
};

export const createPlace = async (name, description, osmType, osmId, address, longitude, latitude) =>
{
    const parsed = parsePlaceFields(name, description, osmType, osmId);
    const document = new Place({
        _id: new ObjectId(),
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

    await document.save();
};

export const get = async (productId) =>
{
    productId = parseObjectId(productId, "Product id");
    const collection = await Place();
    const result = await collection.findOne({ _id: ObjectId.createFromHexString(productId) });
    if (!result)
    {
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
) =>
{
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

    const collection = await Place();

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

    if (!updateResult)
    {
        throw new Error(`Failed to update product with id ${productId}`);
    }

    return await get(productId);
};

const stateAbbreviationToFullNameMap = {
    "al": "alabama",
    "ak": "alaska",
    "az": "arizona",
    "ar": "arkansas",
    "ca": "california",
    "co": "colorado",
    "ct": "connecticut",
    "de": "delaware",
    "dc": "district of columbia",
    "fl": "florida",
    "ga": "georgia",
    "hi": "hawaii",
    "id": "idaho",
    "il": "illinois",
    "in": "indiana",
    "ia": "iowa",
    "ks": "kansas",
    "ky": "kentucky",
    "la": "louisiana",
    "me": "maine",
    "md": "maryland",
    "ma": "massachusetts",
    "mi": "michigan",
    "mn": "minnesota",
    "ms": "mississippi",
    "mo": "missouri",
    "mt": "montana",
    "ne": "nebraska",
    "nv": "nevada",
    "nh": "new hampshire",
    "nj": "new jersey",
    "nm": "new mexico",
    "ny": "new york",
    "nc": "north carolina",
    "nd": "north dakota",
    "oh": "ohio",
    "ok": "oklahoma",
    "or": "oregon",
    "pa": "pennsylvania",
    "ri": "rhode island",
    "sc": "south carolina",
    "sd": "south dakota",
    "tn": "tennessee",
    "tx": "texas",
    "ut": "utah",
    "vt": "vermont",
    "va": "virginia",
    "wa": "washington",
    "wv": "west virginia",
    "wi": "wisconsin",
    "wy": "wyoming",
};

const stateAbbreviationToFullName = (abbreviation) =>
{
    abbreviation = parseNonEmptyString(abbreviation, "state abbreviation");
    if (abbreviation.length !== 2)
    {
        throw new Error("State abbreviation must be exactly 2 characters");
    }
    if (!(abbreviation in stateAbbreviationToFullNameMap))
    {
        throw new Error(`Invalid state abbreviation ${abbreviation}`);
    }
    return stateAbbreviationToFullNameMap[abbreviation];
};

const normalizeSearchQuery = async (query) => {
    const qs = query
        .toLowerCase()
        .replaceAll(/\s+/, " ")
        .split(/\s+/)
        .filter(s => s.length > 0)
        .flatMap(p =>
        {
            // The abbreviation converter will throw an exception if not given an abbreviation.
            // We'll have both the abbreviation and the full name for good measure.
            try
            {
                return [p, stateAbbreviationToFullName(p).split(" ")];
            }
            catch (e)
            {
                return [p];
            }
        });

    return removeDuplicates(qs);
};

const computeSearchMatchScore = async (normalizedQuery, placeData) =>
{
    // Display names have expanded state names
    const addressParts = removeDuplicates(placeData.address
        .toLowerCase()
        .replaceAll(/\s+/, " ")
        .split(/\s+/)
        .filter(s => s.length > 0));

    return normalizedQuery.reduce((acc, e) => addressParts.indexOf(e) >= 0 ? acc + 1 : acc) / normalizedQuery.length;
};

export const search = async (query) =>
{
    query = parseNonEmptyString(query, "search query").toLowerCase();
    const places = await Place.find({}).exec();

    return Enumerable.from(places)
        .select(p => [computeSearchMatchScore(query, p), p])
        .orderBy(p => p[0])
        .select(p => p[1])
        .toArray();
};
