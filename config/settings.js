// You will need to change the DB name to match the required DB name in the assignment specs!

import {configDotenv} from "dotenv";

configDotenv({path: "../.env"});

export const mongoConfig = {
    serverUrl: `https://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}`,
    database: `${process.env.DATABASE_NAME}`
};
