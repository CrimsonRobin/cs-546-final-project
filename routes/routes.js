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
    parseStringWithLengthBounds,
    tryCatchChain,
    parsePassword,
    validCheckbox,
    parseObjectId,
    parseCategories,
    parseNonEmptyString,
    parseLatitude,
    normalizeLongitude,
    parseNumber,
} from "../helpers.js";
import {
    getPlace,
    getReview,
    addReview,
    addPlaceComment,
    addReviewComment,
    searchNear,
    findAllNear,
    search,
    getAllPlaces,
    toggleReviewDislike,
    toggleReviewLike,
    addPlaceCommentReply,
    addReviewCommentReply,
    getAverageCategoryRatings,
    mapAvgRatingsToLetters,
    togglePlaceCommentLike,
    togglePlaceCommentDislike,
    toggleReviewCommentLike,
    toggleReviewCommentDislike,
    DISABILITY_CATEGORY_PHYSICAL,
    DISABILITY_CATEGORY_SENSORY,
    DISABILITY_CATEGORY_NEURODIVERGENT,
    getLikedItems,
    getDislikedItems
} from "../data/places.js";
import { createUser, getUser, loginUser } from "../data/user.js";
import { parseSearchRadius, nominatimSearch, nominatimSearchWithin } from "../data/geolocation.js";

const router = express.Router();

router
    .route("/register")
    .get(async (req, res) => {
        return res.render("register", { title: "Register" });
    })
    .post(async (req, res) => {
        //need to validate first name, last name, username, password, confirm password
        let errors = [];

        req.body.username = tryCatchChain(errors, () =>
            parseStringWithLengthBounds(req.body.username, 3, 25, true, "Username")
        );
        req.body.password = tryCatchChain(errors, () => parsePassword(req.body.password));
        req.body.confirmPassword = tryCatchChain(errors, () => parsePassword(req.body.confirmPassword));

        req.body.physical = tryCatchChain(errors, () => validCheckbox(req.body.physical, "Physical Checkbox"));
        req.body.sensory = tryCatchChain(errors, () => validCheckbox(req.body.sensory, "Sensory Checkbox"));
        req.body.neurodivergency = tryCatchChain(errors, () =>
            validCheckbox(req.body.neurodivergency, "Neurodivergent Checkbox")
        );

        if (errors.length > 0) {
            return res.status(400).render("register", { title: "Register", errors: errors });
        }

        const qualification = [];
        if(req.body.physical) {
            qualification.push(DISABILITY_CATEGORY_PHYSICAL);
        }
        if(req.body.sensory) {
            qualification.push(DISABILITY_CATEGORY_SENSORY);
        }
        if(req.body.neurodivergency) {
            qualification.push(DISABILITY_CATEGORY_NEURODIVERGENT);
        }

        try {
            const userMade = await createUser(
                req.body.username,
                req.body.password,
                qualification
            );

            if (userMade) {
                return res.redirect("/login");
            } else {
                //DB could be down
                return res.status(500).send("Internal Server Error");
            }
        } catch (error) {
            return res.status(400).render("register", { title: "Register", errors: [error] });
        }
    });

router
    .route("/login")
    .get(async (req, res) => {
        return res.render("login", { title: "Log In" });
    })
    .post(async (req, res) => {
        let errors = [];

        req.body.username = tryCatchChain(errors, () =>
            parseStringWithLengthBounds(req.body.username, 3, 25, true, "Username")
        );
        req.body.password = tryCatchChain(errors, () => parsePassword(req.body.password));

        if (errors.length > 0) {
            return res.status(400).render("login", { title: "Log In", errors: errors });
        }

        try {
            const user = await loginUser(req.body.username, req.body.password);

            req.session.user = {
                _id: user._id,
                firstName: user.firstname,
                lastName: user.lastname,
                username: user.username,
                createdAt: user.createdAt,
                qualifications: user.qualifications,
            };

            return res.redirect("/");
        } catch (error) {
            return res.status(400).render("login", { errors: [error] });
        }
    });

router.route("/logout").get(async (req, res) => {
    req.session.destroy();
    return res.render("logout", { title: "Logged Out" });
});

//For the rest of these functions, if req.session.user exists, pass it as the "user"
router.route("/").get(async (req, res) => {
    return res.render("home", { title: "Home", user: req.session ? req.session.user : undefined });
});

router.route("/api/search").get(async (req, res) => {
    //latitude, longitude, radius <- should be numbers
    let errors = [];
    let searchResults = undefined;

    if (
        req.query.latitude === undefined &&
        req.query.longitude === undefined &&
        req.query.radius === undefined &&
        req.query.searchTerm === undefined
    ) {
        searchResults = await getAllPlaces();
        return res.render("searchResults", {
            title: "Search Results",
            layout: false,
            message: searchResults,
            user: req.session ? req.session.user : undefined,
        });
    }

    if (
        req.query.latitude === undefined &&
        req.query.longitude === undefined &&
        req.query.radius === undefined &&
        req.query.searchTerm
    ) {
        searchResults = await search(req.query.searchTerm);
        return res.render("searchResults", {
            title: "Search Results",
            layout: false,
            message: searchResults,
            user: req.session ? req.session.user : undefined,
        });
    }

    req.query.latitude = tryCatchChain(errors, () => parseLatitude(parseNumber(req.query.latitude)));
    req.query.longitude = tryCatchChain(errors, () => normalizeLongitude(parseNumber(req.query.longitude)));
    if (req.query.radius === undefined) {
        req.query.radius = 5;
    }
    req.query.radius = tryCatchChain(errors, () => parseSearchRadius(parseNumber(req.query.radius)));

    if (errors.length > 0) {
        return res.render("searchResults", {
            title: "Search Results",
            layout: false,
            errors: errors,
            user: req.session ? req.session.user : undefined,
        });
    }

    if (req.query.searchTerm) {
        searchResults = await searchNear(
            req.query.searchTerm,
            req.query.latitude,
            req.query.longitude,
            req.query.radius
        );
        return res.render("searchResults", {
            title: "Search Results",
            layout: false,
            message: `Places matching ${req.query.searchTerm}`,
            results: searchResults,
            user: req.session ? req.session.user : undefined,
        });
    } else {
        searchResults = await findAllNear(req.query.latitude, req.query.longitude, req.query.radius);
        return res.render("searchResults", {
            title: "Search Results",
            layout: false,
            message: `Places near you`,
            results: searchResults,
            user: req.session ? req.session.user : undefined,
        });
    }
});

router.route("/api/nominatimSearch").get(async (req, res) => {
    let errors = [];
    let searchResults = undefined;

    if (
        req.query.latitude === undefined &&
        req.query.longitude === undefined &&
        req.query.radius === undefined &&
        req.query.searchTerm === undefined
    ) {
        searchResults = await getAllPlaces();
        return res.render("searchResults", {
            title: "Search Results",
            layout: false,
            message: searchResults,
            user: req.session ? req.session.user : undefined,
        });
    }

    if (
        req.query.latitude === undefined &&
        req.query.longitude === undefined &&
        req.query.radius === undefined &&
        req.query.searchTerm
    ) {
        searchResults = await nominatimSearch(req.query.searchTerm);
        return res.render("searchResults", {
            title: "Search Results",
            layout: false,
            message: searchResults,
            user: req.session ? req.session.user : undefined,
        });
    }

    req.query.latitude = tryCatchChain(errors, () => parseLatitude(parseNumber(req.query.latitude)));
    req.query.longitude = tryCatchChain(errors, () => normalizeLongitude(parseNumber(req.query.longitude)));
    if (req.query.radius === undefined) {
        req.query.radius = 5;
    }
    req.query.radius = tryCatchChain(errors, () => parseSearchRadius(parseNumber(req.query.radius)));

    if (errors.length > 0) {
        return res.render("searchResults", {
            title: "Search Results",
            layout: false,
            errors: errors,
            user: req.session ? req.session.user : undefined,
        });
    }

    if (req.query.searchTerm) {
        searchResults = await nominatimSearchWithin(
            req.query.searchTerm,
            req.query.latitude,
            req.query.longitude,
            req.query.radius
        );
        return res.render("searchResults", {
            title: "Search Results",
            layout: false,
            message: `Places matching ${req.query.searchTerm}`,
            results: searchResults,
            user: req.session ? req.session.user : undefined,
        });
    } else {
        return res.render("searchResults", {
            title: "Search Results",
            layout: false,
            message: `Places near you`,
            errors: ["No Search Term provided."],
            user: req.session ? req.session.user : undefined,
        });
    }
});

/* router.route('/api/changePassword')
    .get(async (req, res) => {
        //AJAX Calls
    })
    .post(async (req, res) => {

    });
*/

//Gets a User's Profile
router.route("/user/:id").get(async (req, res) => {
    //Get User Object and pass it (including title)
    try {
        req.params.id = parseObjectId(req.params.id, "User Id");
        const user = await getUser(req.params.id);

        return res.render("userProfile", {
            title: "User Profile",
            userProfile: user,
            user: req.session ? req.session.user : undefined,
        });
    } catch (error) {
        return res.status(404).render("error", {
            title: "User Not Found",
            user: req.session ? req.session.user : undefined,
        });
    }
});

//Gets a Place and renders it
router.route("/place/:id").get(async (req, res) => {
    //Get Place Object and pass it (including title)
    try {
        req.params.id = parseObjectId(req.params.id, "Place Id");
        const place = await getPlace(req.params.id);

        for(const comment of place.comments) {
            comment.authorName = await getUser(comment.author);
        }

        for(const review of place.reviews) {
            review.authorName = await getUser(review.author);
        }

        if (req.session.user) {
            const likedItems = await getLikedItems(req.session.user._id);
            const disLikedItems = await getDislikedItems(req.session.user._id);

            for(const comment of place.comments) {
                comment.isLiked = likedItems.likedPlaceComments.includes(comment._id);
                comment.isDisliked = disLikedItems.dislikedPlaceComments.includes(comment._id);
            }

            for(const review of place.reviews) {
                review.isLiked = likedItems.likedReviews.includes(review._id);
                review.isDisliked = disLikedItems.dislikedReviews.includes(review._id);
            }
        }

        return res.render("place", {
            title: "Place",
            place: place,
            user: req.session ? req.session.user : undefined,
        });
    } catch (error) {
        return res.status(404).render("error", {
            title: "Place Not Found",
            errors: [error],
            user: req.session ? req.session.user : undefined,
        });
    }
});

//This Route adds a Review to a place
router.route("/api/place/:id/addReview").post(async (req, res) => {
    let errors = [];

    req.params.id = tryCatchChain(errors, () => parseObjectId(req.params.id, "Place Id"));
    req.body.content = tryCatchChain(errors, () => parseNonEmptyString(req.body.content, "Content of review"));
    req.body.categories = tryCatchChain(errors, () => parseCategories(req.body.categories));

    if (errors.length > 0) {
        return res.status(400).render("error", { title: "Add Review Failed", errors: errors });
    }

    try {
        const review = await addReview(req.params.id, req.session.user._id, req.body.content, req.body.categories);

        return res.redirect(`/review/${review._id.toString()}`);
    } catch (error) {
        //Internal Error
        return res.render("error", {
            title: "Add Review Failed",
            errors: [error],
            user: req.session ? req.session.user : undefined,
        });
    }
});

//This Route adds a comment to a place
router.route("/place/:id/addComment").post(async (req, res) => {
    let errors = [];

    req.params.id = tryCatchChain(errors, () => parseObjectId(req.params.id, "Place Id"));
    req.body.content = tryCatchChain(errors, () => parseNonEmptyString(req.body.content, "Content of review"));

    if (errors.length > 0) {
        return res.status(400).render("error", { title: "Add Place Comment Failed", errors: errors });
    }

    try {
        const place = await addPlaceComment(req.params.id, req.session.user._id, req.body.content);
        return res.redirect(`/place/${place._id.toString()}`);
    } catch (error) {
        //Internal Error
        return res.render("error", {
            title: "Add Place Comment Failed",
            errors: [error],
            user: req.session ? req.session.user : undefined,
        });
    }
});

//This gets a review (could be used to update and delete a review)
router.route("/review/:id").get(async (req, res) => {
    //Get Review Object and pass it (including title)
    try {
        req.params.id = parseObjectId(req.params.id, "Review Id");
        const review = await getReview(req.params.id);

        review.authorName = await getUser(review.author);

        for(const comment of review.comments) {
            comment.authorName = await getUser(comment.author);
        }

        if (req.session.user) {
            const likedItems = await getLikedItems(req.session.user._id);
            const disLikedItems = await getDislikedItems(req.session.user._id);

            review.isLiked = likedItems.likedReviews.includes(review._id);
            review.isDisliked = disLikedItems.dislikedReviews.includes(review._id);

            for(const comment of review.comments) {
                comment.isLiked = likedItems.likedReviewComments.includes(comment._id);
                comment.isDisliked = disLikedItems.dislikedReviewComments.includes(comment._id);
            }
        }

        return res.render("review", {
            title: "Review",
            review: review,
            user: req.session ? req.session.user : undefined,
        });
    } catch (error) {
        return res.status(404).render("error", {
            title: "Review Not Found",
            errors: [error],
            user: req.session ? req.session.user : undefined,
        });
    }
});

//This Route adds a comment to a Review
router.route("/review/:id/addComment").post(async (req, res) => {
    let errors = [];

    req.params.id = tryCatchChain(errors, () => parseObjectId(req.params.id, "Review Id"));
    req.body.content = tryCatchChain(errors, () => parseNonEmptyString(req.body.content, "Content of Comment"));

    if (errors.length > 0) {
        return res.status(400).render("error", { title: "Add Review Comment Failed", errors: errors });
    }

    try {
        const review = await addReviewComment(req.params.id, req.session.user._id, req.body.content);

        return res.redirect(`/review/${review._id.toString()}`);
    } catch (error) {
        //Internal Error
        return res.render("error", {
            title: "Add Review Comment Failed",
            errors: [error],
            user: req.session ? req.session.user : undefined,
        });
    }
});

//This Route adds a like to a Review
router.route("/api/review/:id/like").post(async (req, res) => {
    let errors = [];

    req.params.id = tryCatchChain(errors, () => parseObjectId(req.params.id, "Review Id"));

    if (errors.length > 0) {
        return res.json({ errors: errors });
    }
    try {
        const review = await toggleReviewLike(req.params.id, req.session.user._id);
        return res.json({ likes: review.likes });
    } catch (error) {
        return res.json({ errors: [error] });
    }
});

//This route adds a dislike to a Review
router.route("/api/review/:id/dislike").post(async (req, res) => {
    let errors = [];

    req.params.id = tryCatchChain(errors, () => parseObjectId(req.params.id, "Review Id"));

    if (errors.length > 0) {
        return res.json({ errors: errors });
    }
    try {
        const review = await toggleReviewDislike(req.params.id, req.session.user._id);
        return res.json({ dislikes: review.dislikes });
    } catch (error) {
        return res.json({ errors: [error] });
    }
});

//This route handles place comment likes
router.route("/api/place/:placeId/comment/:commentId/like").post(async (req, res) => {
    try {
        req.params.commentId = parseObjectId(req.params.commentId, "comment id");
        req.params.placeId = parseObjectId(req.params.placeId, "place id");
    } catch (error) {
        return res.json({ errors: [error] });
    }
    try {
        const likedPlace = await togglePlaceCommentLike(req.params.placeId, req.params.commentId, req.session.user._id);
        return res.json({ likes: likedPlace.likes });
    } catch (error) {
        return res.json({ errors: [error] });
    }
});

//This route handles place comment dislikes
router.route("/api/place/:placeId/comment/:commentId/dislike").post(async (req, res) => {
    try {
        req.params.commentId = parseObjectId(req.params.commentId, "comment id");
        req.params.placeId = parseObjectId(req.params.placeId, "place id");
    } catch (error) {
        return res.json({ errors: [error] });
    }
    try {
        const dislikedPlace = await togglePlaceCommentDislike(
            req.params.placeId,
            req.params.commentId,
            req.session.user._id
        );
        return res.json({ dislikes: dislikedPlace.dislikes });
    } catch (error) {
        return res.json({ errors: [error] });
    }
});

//Routes for review comment likes and dislikes

router.route("/api/review/:reviewId/comment/:commentId/dislike").post(async (req, res) => {
    try {
        req.params.commentId = parseObjectId(req.params.commentId, "comment id");
        req.params.reviewId = parseObjectId(req.params.reviewId, "review id");
    } catch (error) {
        return res.json({ errors: [error] });
    }
    try {
        const likedReview = await toggleReviewCommentLike(req.params.commentId, req.params.reviewId);
        return res.json({ likes: likedReview.likes });
    } catch (error) {
        return res.json({ errors: [error] });
    }
});

router.route("/api/review/:reviewId/comment/:commentId/dislike").post(async (req, res) => {
    try {
        req.params.commentId = parseObjectId(req.params.commentId, "comment id");
        req.params.reviewId = parseObjectId(req.params.reviewId, "review id");
    } catch (error) {
        return res.json({ errors: [error] });
    }
    try {
        const dislikedReview = await toggleReviewCommentDislike(req.params.commentId, req.params.reviewId);
        return res.json({ dislikes: dislikedReview.dislikes });
    } catch (error) {
        return res.json({ errors: [error] });
    }
});

//This route adds a reply to a comment on a place
router.route("/comment/:id/addReply").post(async (req, res) => {
    try {
        req.params.id = parseObjectId(req.params.id, "Comment Id");
        req.body.content = parseNonEmptyString(req.body.content, "Content");
    } catch (error) {
        return res.status(400).render("error", { title: "Add Comment Reply Failed", errors: [error] });
    }
    try {
        const reply = await addPlaceCommentReply(req.params.id, req.session.user._id);
        return res.redirect(`/comment/${req.params.id}`);
    } catch (error) {
        return res.render("error", {
            title: "Add Comment Reply Failed",
            errors: [error],
            user: req.session ? req.session.user : undefined,
        });
    }
});

//This route adds a reply to a comment on a review
router.route("/review/:reviewId/comment/:id/addReply").post(async (req, res) => {
    try {
        req.params.id = parseObjectId(req.params.id, "Comment Id");
        req.body.content = parseNonEmptyString(req.body.content, "Content");
    } catch (error) {
        return res.status(400).render("error", { title: "Add Review Comment Reply Failed", errors: [error] });
    }
    try {
        await addReviewCommentReply(req.params.id, req.session.user._id, req.body.content);
    } catch (error) {
        return res.render("error", {
            title: "Add Review Comment Reply Failed",
            errors: [error],
            user: req.session ? req.session.user : undefined,
        });
    }
});

//This route is our about page
router.route("/about").get(async (req, res) => {
    return res.render("about", { title: "About", user: req.session ? req.session.user : undefined });
});

export default router;
