import express from "express";
import express_handlebars from "express-handlebars";
import configRoutes from "./routes/index.js";
import { connectToDatabase } from "./config/mongoConnection.js";
import exphbs from "express-handlebars";
import session from "express-session";
// import { configDotenv } from "dotenv";
import path from "path";

// // Load environment as early as possible
// configDotenv({ path: "./.env" });

const app = express();

app.use("/public", express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.engine("handlebars", express_handlebars.engine({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

app.engine("handlebars", exphbs.engine({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

app.use(express.urlencoded({ extended: true }));
app.use("/public", express.static("public"));

app.use(
    session({
        name: "AuthenticationState",
        secret: "she se on my cret til i-",
        resave: false,
        saveUninitialized: false,
    })
);

const redirectHome = (req, res, next) => {
    if (req.session.user) {
        res.redirect("/");
    } else {
        next();
    }
};

const redirectLogin = (req, res, next) => {
    if (!req.session.user) {
        res.redirect("/login");
    } else {
        next();
    }
};

app.use("/", (req, res, next) => {
    console.log("Current Timestamp: " + new Date().toUTCString());
    console.log("Request Method: " + req.method);
    console.log("Request Route: " + req.originalUrl);
    let authUser = false;
    if (req.session.user !== undefined && req.session.user !== null) {
        authUser = true;
    }
    console.log("Authenticated User: " + authUser);
    next();
});

app.use("/login", redirectHome);

app.use("/register", redirectHome);

app.use("/logout", redirectLogin);

app.use("/place/:id/addReview", redirectLogin);
app.use("/place/:id/addComment", redirectLogin);
//TODO add like and dislike handling

configRoutes(app);

connectToDatabase()
    .then((_r) => {
        const port = 3000;
        app.listen(port, () => {
            console.log(`Server listening on port ${port}`);
        });
    })
    .catch((e) => {
        console.log(e);
    });
