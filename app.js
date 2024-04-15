// This file should set up the express server as shown in the lecture code

import express from "express";
import configRoutes from "./routes/index.js";

const app = express();

app.use(express.json());

configRoutes(app);

const port = 3000;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
