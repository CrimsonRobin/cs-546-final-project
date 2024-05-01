import {
    assertTypeIs,
    degreesToRadians,
    exactlyOneElement, haversin,
    isNullOrUndefined,
    parseNonEmptyString, parseNumber, roundTo, sleep,
    throwIfNotString
} from "../../helpers.js";

const NOMINATIM_API_BASE_URL = "https://nominatim.openstreetmap.org/"
const NOMINATIM_API_LOOKUP_ENDPOINT = "/lookup";
const NOMINATIM_API_SEARCH_ENDPOINT = "/search";

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
 * Parses an OSM class.
 *
 * @param {*} osmClass An OSM class.
 * @returns {string} The parsed OSM class.
 * @author Anthony Webster
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
    if (typeof osmId === "number")
    {
        return osmId.toString();
    }

    throwIfNotString(osmId, "OSM ID");
    if (osmId.length === 0)
    {
        throw new Error("OSM ID cannot be an empty string");
    }
    return osmId;
}

/**
 * Gets the URL for the given Nominatim endpoint.
 *
 * @param {string} endpoint The Nominatim endpoint.
 * @returns {module:url.URL} A URL representing the Nominatim API endpoint.
 * @author Anthony Webster
 */
const getNominatimApiUrl = (endpoint) =>
{
    return new URL(endpoint, NOMINATIM_API_BASE_URL);
}

/**
 * Make a generic get request to the Nominatim API at the given URL.
 *
 * The Nominatim API should respond with JSON.
 *
 * @param url The full URL to the Nominatim endpoint with any and all parameters.
 * @returns {Promise<any>} The data from Nominatim.
 * @author Anthony Webster
 */
const makeNominatimApiRequest = async (url) =>
{
    // [deep sigh and exhale]
    // Nominatim has a strict maximum of one request per second.
    // This is a bit of a nuclear option, but we'll pause before making any requests to be sure that
    // we don't exceed that limit. While it's nuclear and a little obnoxious, it makes sure that we
    // abide by the rules and respect the service. I like to think of it also as a "thank you" for
    // the service being FOSS.
    await sleep(1250);

    if (url instanceof URL)
    {
        url = url.toString();
    }

    const response = await fetch(url, {
        method: 'GET',
        // body: params,
        headers: {
            "User-Agent": "curl/8.7.1"
        }
    });

    return await response.json();
};

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
    if (typeIdPairs.length === 0)
    {
        return [];
    }

    // We can only query the API with up to 50 places at a time.
    const results = [];

    for (let i = 0; i < typeIdPairs.length; i += NOMINATIM_LOOKUP_MAX_NUMBER_OF_IDS_PER_QUERY)
    {
        const url = getNominatimApiUrl(NOMINATIM_API_LOOKUP_ENDPOINT);
        const params = [
            // Need results in JSON format
            ["format", "jsonv2"],
            // include a full list of names for the result. These may include language variants,
            // older names, references and brand.
            ["namedetails", "1"],
            // Include extra address details
            ["addressdetails", "1"],
            // Include extra info about the place
            ["extratags", "1"]
        ];

        params.forEach(p => url.searchParams.append(p[0], p[1]));

        const waypoints = typeIdPairs
            .map(p => `${parseOsmType(p[0])}${parseOsmId(p[1])}`)
            .map(p => encodeURIComponent(p))
            .join(",");

        const urlString = `${url.toString()}&osm_ids=${waypoints}`;

        if (waypoints.length === 0)
        {
            // Well this shouldn't have happened...
            // TODO: Will this ever happen?
            throw new Error("Bad chunk when looking up many places in Nominatim");
        }

        (await makeNominatimApiRequest(urlString)).forEach(x => results.push(parseNominatimLookupResult(x)));
    }

    return results;
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
 * @author Anthony Webster
 */
export const nominatimSearch = async (query) =>
{
    query = parseNonEmptyString(query, "Search query");
    const url = getNominatimApiUrl(NOMINATIM_API_SEARCH_ENDPOINT);
    url.searchParams.append("q", query);
    url.searchParams.append("format", "jsonv2");
    const data = await makeNominatimApiRequest(url.toString());
    return await nominatimLookupMany(data.map(r => [r.osm_type, r.osm_id]));
};

/**
 * Compute the number of miles between each degree of longitude at a given latitude.
 *
 * @param {number} latitudeDegrees The latitude in degrees
 * @returns {!number} The distance, in miles, between each degree of longitude at the given latitude.
 * @author Anthony Webster
 */
const milesBetweenDegreeOfLongitudeAtLatitude = (latitudeDegrees) =>
{
    const milesPerDegreeOfLongitudeAtEquator = 69.17;
    return Math.cos(degreesToRadians(latitudeDegrees)) * milesPerDegreeOfLongitudeAtEquator;
};

/**
 * Computes the bounding box that approximately encompasses the given search radius.
 *
 * @param {number} currentLatitude The latitude of the center of the search area.
 * @param {number} currentLongitude The longitude of the center of the search area.
 * @param {number} searchRadius The search radius, in miles.
 * @returns {{x1: number, y1: number, x2: number, y2: number}} A set of coordinates with the first being
 * the top left corner and the second being the bottom right.
 * @author Anthony Webster
 */
const computeBoundingBox = (currentLatitude, currentLongitude, searchRadius) =>
{
    // TODO: What happens if the search radius passes 90deg latitude?

    // We will increase the search radius by 1 to account for any floating point garbage and the fact
    // that the haversine formula isn't perfect for oblate spheroids like our beautiful home, Earth.
    // If anything falls outside the radius after this, then we can be quite sure that that place isn't
    // one that should be considered.
    // This doesn't work great when the radius is small (only a couple of miles), but it can make a
    // difference on a larger scale. For example, if you're traveling 15 miles, an extra mile isn't
    // going to be very different in the grand scheme of things.
    // This does have the somewhat weird edge case of when a place spans multiple miles. Then things
    // depend on where the coordinates for a place lands. For right now, we'll just consider that to
    // be user error :)
    // TODO: FUTURE: Handle places that span multiple miles.

    // I did some testing. The correct distances vary by location (because Earth's radius is different
    // everywhere in the world). And there's no perfect formula to do this calculation because Earth
    // is anything but constant (and even weather and climate changes things....). My tests were definitely
    // not perfect because they worked in a straight line and not in a radius, but hopefully these
    // estimations help make things slightly more accurate. All actual numbers are according to Wolfram Alpha.
    //
    // Here is a summary of some differences when moving generally southwest from NJ:
    // | Distance               | Approximate difference between haversine and actual distance |
    // | ---------------------- | ------------------------------------------------------------ |
    // | [0, 12.2] miles        | [0, 0.028] miles ~= [0, 148] feet                            |
    // | (12.2, 24.6] miles     | (0.028, 0.07] miles ~= (148, 370] feet                       |
    // | (24.6, 39.5] miles     | (0.07, 0.125] miles ~= (370, 660] feet                       |
    // | (39.5, 56.46] miles    | (0.125, 0.163] miles ~= (660, 861] feet                      |
    // | (56.46, 104.2] miles   | (0.163, 0.253] miles ~= (861, 1336] feet                     |
    // | (104.2, 168.3] miles   | (0.253, 0.411] miles ~= (1336, 2170] feet                    |
    // | (168.3, 196.1] miles   | (0.411, 0.548] miles ~= (2170, 2893] feet                    |
    // | > 196.1 miles          | > 0.548 miles ~= > 2893 feet                                 |
    //
    // Luckily, the formula is actually not to wildly inaccurate - it's always within a mile or so
    // for "reasonable" distances. Remember though that these distances are based on a small subset
    // of possible points within a given radius, so the difference could be larger or smaller. This
    // error is reflected below when we change the search radius.

    if (searchRadius > 200)
    {
        // > 200 mile radius could have significant error. Consider +/- 2 miles.
        searchRadius += 2;
    }
    else if (searchRadius > 100)
    {
        // Between 100 and 200 miles is more accurate, but we'll call it a mile of wiggle room.
        searchRadius += 1;
    }
    else if (searchRadius > 50)
    {
        searchRadius += 0.5;
    }
    else if (searchRadius > 25)
    {
        searchRadius += 0.25;
    }
    else if (searchRadius > 10)
    {
        searchRadius += 0.1;
    }
    else
    {
        // If the search radius is smaller than 10 miles, the calculated distances will probably be
        // good enough. We'll add just a little bit to account for any other errors (such as floating
        // point error, different anchor point for a place, etc.)
        searchRadius += 0.02;  // About 150 feet
    }

    // const halfRadius = searchRadius / 2.0;  // miles
    searchRadius /= 2.0;

    // Unlike longitude, latitude lines are parallel and are (essentially) always the same distance apart.
    const milesPerDegreeOfLatitude = 69.0;  // mi/deg
    const milesPerLongitude = milesBetweenDegreeOfLongitudeAtLatitude(currentLatitude);  // mi/deg

    // Compute how many degrees we need to move
    // (mi/deg) * (1/mi) = 1/deg
    // ^-1 = deg

    // Have miles and current location (in deg)
    // Have miles/deg
    const longitudeDegPerMile = 1 / milesPerLongitude;
    const latitudeDegPerMile = 1 / milesPerDegreeOfLatitude;

    // TODO: Wrap on overflow
    return {
        // Pair 1 will be the top left corner
        x1: currentLatitude + (latitudeDegPerMile * searchRadius),
        y1: currentLongitude < 0 ? currentLongitude - (longitudeDegPerMile * searchRadius) : currentLongitude + (longitudeDegPerMile * searchRadius),
        // Pair 2 will be the bottom right corner
        x2: currentLatitude - (latitudeDegPerMile * searchRadius),
        y2: currentLongitude < 0 ? currentLongitude + (longitudeDegPerMile * searchRadius) : currentLongitude - (longitudeDegPerMile * searchRadius)
    };
};

/**
 * Searches the Nominatim database with the given query within a given radius from a given point.
 *
 * @param query The query to search Nominatim.
 * @param {number} currentLatitude The latitude of the current location.
 * @param {number} currentLongitude The longitude of the current location.
 * @param {number} searchRadius The maximum radius to search for results in miles.
 * @returns {Promise<NominatimPlaceData[]>} An array of search results from Nominatim.
 */
export const nominatimSearchWithin = async (query, currentLatitude, currentLongitude, searchRadius) =>
{
    // TODO: Check that latitude and longitude fall within an acceptable range.

    query = parseNonEmptyString(query, "Search query");
    assertTypeIs(currentLatitude, "number", "current latitude");
    assertTypeIs(currentLongitude, "number", "current longitude");
    assertTypeIs(searchRadius, "number", "search radius");

    if (searchRadius < 0)
    {
        throw new Error("Search radius cannot be negative");
    }

    // 0.01 miles is just about 50 feet. Therefore, rounding to two places should be more than
    // enough for all practical purposes.
    searchRadius = roundTo(searchRadius, 2);
    if (searchRadius === 0)
    {
        return [];
    }

    const searchArea = computeBoundingBox(currentLatitude, currentLongitude, searchRadius);

    const placesToLookup = [];
    const placeIdsToExclude = [];

    // We'll do this search up to 10 times. Prevents us from "over-searching" but is also a reasonable
    // number of times to search. Why 10? Seemed like a good number, that's all.
    // However, we'll go a little extra if we still don't have any nearby results.
    for (let i = 0; i < 2 || (placesToLookup.length === 0 && i < 4); i++)
    {
        const url = getNominatimApiUrl(NOMINATIM_API_SEARCH_ENDPOINT);

        // We only really need place IDs, OSM type, OSM ID, and latitude/longitude. Don't include any
        // extra address info and whatever - we'll get that when we do the lookup.
        url.searchParams.append("q", query);

        // From Nominatim:
        // > Cannot be more than 40. Nominatim may decide to return less results than
        // > given, if additional results do not sufficiently match the query.
        //
        // Explicitly limiting to 40 does, in fact, limit us to 40. However, it overrides any default limit
        // there may be so we can get back the biggest set of results at a time.
        url.searchParams.append("limit", "40");

        // Enable deduplication to avoid getting parts of the same place
        url.searchParams.append("dedupe", "1");

        // Only results in the US
        url.searchParams.append("countrycodes", "us");

        // Keep results in search area
        // url.searchParams.append("bounded", "1");

        url.searchParams.append("accept-language", "en");
        url.searchParams.append("format", "jsonv2");
        url.searchParams.append("email", `jeff${Math.floor(Math.random() * 100000)}@example.com`);

        let urlString = url.toString();

        urlString += `&viewbox=${encodeURIComponent(searchArea.x1)},${encodeURIComponent(searchArea.y1)},${encodeURIComponent(searchArea.x2)},${encodeURIComponent(searchArea.y2)}`;

        if (placeIdsToExclude.length > 0)
        {
            // We explicitly need commas here. Encoding after joining escapes the commas.
            const toExclude = placeIdsToExclude.map(i => encodeURIComponent(i)).join(",");
            urlString = `${urlString}&exclude_place_ids=${toExclude}`;
        }

        console.log("URL: ", urlString);
        const data = await makeNominatimApiRequest(urlString);

        // If at any point we don't get any results back, then break.
        if (data.length === 0)
        {
            break;
        }

        // Exclude current search results from next query and record the places we need to lookup.
        data.forEach(d =>
        {
            placeIdsToExclude.push(d.place_id.toString());
            placesToLookup.push([d.osm_type, d.osm_id]);
        });
    }

    return await nominatimLookupMany(placesToLookup);
};

