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
import {parseStringWithLengthBounds, tryCatchChain, parsePassword, validCheckbox} from "../helpers.js";

const router = express.Router();
  
router.route('/register')
    .get(async (req, res) => {
        return res.render("register", {title: "Register"});
    })
    .post(async (req, res) => {
        //need to validate first name, last name, username, password, confirm password
        let errors = [];

        req.firstName = tryCatchChain(errors, () => parseStringWithLengthBounds(req.firstName, 1, 100, true, "First Name"));
        req.lastName = tryCatchChain(errors, () => parseStringWithLengthBounds(req.lastName, 1, 100, true, "Last Name"));
        req.username = tryCatchChain(errors, () => parseStringWithLengthBounds(req.username, 3, 25, true, "Username"));
        req.password = tryCatchChain(errors, () => parsePassword(req.password));
        req.confirmPassword = tryCatchChain(errors, () => parsePassword(req.confirmPassword));

        req.physical = tryCatchChain(errors, () => validCheckbox(req.physical, "Physical Checkbox"));
        req.sensory = tryCatchChain(errors, () => validCheckbox(req.sensory, "Sensory Checkbox"));
        req.neurodivergent = tryCatchChain(errors, () => validCheckbox(req.neurodivergent, "Neurodivergent Checkbox"));

        if(errors.length > 0) {
            return res.status(400).render("register", {title: "Register", errors: errors});
        }

       //TODO: DB functions
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

        //TODO: DB functions
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

router.route('/user')
    .get(async (req, res) => {
        //TODO: Get User Object and pass it (including title)
        return res.render("userProfile", {title: "User Profile"});
    });

router.route('/place')
    .get(async (req, res) => {
        //TODO: Get Place Object and pass it (including title)
        return res.render("place", {title: "Place"});
    });

router.route('/review')
    .get(async (req, res) => {
        //TODO: Get Review Object and pass it (including title)
        return res.render("review", {title: "Review"});
    });

router.route('/about')
    .get(async (req, res) => {
        return res.render("about", {title: "About"});
    });

export default router;