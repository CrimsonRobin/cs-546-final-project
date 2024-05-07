import { DateTime } from "luxon";
import { ObjectId } from "mongodb";
import {
    DISABILITY_CATEGORY_NEURODIVERGENT,
    DISABILITY_CATEGORY_PHYSICAL,
    DISABILITY_CATEGORY_SENSORY,
} from "./data/places.js";

/**
 * Test if the given object is null or undefined.
 *
 * @param {any} x The object to test.
 * @returns {boolean} True if the given object is null or undefined, false otherwise.
 * @author Anthony Webster
 */
export const isNullOrUndefined = (x) => {
    return x === null || x === undefined;
};

/**
 * Ensures that {@linkcode s} is a non-empty string or returns the given default value.
 *
 * @param {any} s The string to test. Leading and trailing whitespace is ignored.
 * @param {string} defaultVal The default value to be used if `s` is not a string or is an empty string.
 * @returns {string} The trimmed value of `s` or `defaultVal` if `s` is empty or not a string.
 * @author Anthony Webster
 */
const nonEmptyStringOrDefault = (s, defaultVal) => {
    if (isNullOrUndefined(s) || typeof s !== "string") {
        return defaultVal;
    }

    // I'm on the fence about if we should return the trimmed value here or not.
    s = s.trim();
    return s.length === 0 ? defaultVal : s;
};

/**
 * Assert that the given object is of a certain type.
 *
 * @param {*} obj The object to test
 * @param {('undefined'|'object'|'boolean'|'number'|'bigint'|'string'|'symbol'|'function'|'array')} type
 *        Expected type of the object
 * @param paramName The name of the parameter
 * @author Anthony Webster
 */
export const assertTypeIs = (obj, type, paramName = undefined) => {
    throwIfNullOrUndefined(type);
    paramName = nonEmptyStringOrDefault(paramName, "Parameter");
    switch (type) {
        // All things that `typeof` can return
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof
        case "undefined":
        case "object":
        case "boolean":
        case "number":
        case "bigint":
        case "string":
        case "symbol":
        case "function":
        case "array":
            break;
        default:
            throw new Error(`Invalid value ${type} for parameter type`);
    }

    // Bizarre, but it works.
    const typeEquals = (obj) => {
        return type === "array" ? Array.isArray(obj) : typeof obj === type;
    };

    if (!typeEquals(obj)) {
        throw new Error(`Expected object of type ${type} for parameter ${paramName}, got ${typeof obj}`);
    }
};

/**
 * Throws an exception if the given object is null or undefined.
 *
 * @param {any} x The object to test.
 * @param {string|undefined} paramName The name of the parameter.
 * @author Anthony Webster
 */
export const throwIfNullOrUndefined = (x, paramName = undefined) => {
    nonEmptyStringOrDefault(paramName, "Parameter");

    if (x === null) {
        throw new Error(`${paramName} is null`);
    }

    if (x === undefined) {
        throw new Error(`${paramName} is undefined`);
    }
};

/**
 * Throws an exception if the given string is null, undefined, or not a string.
 *
 * @param {any} x The string to test.
 * @param {string|undefined} paramName The name of the parameter.
 * @throws {Error} If the given string is null, undefined, or not a string.
 * @author Anthony Webster
 */
export const throwIfNotString = (x, paramName = undefined) => {
    throwIfNullOrUndefined(x, paramName);
    if (typeof x !== "string") {
        throw new Error(`Expected type string for ${paramName}, got ${typeof x}`);
    }
};

/**
 * Parses a non-empty string, removing leading and trailing whitespace.
 *
 * @param {any} s The string to parse.
 * @param {string|undefined} paramName The name of the parameter.
 * @returns {string} The trimmed string to parse.
 * @throws {Error} If the given string to parse is null, undefined, or not a string, or if the trimmed version of
 * the given string is empty.
 * @author Anthony Webster
 */
export const parseNonEmptyString = (s, paramName = undefined) => {
    paramName = nonEmptyStringOrDefault(paramName, "String");
    throwIfNullOrUndefined(s, paramName);
    throwIfNotString(s, paramName);

    s = s.trim();

    if (s.length === 0) {
        throw new Error(`Expected non-empty string for ${paramName}`);
    }

    return s;
};

/**
 * Parses a date with the given format.
 * @param {string} str The date to parse as a string.
 * @param {string} format The expected date format.
 * @param {string|undefined} paramName The name of the parameter.
 * @returns {DateTime} The parsed date.
 * @throws {Error} If any of the following happen:
 * - The date to parse is null, undefined, or not a string;
 * - The format is null, undefined, or not a string;
 * - The date to parse is malformed.
 * @author Anthony Webster
 */
export const parseDate = (str, format, paramName = undefined) => {
    throwIfNullOrUndefined(format, "Format");
    throwIfNotString(format, "Format");
    throwIfNotString(str, paramName);
    str = parseNonEmptyString(str, paramName);
    const parsed = DateTime.fromFormat(str, format);
    if (!parsed.isValid) {
        throw new Error(`Malformed date: ${parsed.invalidReason}; ${parsed.invalidExplanation}`);
    }
    return parsed;
};

/**
 * Parses an object ID, ignoring leading and trailing whitespace.
 *
 * The object ID is not converted into an {@link ObjectId} object.
 *
 * @param {string} id The object ID to parse, as a string.
 * @param {string|undefined} paramName The name of the parameter.
 * @returns {string} The parsed object ID.
 * @throws {Error} If any of the following happen:
 * - The object ID is null, undefined, or not a string;
 * - The object ID is an empty string or contains only whitespace;
 * - The object ID is not a valid object ID, as determined by {@link ObjectId#isValid}.
 *
 * @author Anthony Webster
 */
export const parseObjectId = (id, paramName = undefined) => {
    paramName = nonEmptyStringOrDefault(paramName, "id");
    id = parseNonEmptyString(id, paramName);
    if (!ObjectId.isValid(id)) {
        throw new Error(`${paramName} is not a valid object id`);
    }
    return id;
};

/**
 * Tests if the given number is positive or negative infinity.
 *
 * @param {number} n The number to test.
 * @returns {boolean} True if the number is positive infinity or negative infinity; otherwise, false.
 * @author Anthony Webster.
 */
export const isInfinity = (n) => {
    // From my previous work in lab 4
    return !isNullOrUndefined(n) && typeof n === "number" && (n === Infinity || n === -Infinity);
};

/**
 * Throws an exception if the given number is NaN.
 *
 * @param {number} n The number to test.
 * @param {string|undefined} paramName The name of the parameter.
 * @throws {Error} If the given number is NaN.
 * @author Anthony Webster
 */
export const assertIsNotNaN = (n, paramName = undefined) => {
    paramName = nonEmptyStringOrDefault(paramName, "Parameter");
    if (Number.isNaN(n)) {
        throw new Error(`${paramName} must not be NaN`);
    }
};

/**
 * Throws an exception if the give number is positive infinity or negative infinity.
 *
 * @param {number} n The number to test.
 * @param {string|undefined} paramName The name of the parameter.
 * @throws {Error} If the given number is positive infinity or negative infinity.
 */
export const assertIsNotInfinity = (n, paramName = undefined) => {
    paramName = nonEmptyStringOrDefault(paramName, "Parameter");
    if (isInfinity(n)) {
        throw new Error(`${paramName} must not be +-Infinity`);
    }
};

/**
 * Asserts that the given number is an integer as determined by {@linkcode Number.isSafeInteger}.
 *
 * @param {number} n The number to test.
 * @param {string|undefined} paramName The name of the parameter.
 * @throws {Error} If any of the following happen:
 * - The number is null, undefined, or not a number;
 * - The number is infinity;
 * - The number is NaN;
 * - The number is not integral.
 *
 * @author Anthony Webster
 */
export const assertIsInteger = (n, paramName = undefined) => {
    paramName = nonEmptyStringOrDefault(paramName, "Number");
    assertTypeIs(n, "number", paramName);
    assertIsNotInfinity(n, paramName);
    assertIsNotNaN(n, paramName);
    if (!Number.isSafeInteger(n)) {
        throw new Error(`${paramName} must be an integer`);
    }
};

/**
 * Rounds a number to the given number of places.
 * @param {number} n The number to round.
 * @param {number} places The number of decimal places to round the number to.
 * @returns {number} The number rounded to the given number of places.
 * @throws {Error} If any of the following happen:
 * - The number to round is null, undefined, or not of type number;
 * - The number of places to round to is null, undefined, or not of type number;
 * - The number of places to round to is not an integer (as determined by {@linkcode Number.isSafeInteger});
 * - The number to round is NaN or infinity;
 * - The number of places to round to is negative.
 *
 * @author Anthony Webster
 */
export const roundTo = (n, places = 0) => {
    assertTypeIs(n, "number", "Places");
    assertIsInteger(places, "Places");

    if (Number.isNaN(n)) {
        throw new Error("Cannot round NaN");
    }

    if (isInfinity(n)) {
        throw new Error("Cannot round infinity");
    }

    if (places < 0) {
        throw new Error("Places must be greater than or equal to zero");
    }
    // Adapted from <https://stackoverflow.com/a/11832950>
    places = Math.pow(10, places);
    return Math.round((n + Number.EPSILON) * places) / places;
};

/**
 * Extracts the only element from the given array.
 *
 * If the array is empty, has more than one element, or is not an array, this method throws an exception.
 *
 * @template T
 * @param {T[]} arr The array to extract the element from.
 * @param {string} paramName The name of the parameter (used in exception messages).
 * @returns {T} The element at index zero of the given array.
 * @author Anthony Webster
 */
export const exactlyOneElement = (arr, paramName = "array") => {
    paramName = nonEmptyStringOrDefault(paramName, "array");
    assertTypeIs(arr, "array", paramName);
    if (arr.length !== 1) {
        throw new Error(`Expected exactly one element for ${paramName} but got ${arr.length}`);
    }
    return arr[0];
};

/**
 * Converts degrees to radians.
 *
 * @param {!number} degrees The degrees to convert to radians.
 * @returns {!number} The given degrees converted to radians.
 * @author Anthony Webster
 */
export const degreesToRadians = (degrees) => {
    assertTypeIs(degrees, "number", "degrees");
    return degrees * (Math.PI / 180.0);
};

/**
 * Computes the haversine of the given angle.
 *
 * @param {!number} theta The angle in radians.
 * @returns {!number} The haversine of the given angle.
 * @author Anthony Webster
 */
export const haversin = (theta) => {
    assertTypeIs(theta, "number", "angle");
    const s = Math.sin(theta / 2.0);
    return s * s;
};

/**
 * Test if the given object is a number and not NaN.
 *
 * @param x {any} The object to test.
 * @returns {boolean} True if `x` is not null, not undefined, not NaN, and its type is `number`;
 *                    otherwise, false.
 * @author Anthony Webster
 */
export const isNumber = (x) => {
    return !isNullOrUndefined(x) && typeof x === "number" && !Number.isNaN(x);
};

/**
 * Parse an object to a number (either integral or floating-point).
 *
 * @param {*} str The object to parse. If it's already of type `Number` and is not NaN, then no parsing is
 *                done and `str` is returned as-is.
 * @param {boolean} [trim = false] Indicates if leading and trailing whitespace should be trimmed before
 *                                 parsing.
 * @returns {number} The parsed value, as a number.
 * @throws {Error} If `str` is not a number, not a string, undefined, null, NaN, or if it cannot be
 *                 otherwise parsed to a number.
 * @author Anthony Webster
 */
export const parseNumber = (str, trim = false) => {
    // Normal languages (not JS) don't let you parse garbage like "   56 " or "45qwerty" into an int.
    // This function restores this NORMAL functionality that already should exist in JS.

    if (str === undefined) {
        throw new Error("Cannot convert undefined to a number");
    }
    if (str === null) {
        throw new Error("Cannot convert null to a number");
    }
    if (Number.isNaN(str)) {
        throw new Error("Cannot convert NaN to a number");
    }
    if (isNumber(str)) {
        // If we got a number, then we're in luck. No need to actually parse anything.
        return str;
    }
    if (typeof str !== "string") {
        throw new Error(`Cannot parse object of type ${typeof str} to number`);
    }

    if (isNullOrUndefined(trim)) {
        trim = false;
    }

    if (typeof trim !== "boolean") {
        throw new Error("Value for trim must have type boolean");
    }

    if (trim) {
        str = str.trim();
    }

    // Yeah, I know this is probably not the best, but it'll do.
    const intRegex = /^([-+]?)([0-9]+)$/giu;
    const floatRegex = /^([-+]?)([0-9]+)\.([0-9]+)((e([-+]?)([0-9]+))?)$/giu;

    if (str.match(intRegex) || str.match(floatRegex)) {
        const parsed = parseFloat(str);

        // This should *never* be NaN, but we'll do a sanity check just in case. I am convinced that JS
        // function behavior changes based on the position of stars in the universe and quantum mechanics
        // or something ridiculous.
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
    }

    throw new Error("Cannot convert non-numeric value to a number");
};

/**
 * Parse a latitude value, asserting that it is in the correct range of latitude values.
 *
 * A positive latitude indicates north, negative indicates south.
 *
 * @param {number} latitude The latitude to parse
 * @returns {number} The parsed latitude
 * @author Anthony Webster
 */
export const parseLatitude = (latitude) => {
    assertTypeIs(latitude, "number", "latitude");
    if (latitude < -90 || latitude > 90) {
        throw new Error("Latitude must be between -90 and 90");
    }
    return latitude;
};

/**
 * Normalize a longitude value, wrapping around if it is greater than 180 or less than -180.
 *
 * A positive longitude indicates east, negative indicates west.
 *
 * @param {number} longitude The longitude to normalize.
 * @returns {number} The normalized longitude.
 * @author Anthony Webster
 */
export const normalizeLongitude = (longitude) => {
    assertTypeIs(longitude, "number", "Longitude");
    if (isInfinity(longitude) || Number.isNaN(longitude)) {
        throw new Error(`Invalid longitude ${longitude}`);
    }

    const sign = longitude < 0 ? -1 : 1;
    longitude = Math.abs(longitude);

    // This isn't a great way to do this, but it'll work.
    while (longitude > 180) {
        longitude -= 360;
    }

    return longitude * sign;
};

/**
 * Sleep for the given number of milliseconds.
 *
 * @param milliseconds The number of milliseconds to sleep for.
 * @returns {Promise<any>}
 * @author Anthony Webster
 */
export const sleep = (milliseconds) => {
    assertTypeIs(milliseconds, "number", "milliseconds");
    if (milliseconds <= 0) {
        return Promise.resolve();
    }
    return new Promise((r) => setTimeout(r, milliseconds));
};

/**
 * Calls the given function and returns its result or adds a thrown exception to the given array of errors.
 *
 * @template T
 * @param {Error[]} errors The array of errors that any errors should be added to.
 * @param {function():T} func The function to call.
 * @returns {T|undefined} The result of calling the function or undefined if the function call threw an error.
 * @author Anthony Webster
 */
export const tryCatchChain = (errors, func) => {
    try {
        return func();
    } catch (e) {
        errors.push(e);
        return undefined;
    }
};

/**
 * Parses a string and checks that its length falls between the given bounds.
 *
 * @param {string} s The string to parse.
 * @param {number} minLength The minimum length requirement for the string.
 * @param {number} maxLength The maximum length requirement for the string.
 * @param {boolean} trim Indicates if the string should be trimmed before testing its length.
 * @param {string|undefined} paramName The name of the parameter.
 * @returns {string} The parsed string.
 * @throws {Error} If any of the following happen:
 * - The string to parse is null, undefined, or not a string;
 * - The minimum length is not an integer or is negative;
 * - The maximum length is not an integer or is negative;
 * - The minimum length is greater than the maximum length;
 * - `trim` is not a boolean.
 *
 * @author Anthony Webster
 */
export const parseStringWithLengthBounds = (s, minLength, maxLength, trim = true, paramName = undefined) => {
    paramName = nonEmptyStringOrDefault(paramName, "String");
    throwIfNotString(s, paramName);
    assertTypeIs(trim, "boolean", "trim");
    assertIsInteger(minLength, "Minimum length");
    assertIsInteger(maxLength, "Maximum length");

    if (minLength > maxLength) {
        throw new Error("Minimum length cannot be greater than maximum length");
    }
    if (trim) {
        s = s.trim();
    }
    if (s.length < minLength) {
        throw new Error(`${paramName} must be at least ${minLength} characters`);
    }
    if (s.length > maxLength) {
        throw new Error(`${paramName} cannot be more than ${maxLength} characters`);
    }
    return s;
};

/**
 * The minimum length of a password.
 * @type {number}
 */
export const PASSWORD_MINIMUM_LENGTH = 8;

/**
 * The maximum length of a password.
 * @type {number}
 */
export const PASSWORD_MAXIMUM_LENGTH = 256;

/**
 * Parses a password.
 *
 * @param {string} password The password to parse.
 * @returns {string} The parsed password.
 * @throws {Error} If any of the following happen:
 * - The given password is null, undefined, or not a string;
 * - The length of the password does not fall between {@linkcode PASSWORD_MINIMUM_LENGTH} and {@linkcode PASSWORD_MAXIMUM_LENGTH};
 * - The password does not contain a lowercase letter;
 * - The password does not contain an uppercase letter;
 * - The password does not contain an ASCII digit;
 * - The password does not contain a special character (anything matching the regex `[^a-zA-Z0-9]`).
 *
 * @author Samuel Miller, Anthony Webster
 */
export const parsePassword = (password) => {
    throwIfNotString(password, "Password");

    password = parseStringWithLengthBounds(
        password,
        PASSWORD_MINIMUM_LENGTH,
        PASSWORD_MAXIMUM_LENGTH,
        false,
        "Password"
    );

    if (!/[a-z]/.test(password)) {
        throw new Error("Password requires at least one lowercase character");
    }
    if (!/[A-Z]/.test(password)) {
        throw new Error("Password requires at least one uppercase character");
    }
    if (!/[0-9]/.test(password)) {
        throw new Error("Password requires at least one number");
    }
    if (/[^a-zA-Z0-9]/.test(password)) {
        throw new Error("Password requires at least one special character");
    }

    return password;
};

/**
 * Validates a checkbox.
 * @param {string} checkbox The checkbox to validate.
 * @returns {string} The checkbox.
 * @throws {Error} if the checkbox is not undefined or set to "on"
 *
 * @author Samuel Miller
 */
export const validCheckbox = (checkbox, paramName = undefined) => {
    if (checkbox === undefined || checkbox === "on") {
        return checkbox;
    } else {
        throw new Error(`Invalid value for checkbox: ${paramName}`);
    }
};

export const containsDuplicates = (array) => {
    assertTypeIs(array, "array", "array");
    return new Set(array).size !== array.length;
};

/**
 * Parse a list of categories.
 *
 * @param {({categoryName: string, rating: number})[]} categories The list of categories to parse.
 * @returns {({categoryName: string, rating: number})[]} The parsed comments.
 * @author Amanda Merino, Anthony Webster
 */
export const parseCategories = (categories) => {
    throwIfNullOrUndefined(categories, "categories");
    assertTypeIs(categories, "array", "categories");
    if (categories.length < 1) {
        throw new Error(`Categories are must have at least 1 entry.`);
    }

    //all entries are strings and all entries in array are valid categories
    let validCategories = [
        DISABILITY_CATEGORY_PHYSICAL,
        DISABILITY_CATEGORY_NEURODIVERGENT,
        DISABILITY_CATEGORY_SENSORY,
    ];
    for (const category of categories) {
        assertTypeIs(category, "object", "category");
        category.categoryName = parseNonEmptyString(category.categoryName, "category name").toLowerCase();
        assertTypeIs(category.rating, "number", "category rating");
        if (category.rating < 1 || category.rating > 5) {
            throw new Error(`Invalid input for rating: must be 1-5`);
        }
        if (!validCategories.some((c) => c === category.categoryName)) {
            throw new Error(`Category names must be one of the following: ${validCategories.join(", ")}.`);
        }
        category.rating = roundTo(category.rating, 1);
    }
    return removeDuplicates(categories);
};

/**
 * Removes duplicate elements from the array.
 *
 * @template T
 * @param {T[]} array The array.
 * @returns {T[]} The array with duplicates removed.
 * @author Anthony Webster
 */
export const removeDuplicates = (array) => {
    assertTypeIs(array, "array", "array");
    const seen = [];
    for (const e of array) {
        if (!seen.some((s) => s === e)) {
            seen.push(e);
        }
    }
    return seen;
};

/**
 * Parse a list of categories.
 *
 * @param {({qualification: string})[]} qualifications The list of categories to parse.
 * @returns {({qualification: string})[]} The parsed comments.
 * @author Chris Kang
 */
export const parseQualifications = (qualifications) => {
    throwIfNullOrUndefined(qualifications, "qualifications");
    assertTypeIs(qualifications, "array", "qualifications");
    if (qualifications.length < 1) {
        throw new Error(`qualifications are must have at least 1 entry.`);
    }

    //all entries are strings and all entries in array are valid categories
    let validQualifications = [
        DISABILITY_CATEGORY_PHYSICAL,
        DISABILITY_CATEGORY_NEURODIVERGENT,
        DISABILITY_CATEGORY_SENSORY,
    ];
    for (const qualification of qualifications) {
        parseNonEmptyString(qualification, "qualification");
        if (!(qualification in validQualifications)) {
            throw new Error(`Invalid qualification "${qualification}"`);
        }
    }
    return removeDuplicates(qualifications);
};

/**
 * The minimum length of a username.
 * @type {!number}
 * @author Anthony Webster
 */
export const USERNAME_MINIMUM_LENGTH = 3;

/**
 * The maximum length of a username.
 * @type {!number}
 * @author Anthony Webster
 */
export const USERNAME_MAXIMUM_LENGTH = 25;

/**
 * Parses a username.
 * @param {string} username
 * @returns {string} Parses a username.
 * @author Anthony Webster
 */
export const parseUsername = (username) =>
{
    username = parseStringWithLengthBounds(username, USERNAME_MINIMUM_LENGTH, USERNAME_MAXIMUM_LENGTH, true, "username");

    if (/[^a-z0-9]/ig.test(username))
    {
        throw new Error("Username can only contain alphanumeric characters");
    }

    return username;
};
