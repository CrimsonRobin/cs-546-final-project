import {connect, connection} from "mongoose";
import {getMongoConfig} from "./settings.js";

/**
 * Connects to the database.
 *
 * @returns A database connection.
 */
export const connectToDatabase = async () =>
{
    const {database, serverUrl} = getMongoConfig();
    return await connect(`${serverUrl}/${database}`)
};

export const closeDatabaseConnection = async () =>
{
    await connection.close();
}
