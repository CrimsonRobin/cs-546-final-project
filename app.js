// This file should set up the express server as shown in the lecture code

import express from "express";
import express_handlebars from "express-handlebars";
import configRoutes from "./routes/index.js";

const app = express();

app.use("/public", express.static("public"));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.engine("handlebars", express_handlebars.engine({defaultLayout: "main"}));
app.set("view engine", "handlebars");

configRoutes(app);

const port = 3000;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
