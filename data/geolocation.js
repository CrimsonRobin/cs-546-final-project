import axios from "axios";
import {
    assertTypeIs,
    isNullOrUndefined,
    parseNonEmptyString,
    throwIfNotString,
    throwIfNullOrUndefined
} from "../helpers.js";
import * as url from "node:url";

const NOMINATIM_API_BASE_URL = "https://nominatim.openstreetmap.org/"
const NOMINATIM_API_LOOKUP_ENDPOINT = "/lookup";
const NOMINATIM_API_SEARCH_ENDPOINT = "/search";
const NOMINATIM_API_DETAILS_ENDPOINT = "/details";

export const OSM_TYPE_NODE = "N";
export const OSM_TYPE_WAY = "W";
export const OSM_TYPE_RELATION = "R";

/**
 * Parses the given OSM type.
 *
 * Accepts both the "full names" for the OSM types (such as "node" instead of "N") and
 * the single-letter abbreviations. Leading and trailing whitespace is ignored.
 *
 * @param {*} osmType An OSM type.
 * @returns {string} The parsed OSM type.
 * @author Anthony Webster
 */
export const parseOsmType = (osmType) =>
{
    // The OSM type can either be node (N), way (W), or relation (R)
    osmType = parseNonEmptyString(osmType, "OSM type").toLowerCase();

    switch (osmType.toLowerCase())
    {
        case "n":
        case "node":
            return OSM_TYPE_NODE;
        case "w":
        case "way":
            return OSM_TYPE_WAY;
        case "r":
        case "relation":
            return OSM_TYPE_RELATION;
        default:
            throw new Error(`Invalid OSM type ${osmType}`);
    }
};

/**
 * Wraps a Nominatim API call result so that the OSM type and OSM ID are consistently available in
 * a deterministic location and in a deterministic form.
 *
 * Unfortunately, Nominatim isn't completely consistent across all its endpoints, so this function
 * provides a consistent interface for accessing the most important information (type and ID).
 *
 * @param osmType
 * @param osmId
 * @param apiResults
 * @returns {{data, osmId: string, osmType: string}}
 */
const createNominatimApiCallResult = (osmType, osmId, apiResults) =>
{
    return {
        // Regardless of the type Nominatim gives us, we'll convert it to what we use internally.
        osmType: parseOsmType(osmType),
        // Nominatim likes to give IDs back as numbers, but we use strings.
        osmId: osmId.toString(),
        data: apiResults
    };
};

/**
 * Parses an OSM class.
 * @param {*} osmClass An OSM class.
 * @returns {string} The parsed OSM class.
 */
export const parseOsmClass = (osmClass) =>
{
    return parseNonEmptyString(osmClass, "OSM class").toLowerCase();
};

/**
 * Parses and OSM ID.
 *
 * @param {*} osmId The OSM ID.
 * @returns {string} The parsed OSM ID.
 * @author Anthony Webster
 */
export const parseOsmId = (osmId) =>
{
    throwIfNotString(osmId, "OSM ID");
    if (osmId.length === 0)
    {
        throw new Error("OSM ID cannot be an empty string");
    }
    return osmId;
}

const getNominatimApiUrl = (endpoint) =>
{
    return new URL(endpoint, NOMINATIM_API_BASE_URL);
}

/**
 * Gets the details for the place identified by the given OSM type and OSM ID.
 *
 * @param {string} osmType The object's OSM type
 * @param {string} osmId The object's OSM ID
 * @param {string | null} osmClass The object's OSM class.
 * @returns {Promise<{data, osmId: string, osmType: string}>}
 * @author Anthony Webster
 */
export const nominatimDetails = async (osmType, osmId, osmClass = null) =>
{
    const url = getNominatimApiUrl(NOMINATIM_API_DETAILS_ENDPOINT);

    // Need results in JSON format
    url.searchParams.format = "json";

    // include a full list of names for the result. These may include language variants,
    // older names, references and brand.
    url.searchParams.namedetails = 1;

    url.searchParams.osmType = parseOsmType(osmType);
    url.searchParams.osmId = parseOsmId(osmId);

    if (!isNullOrUndefined(osmClass))
    {
        url.searchParams.osmClass = parseOsmClass(osmClass);
    }

    const {data} = await axios.get(url.toString());
    return createNominatimApiCallResult(data.osm_type, data.osm_id, data);
};

export const nominatimLookup = async (osmType, osmId, osmClass = null) =>
{
    // TODO
};

const jsonClone = (obj) => JSON.parse(JSON.stringify(obj));

/**
 * A result of querying Nominatim's search endpoint.
 * @typedef {{address: any, osmId: string, displayName: string, importance: number, name: string, osmType: string, category: string, subcategory: string, addressRefersTo: string}} NominatimSearchResult
 */

/**
 * Parses a raw search result from Nominatim into a more relevant search result.
 *
 * @param searchResult A raw search result from Nominatim.
 * @returns {NominatimSearchResult} The parsed search result from Nominatim.
 * @author Anthony Webster
 */
const parseSearchResult = (searchResult) =>
{
    return {
        osmType: parseOsmType(searchResult.osm_type),
        osmId: searchResult.osm_id.toString(),
        name: searchResult.name,
        displayName: searchResult.displayName,
        category: searchResult.category,
        subcategory: searchResult.type,
        addressRefersTo: searchResult.addressType,
        address: jsonClone(searchResult.address),
        importance: searchResult.importance
    };
}

/**
 * Searches the Nominatim database with the given query.
 *
 * @param query The query to search Nominatim.
 * @returns {Promise<NominatimSearchResult[]>} An array of search results from Nominatim.
 */
export const nominatimSearch = async (query) =>
{
    throwIfNotString(query, "Search query");
    const url = getNominatimApiUrl(NOMINATIM_API_SEARCH_ENDPOINT);
    url.searchParams.q = query;
    url.searchParams.addressdetails = 1;
    url.searchParams.format = "jsonv2";
    const {data} = await axios.get(url.toString());
    return data.map(parseSearchResult);
};

/**
 * Gets the name of the place in English, falling back to the default name of the place if no explicit
 * English name is provided.
 *
 * @param osmType
 * @param osmId
 * @param osmClass
 * @returns {Promise<string>}
 */
export const getEnglishName = async (osmType, osmId, osmClass = null) =>
{
    const {data} = await nominatimDetails(osmType, osmId, osmClass);
    const names = data.names;
    if (!isNullOrUndefined(names) || typeof names === "object")
    {
        const englishName = names["name:en"];
        if (!isNullOrUndefined(englishName) && typeof englishName === "string")
        {
            return englishName;
        }

        const name = names["name"];
        if (!isNullOrUndefined(name) && typeof name === "string")
        {
            return name;
        }
    }

    // Try to get local name instead
    const localName = data.localname;
    if (isNullOrUndefined(localName))
    {
        throw new Error("Internal error: Nominatim did not provide a local name");
    }
    assertTypeIs(localName, "string", "Local name");
    return localName;
};
