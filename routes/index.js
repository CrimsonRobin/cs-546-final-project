// This file will import both route files and export the constructor method as shown in the lecture code

import routes from "./routes.js";

const constructorMethod = (app) =>
{
    app.use("/", routes);

    app.use('*', (req, res) =>
    {
        return res.status(404).json({error: "Not found"});
    });
};

export default constructorMethod;