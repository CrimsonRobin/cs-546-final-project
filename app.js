// import express from "express";
// import configRoutes from "./routes/index.js";

// const app = express();
//
// app.use(express.json());
//
// configRoutes(app);
//
// const port = 3000;
// app.listen(port, () => {
//     console.log(`Server listening on port ${port}`);
// });

import * as db from "./config/database.js";
import {connectToDatabase} from "./config/mongoConnection.js";
import {configDotenv} from "dotenv";
import mongoose from "mongoose";

// Load environment as early as possible
configDotenv({path: "./.env"});


try
{
    console.log("Connecting to database");
    const conn = await connectToDatabase();
    console.log("Find all users");
    const users = await db.users.find({}).exec();
    console.log(users);
}
catch (e)
{
    console.error(e);
}

try
{
    await mongoose.connection.close();
}
catch (e)
{
    console.error(e);
}

