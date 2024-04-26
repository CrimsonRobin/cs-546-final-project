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

const router = express.Router();

//will change some of these routes, depends on the helpers

router.route('/').get(async (req, res) => {
    return res.json({error: 'YOU SHOULD NOT BE HERE!'});
  });
  
router
    .route('/register')
    .get(async (req, res) => {
      return res.render("register");
    })
    .post(async (req, res) => {

    });
  
router
    .route('/login')
    .get(async (req, res) => {
        return res.render("login");
    })
    .post(async (req, res) => {

    });

router
    .route('/user').get(async (req, res) => {
        return res.render("user");
    });

router
    .route('/logout').get(async (req, res) => {
        return res.render("logout");
    });

router
    .route('/about').get(async (req, res) => {
        return res.render("about");
    });



export default router;