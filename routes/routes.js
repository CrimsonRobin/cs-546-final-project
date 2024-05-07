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
import {
    parseStringWithLengthBounds, tryCatchChain, parsePassword, validCheckbox, parseObjectId,
    parseCategories, parseNonEmptyString, parseLatitude, normalizeLongitude, parseNumber
} from "../helpers.js";
import {
    getPlace, getReview, addReview, addPlaceComment, addReviewComment, searchNear, findAllNear, search, getAllPlaces,
    addPlaceCommentLike, addReviewCommentLike, addReviewLike, addReviewDislike, addPlaceCommentDislike,
} from "../data/places.js";
import { createUser, getUser, loginUser } from "../data/user.js";

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

        req.body.username = tryCatchChain(errors, () => parseStringWithLengthBounds(req.body.username, 3, 25, true, "Username"));
        req.body.password = tryCatchChain(errors, () => parsePassword(req.body.password));

        if(errors.length > 0) {
            return res.status(400).render("login", {title: "Log In", errors: errors});
        }

        try {
            const user = await loginUser(req.username, req.password);

            req.session.user = {_id: user._id, firstName: user.firstname, lastName: user.lastname, username: user.username, 
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

//For the rest of these functions, if req.session.user exists, pass it as the "user"
router.route('/')
    .get(async (req, res) => {
        return res.render("home", {title: "Home", user: req.session ? req.session.user : undefined});
    });

router.route('/api/search')
    .get(async (req, res) => {
        //latitude, longitude, radius <- should be numbers
        let errors = [];
        const searchResults = undefined;

        if(req.query.latitude === undefined && req.query.longitude === undefined && req.query.radius === undefined && req.query.searchTerm === undefined) {
            searchResults = await getAllPlaces();
            return res.render('/searchResults', {title: "Search Results", layout: false, message: searchResults, 
            user: req.session ? req.session.user : undefined});
        }

        if(req.query.latitude === undefined && req.query.longitude === undefined && req.query.radius === undefined && req.query.searchTerm) {
            searchResults = await search(req.query.searchTerm);
            return res.render('/searchResults', {title: "Search Results", layout: false, message: searchResults, 
            user: req.session ? req.session.user : undefined});
        }

        req.query.latitude = tryCatchChain(errors, () => parseLatitude(req.query.latitude));
        req.query.longitude = tryCatchChain(errors, () => normalizeLongitude(req.query.longitude));
        req.query.radius = tryCatchChain(errors, () => parseNumber(req.query.radius));

        if(errors.length > 0) {
            return res.render('/searchResults', {title: "Search Results", layout: false, message: errors, 
            user: req.session ? req.session.user : undefined});
        }

        if(req.query.searchTerm) {
            searchResults = await searchNear(req.query.searchTerm, req.query.latitude, req.query.longitude, req.query.radius);
            return res.render('/searchResults', {title: "Search Results", layout: false, message: searchResults, 
            user: req.session ? req.session.user : undefined});
        }
        else {
            searchResults = await findAllNear(req.query.latitude, req.query.longitude, req.query.radius);
            return res.render('/searchResults', {title: "Search Results", layout: false, message: searchResults, 
            user: req.session ? req.session.user : undefined});
        }
    });

/* router.route('/api/changePassword')
    .get(async (req, res) => {
        //AJAX Calls
    })
    .post(async (req, res) => {

    });
*/

router.route('/user/:id')
    .get(async (req, res) => {
        //Get User Object and pass it (including title)
        try {
            req.params.id = parseObjectId(req.params.id, "User Id");
            const user = await getUser(req.params.id);

            return res.render("userProfile", {title: "User Profile", userProfile: user, user: req.session ? req.session.user : undefined});
        } catch (error) {
            return res.status(404).render("error", {title: "User Not Found", user: req.session ? req.session.user : undefined});
        }
    });

router.route('/place/:id')
    .get(async (req, res) => {
        //Get Place Object and pass it (including title)
        try {
            req.params.id = parseObjectId(req.params.id, "Place Id");
            const place = await getPlace(req.params.id);

            return res.render("place", {title: "Place", place: place, user: req.session ? req.session.user : undefined});
        } catch (error) {
            return res.status(404).render("error", {title: "Place Not Found", error: error.message, user: req.session ? req.session.user : undefined});
        }
    });

router.route('/place/:id/addReview')
    .post(async (req, res) => {
        let errors = [];

        req.params.id = tryCatchChain(errors, () => parseObjectId(req.params.id, "Place Id"));
        req.body.author = tryCatchChain(errors, () => parseObjectId(req.body.author, "Author Id"));
        req.body.content = tryCatchChain(errors, () => parseNonEmptyString(req.body.content, "Content of review"));
        req.body.categories = tryCatchChain(errors, () => parseCategories(req.body.categories));

        if(errors.length > 0) {
            return res.status(400).render("error", {title: "Add Review Failed", errors: errors});
        }

        try {
            const review = await addReview(req.params.id, req.body.author, req.body.content, req.body.categories);

            return res.redirect(`/review/${review._id.toString()}`);
        } catch (error) { //Internal Error
            return res.render("error", {title: "Add Review Failed", error: error.message, user: req.session ? req.session.user : undefined})
        }
    });

router.route('/place/:id/addComment')
    .post(async (req, res) => {
        let errors = [];
    
        req.params.id = tryCatchChain(errors, () => parseObjectId(req.params.id, "Place Id"));
        req.body.author = tryCatchChain(errors, () => parseObjectId(req.body.author, "Author Id"));
        req.body.content = tryCatchChain(errors, () => parseNonEmptyString(req.body.content, "Content of review"));
    
        if(errors.length > 0) {
            return res.status(400).render("error", {title: "Add Place Comment Failed", errors: errors});
        }
    
        try {
            const review = await addPlaceComment(req.params.id, req.body.author, req.body.content);
    
            return res.redirect(`/review/${review._id.toString()}`);
        } catch (error) { //Internal Error
            return res.render("error", {title: "Add Place Comment Failed", error: error.message, user: req.session ? req.session.user : undefined})
        }
});

router.route('/review/:id')
    .get(async (req, res) => {
        //Get Review Object and pass it (including title)
        try {
            req.params.id = parseObjectId(req.params.id, "Review Id");
            const review = getReview(req.params.id);

            return res.render("review", {title: "Review", review: review, user: req.session ? req.session.user : undefined});
        } catch (error) {
            return res.status(404).render("error", {title: "Review Not Found", error: error.message, user: req.session ? req.session.user : undefined});
        }
    });

router.route('/review/:id/addComment')
    .post(async (req, res) => {
        let errors = [];
    
        req.params.id = tryCatchChain(errors, () => parseObjectId(req.params.id, "Review Id"));
        req.body.author = tryCatchChain(errors, () => parseObjectId(req.body.author, "Author Id"));
        req.body.content = tryCatchChain(errors, () => parseNonEmptyString(req.body.content, "Content of Comment"));
    
        if(errors.length > 0) {
            return res.status(400).render("error", {title: "Add Review Comment Failed", errors: errors});
        }
    
        try {
            const review = await addReviewComment(req.params.id, req.body.author, req.body.content);
    
            return res.redirect(`/review/${review._id.toString()}`);
        } catch (error) { //Internal Error
            return res.render("error", {title: "Add Review Comment Failed", error: error.message, user: req.session ? req.session.user : undefined})
        }
});

router.route('/review/:id/like')
    .post(async (req, res) => {
        let errors = [];
    
        req.params.id = tryCatchChain(errors, () => parseObjectId(req.params.id, "Review Id"));
        req.body.author = tryCatchChain(errors, () => parseObjectId(req.body.author, "Author Id"));
        if(errors.length > 0) {
            return res.status(400).render("error", {title: "Add Review Comment Failed", errors: errors});
        }
        try {
            await likeReview(req.params.id, req.body.author);
            return res.redirect(`/review/${review._id.toString()}`);
        } catch (error) {
            return res.render("error", {title: "Add Review Comment Failed", error: error.message, user: req.session ? req.session.user : undefined})
        }
    });

router.route('/about')
    .get(async (req, res) => {
        return res.render("about", {title: "About", user: req.session ? req.session.user : undefined});
    });

export default router;