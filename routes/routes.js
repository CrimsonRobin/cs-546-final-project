/* different paths
/user?id 
/login
/register
/about
/logout
/?searchquery 
/place?id 
/place/review?id
*/

import express from "express";
import {parseStringWithLengthBounds, tryCatchChain, parsePassword, validCheckbox, parseObjectId} from "../helpers.js";
import {getPlace, getReview} from "../data/places.js";
import {createUser, getUser, loginUser} from "../data/user.js";

const router = express.Router();
  
router.route('/register')
    .get(async (req, res) => {
        return res.render("register", {title: "Register"});
    })
    .post(async (req, res) => {
        //need to validate first name, last name, username, password, confirm password
        let errors = [];

        req.body.firstName = tryCatchChain(errors, () => parseStringWithLengthBounds(req.body.firstName, 1, 100, true, "First Name"));
        req.body.lastName = tryCatchChain(errors, () => parseStringWithLengthBounds(req.body.lastName, 1, 100, true, "Last Name"));
        req.body.username = tryCatchChain(errors, () => parseStringWithLengthBounds(req.body.username, 3, 25, true, "Username"));
        req.body.password = tryCatchChain(errors, () => parsePassword(req.body.password));
        req.body.confirmPassword = tryCatchChain(errors, () => parsePassword(req.body.confirmPassword));

        req.body.physical = tryCatchChain(errors, () => validCheckbox(req.body.physical, "Physical Checkbox"));
        req.body.sensory = tryCatchChain(errors, () => validCheckbox(req.body.sensory, "Sensory Checkbox"));
        req.body.neurodivergent = tryCatchChain(errors, () => validCheckbox(req.body.neurodivergent, "Neurodivergent Checkbox"));

        if(errors.length > 0) {
            return res.status(400).render("register", {title: "Register", errors: errors});
        }

        try {
            const userMade = await createUser(req.body.firstName, req.body.lastName, req.body.username, req.body.password, 
                req.body.physical, req.body.sensory, req.body.neurodivergent);

            if(userMade) {
                return res.redirect("/login"); 
            }
            else {
                //DB could be down
                return res.status(500).send("Internal Server Error");
            }
        } catch (error) {
            return res.status(400).render("register", {title: "Register", errors: error.message});
        }
    });
  
router.route('/login')
    .get(async (req, res) => {
        return res.render("login", {title: "Log In"});
    })
    .post(async (req, res) => {
        let errors = [];

        req.username = tryCatchChain(errors, () => parseStringWithLengthBounds(req.username, 3, 25, true, "Username"));
        req.password = tryCatchChain(errors, () => parsePassword(req.password));

        if(errors.length > 0) {
            return res.status(400).render("login", {title: "Log In", errors: errors});
        }

        try {
            const user = await loginUser(req.username, req.password);

            req.session.user = {firstName: user.firstname, lastName: user.lastname, username: user.username, 
                createdAt: user.createdAt, qualifications: user.qualifications};

            return res.redirect("/");
        } catch (error) {
            return res.status(400).render("login", {errors: error.message});
        }
    });

router.route('/logout')
    .get(async (req, res) => {
        req.session.destroy();
        return res.render("logout", {title: "Logged Out"});
    });

//TODO: For the rest of these functions, if req.session.user exists, pass it as the "user"
router.route('/')
    .get(async (req, res) => {
        return res.render("home", {title: "Home"});
    });

router.route('/api/search')
    .get(async (req, res) => {
        //TODO: Ajax Calls
    });

router.route('/api/changePassword')
    .get(async (req, res) => {

    })
    .post(async (req, res) => {

    });

router.route('/user/:id')
    .get(async (req, res) => {
        //TODO: Get User Object and pass it (including title)
        try {
            req.params.id = parseObjectId(req.params.id, "User Id");
            const user = await getUser(req.params.id);

            return res.render("userProfile", {title: "User Profile", user: user});
        } catch (error) {
            return res.status(404).render("error", {title: "User Not Found"});
        }
    });

router.route('/place/:id')
    .get(async (req, res) => {
        //TODO: Get Place Object and pass it (including title)
        try {
            req.params.id = parseObjectId(req.params.id, "Place Id");
            const place = await getPlace(req.params.id);

            return res.render("place", {title: "Place", place: place});
        } catch (error) {
            return res.status(404).render("error", {title: "Place Not Found", error: error.message});
        }
    });

router.route('/review/:id')
    .get(async (req, res) => {
        //TODO: Get Review Object and pass it (including title)
        try {
            req.params.id = parseObjectId(req.params.id, "Review Id");
            const review = getReview(req.params.id);

            return res.render("review", {title: "Review", review: review});
        } catch (error) {
            return res.status(404).render("error", {title: "Review Not Found", error: error.message});
        }
    });

router.route('/about')
    .get(async (req, res) => {
        return res.render("about", {title: "About"});
    });

export default router;