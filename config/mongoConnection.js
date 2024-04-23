import {connect} from "mongoose";
import {mongoConfig} from "./settings.js";

/**
 * Connects to the database.
 *
 * @returns A database connection.
 */
export const connectToDatabase = async () =>
{
    return await connect(`${mongoConfig.serverUrl}/${mongoConfig.database}`)
};
