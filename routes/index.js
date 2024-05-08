// This file will import both route files and export the constructor method as shown in the lecture code

import routes from "./routes.js";

const constructorMethod = (app) => {
    app.use("/", routes);

    app.use('*', (req, res) => {
        return res.status(404).render("error", {
            title: "Not Found", error: "Page Not Found.",
            user: req.session ? req.session.user : undefined
        });
    });
};

export default constructorMethod;