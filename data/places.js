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

/**
 *
 * @param query
 * @returns {(string|*)[]}
 */
const normalizeSearchQuery = (query) => {
    // TODO: Replacing non-alphanumeric with spaces breaks state abbreviations
    // State abbreviations could be written as "N.Y." instead of "NY"
    const qs = query
        .toLowerCase()
        .replaceAll(/[^a-zA-Z0-9]+/g, " ")
        .replaceAll(/\s+/g, " ")
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

/**
 *
 * @param normalizedQuery
 * @param placeData
 * @returns {number}
 */
const computeSearchMatchScore = (normalizedQuery, placeData) =>
{
    // TODO: Remove non-alphanumeric
    // Display names have expanded state names
    let totalMatches = 0;

    for (let against of [placeData.location.address, placeData.name, placeData.description])
    {
        against = normalizeSearchQuery(placeData.location.address);
        totalMatches += normalizedQuery.reduce((acc, e) => against.some(p => p.indexOf(e) >= 0) ? 1 : 0, 0);
    }

    return totalMatches;
};

/**
 *
 * @param query
 * @returns {Promise<(FlattenMaps<InferSchemaType<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, {comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, content: StringConstructor, likes: NumberConstructor}], reviews: [{createdAt: DateConstructor, comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, likes: NumberConstructor}], author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, categories: [{rating: NumberConstructor, category: StringConstructor}], content: StringConstructor, likes: NumberConstructor}], name: StringConstructor, description: StringConstructor, location: {address: StringConstructor, osmId: StringConstructor, latitude: NumberConstructor, osmType: StringConstructor, _id: ObjectId, longitude: NumberConstructor}, _id: ObjectId}, HydratedDocument<FlatRecord<{comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, content: StringConstructor, likes: NumberConstructor}], reviews: [{createdAt: DateConstructor, comments: [{createdAt: DateConstructor, author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, likes: NumberConstructor}], author: {ref: string, type: StringConstructor}, dislikes: NumberConstructor, categories: [{rating: NumberConstructor, category: StringConstructor}], content: StringConstructor, likes: NumberConstructor}], name: StringConstructor, description: StringConstructor, location: {address: StringConstructor, osmId: StringConstructor, latitude: NumberConstructor, osmType: StringConstructor, _id: ObjectId, longitude: NumberConstructor}, _id: ObjectId}>, {}>>>> & Required<{_id: ObjectId}>)[]>}
 */
export const search = async (query) =>
{
    query = normalizeSearchQuery(parseNonEmptyString(query, "search query"));
    const places = await Place.find({}, ["_id", "location"], null).exec();

    return Enumerable.from(places)
        .select(p => [computeSearchMatchScore(query, p), p])
        .where(p => p[0] > 0)
        .orderByDescending(p => p[0])
        .select(p => p[1]._id.toString())
        .toArray();
};
