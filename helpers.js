// You can add and export any helper functions you want here - if you aren't using any, then you can just leave this file as is

import {DateTime} from "luxon";
import {ObjectId} from "mongodb";

export const isNullOrUndefined = (x) =>
{
    return x === null || x === undefined;
};

const nonEmptyStringOrDefault = (s, defaultVal) =>
{
    if (isNullOrUndefined(s) || typeof s !== "string")
    {
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
 */
export const assertTypeIs = (obj, type, paramName = undefined) =>
{
    throwIfNullOrUndefined(type);
    paramName = nonEmptyStringOrDefault(paramName, "Parameter");
    switch (type)
    {
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
    const typeEquals = (obj) =>
    {
        return type === "array" ? Array.isArray(obj) : typeof obj === type;
    }

    if (!typeEquals(obj))
    {
        throw new Error(`Expected object of type ${type} for parameter ${paramName}, got ${typeof obj}`);
    }
}

export const throwIfNullOrUndefined = (x, paramName = undefined) =>
{
    nonEmptyStringOrDefault(paramName, "Parameter");

    if (x === null)
    {
        throw new Error(`${paramName} is null`);
    }

    if (x === undefined)
    {
        throw new Error(`${paramName} is undefined`);
    }
};

export const throwIfNotString = (x, paramName = undefined) =>
{
    throwIfNullOrUndefined(x, paramName);
    if (typeof x !== "string")
    {
        throw new Error(`Expected type string for ${paramName}, got ${typeof x}`);
    }
};

export const parseNonEmptyString = (s, paramName = undefined) =>
{
    paramName = nonEmptyStringOrDefault(paramName, "String");
    throwIfNullOrUndefined(s, paramName);
    throwIfNotString(s, paramName);

    s = s.trim();

    if (s.length === 0)
    {
        throw new Error(`Expected non-empty string for ${paramName}`);
    }

    return s;
};

export const parseDate = (str, format, paramName = undefined) =>
{
    throwIfNullOrUndefined(format, "Format");
    throwIfNotString(format, "Format");
    throwIfNotString(str, paramName);
    str = parseNonEmptyString(str, paramName);
    const parsed = DateTime.fromFormat(str, format);
    if (!parsed.isValid)
    {
        throw new Error(`Malformed date: ${parsed.invalidReason}; ${parsed.invalidExplanation}`);
    }
    return parsed;
};

export const parseObjectId = (id, paramName = undefined) =>
{
    paramName = nonEmptyStringOrDefault(paramName, "id");
    id = parseNonEmptyString(id, paramName);
    if (!ObjectId.isValid(id))
    {
        throw new Error(`${paramName} is not a valid object id`);
    }
    return id;
}

export const isInfinity = (n) =>
{
    // From my previous work in lab 4
    return !isNullOrUndefined(n) && typeof n === "number" && (n === Infinity || n === -Infinity);
};

export const assertIsNotNaN = (n, paramName = undefined) =>
{
    paramName = nonEmptyStringOrDefault(paramName, "Parameter");
    if (Number.isNaN(n))
    {
        throw new Error(`${paramName} must not be NaN`);
    }
}

export const assertIsNotInfinity = (n, paramName = undefined) =>
{
    paramName = nonEmptyStringOrDefault(paramName, "Parameter");
    if (isInfinity(n))
    {
        throw new Error(`${paramName} must not be +-Infinity`);
    }
}

export const roundTo = (n, places = 0) =>
{
    // From my previous work in lab 4
    throwIfNullOrUndefined(n, "n");
    throwIfNullOrUndefined(places, "Places");

    if (typeof n !== "number")
    {
        throw new Error(`Expected a number, got ${typeof n}`);
    }

    if (Number.isNaN(n))
    {
        throw new Error("Cannot round NaN");
    }

    if (isInfinity(n))
    {
        throw new Error("Cannot round infinity");
    }

    if (typeof places !== "number")
    {
        throw new Error(`Expected a number for places, got ${typeof places}`);
    }

    if (!Number.isSafeInteger(places))
    {
        throw new Error("Places must be an integer");
    }

    if (places < 0)
    {
        throw new Error("Places must be greater than or equal to zero");
    }

    places = Math.pow(10, places);

    return Math.floor(n * places) / places;
};

