import {MongoClient, Db} from 'mongodb';
import {mongoConfig} from './settings.js';

// For getting proper types in JSDoc
import mongoPackage from 'mongodb';
const {Collection, Document} = mongoPackage;

/**
 *
 * @type {MongoClient}
 * @private
 */
let _connection = undefined;

/**
 *
 * @type {Db}
 * @private
 */
let _db = undefined;

/**
 *
 * @returns {Promise<Db>}
 */
const dbConnection = async () =>
{
    if (!_connection)
    {
        _connection = await MongoClient.connect(mongoConfig.serverUrl);
        _db = _connection.db(mongoConfig.database);
    }

    return _db;
};

/**
 *
 * @returns {Promise<void>}
 */
export const dropDatabase = async () =>
{
    const db = await dbConnection();
    await db.dropDatabase();
};


/**
 *
 * @returns {Promise<void>}
 */
const closeConnection = async () =>
{
    await _connection.close();
};

export {dbConnection, closeConnection};