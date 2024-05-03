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

import exphbs from "express-handlebars";
import session from "express-session";

const app = express();

// Load environment as early as possible
configDotenv({ path: "./.env" });

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

app.use("/", (req, res, next) => {
	console.log("Current Timestamp: " + new Date().toUTCString());
	console.log("Request Method: " + req.method);
	console.log("Request Route: " + req.originalUrl);
	let authUser = false;
	if (req.session.user) {
		authUser = true;
	}
	console.log("Authenticated User: " + authUser);
	if (req.originalUrl !== "/") {
		next();
	}
});

app.use("/login", (req, res, next) => {
	if (req.session.user) {
		res.redirect("/");
	} else {
		next();
	}
});

app.use("/register", (req, res, next) => {
	if (req.session.user) {
		res.redirect("/");
	} else {
		next();
	}
});

app.use("/logout", (req, res, next) => {
	if (!req.session.user) {
		res.redirect("/login");
	} else {
		next();
	}
});

configRoutes(app);

const port = 3000;
app.listen(port, () => {
	console.log(`Server listening on port ${port}`);
});
