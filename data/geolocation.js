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

export const parseOsmClass = (osmClass) =>
{
    return parseNonEmptyString(osmClass, "OSM class").toLowerCase();
};

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
    return data;
};

export const nominatimLookup = async (osmType, osmId, osmClass = null) =>
{
    // TODO
};

/**
 * Searches the Nominatim database with the given query.
 *
 * @param query
 * @returns {Promise<any>}
 */
export const nominatimSearch = async (query) =>
{
    throwIfNotString(query, "Search query");
    const url = getNominatimApiUrl(NOMINATIM_API_SEARCH_ENDPOINT);
    url.searchParams.format = "json";
    url.searchParams.q = query;
    const {data} = await axios.get(url.toString());
    return data;
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
}


