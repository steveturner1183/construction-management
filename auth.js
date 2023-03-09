const express = require('express');
const router = express.Router();
const { auth } = require('express-openid-connect');
const config = require('./config.json');
const ds = require('./datastore');

// auth router attaches /login, /logout, and /callback routes to the baseURL
router.use(auth(config));

// req.isAuthenticated is provided from the auth router
router.get('/', (req, res) => {
    ds.entity_exists(req.oidc.user.sub, "unique_id", "Captain")
    .then ( (exists) => {

        // Only add to database if user id does not already exist
        if (exists) {
            res.json({"jwt": req.oidc.idToken, "user_id": req.oidc.user.sub});

        // Add user to database
        } else {
            ds.post_entity({"name": req.oidc.user.name, "unique_id": req.oidc.user.sub}, "Captain")
            .then(() => {
                // Send JWT to user
                res.json({"jwt": req.oidc.idToken, "user_id": req.oidc.user.sub});
            });
        }
    });




});

module.exports = router;