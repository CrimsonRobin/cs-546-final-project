import axios from "axios";
import {assertTypeIs, exactlyOneElement, isNullOrUndefined, parseNonEmptyString, throwIfNotString} from "../helpers.js";

const NOMINATIM_API_BASE_URL = "https://nominatim.openstreetmap.org/"
const NOMINATIM_API_LOOKUP_ENDPOINT = "/lookup";
const NOMINATIM_API_SEARCH_ENDPOINT = "/search";
const NOMINATIM_API_DETAILS_ENDPOINT = "/details";

const NOMINATIM_LOOKUP_MAX_NUMBER_OF_IDS_PER_QUERY = 50;

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

// TODO: Create separate typedefs where some of this stuff gets too "noisy".
/**
 * @typedef {{addressTags: {country: string, country_code: string, state: string, city: string},
 * osmId: string, displayName: string, addressType: string, name: string, osmType: string, category: string,
 * subcategory: string, extraTags: any}} NominatimPlaceData
 */

/**
 *
 * @param data
 * @returns {NominatimPlaceData}
 */
const parseNominatimLookupResult = (data) =>
{
    return {
        // OSM data
        osmType: parseOsmType(data.osm_type),
        osmId: parseOsmId(data.osm_id),

        // Place names
        name: data.name,
        displayName: data.displayName,

        // Place tags (building, highway, etc.)
        category: data.category,
        subcategory: data.type,

        // Address information
        addressTags: jsonClone(data.address),
        addressType: data.addressType,

        // Extra information
        extraTags: jsonClone(data.extratags)
    };
}

/**
 *
 * @param {string[][]} typeIdPairs
 * @returns {Promise<NominatimPlaceData[]>}
 */
const nominatimLookupMany = async (typeIdPairs) =>
{
    // We can only query the API with up to 50 places at a time.
    const requests = [];

    for (let i = 0; i < typeIdPairs.length; i += NOMINATIM_LOOKUP_MAX_NUMBER_OF_IDS_PER_QUERY)
    {
        const url = getNominatimApiUrl(NOMINATIM_API_LOOKUP_ENDPOINT);

        // Need results in JSON format
        url.searchParams.format = "jsonv2";

        // include a full list of names for the result. These may include language variants,
        // older names, references and brand.
        url.searchParams.namedetails = 1;

        // Include extra address details
        url.searchParams.addressdetails = 1;

        // Include extra info about the place
        url.searchParams.extratags = 1;

        url.searchParams.osm_ids = typeIdPairs
            .slice(i, i + NOMINATIM_LOOKUP_MAX_NUMBER_OF_IDS_PER_QUERY)
            .map(pair => `${parseOsmType(pair[0])}${parseOsmId(pair[1])}`)
            .join(",");

        if (url.searchParams.osm_ids.length === 0)
        {
            // Well this shouldn't have happened...
            // TODO: Will this ever happen?
            throw new Error("Bad chunk when looking up many places in Nominatim");
        }

        requests.push(axios.get(url.toString()));
    }

    const axiosResults = await Promise.all(requests);
    // TODO: What happens if an axios call result doesn't have a data field on it?
    return axiosResults.flatMap(x => parseNominatimLookupResult(x.data));
};

/**
 * Gets the details for the place identified by the given OSM type and OSM ID.
 *
 * @param {string} osmType The object's OSM type
 * @param {string} osmId The object's OSM ID
 * @returns {Promise<NominatimPlaceData>}
 * @author Anthony Webster
 */
export const nominatimLookup = async (osmType, osmId) =>
{
    return exactlyOneElement(await nominatimLookupMany([[osmType, osmId]]), "nominatim lookup");
};

const jsonClone = (obj) => JSON.parse(JSON.stringify(obj));

/**
 * Searches the Nominatim database with the given query.
 *
 * @param query The query to search Nominatim.
 * @returns {Promise<NominatimPlaceData[]>} An array of search results from Nominatim.
 */
export const nominatimSearch = async (query) =>
{
    throwIfNotString(query, "Search query");
    const url = getNominatimApiUrl(NOMINATIM_API_SEARCH_ENDPOINT);
    url.searchParams.q = query;
    url.searchParams.addressdetails = 1;
    url.searchParams.format = "jsonv2";
    const {data} = await axios.get(url.toString());
    return await nominatimLookupMany(data.map(r => [r.osm_type, r.osm_id]));
};
