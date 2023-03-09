const express = require('express');
const router = express.Router();
const ds = require('./datastore');

// Authorization
var { expressjwt: jwt } = require("express-jwt");
const jwksRsa = require('jwks-rsa');
config = require('./config.json');
DOMAIN = config.issuerBaseURL;

/************ Authorization using Auth0 *************/

const checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${DOMAIN}/.well-known/jwks.json`
      }),
  
    // Validate the audience and the issuer.
    issuer: `${DOMAIN}/`,
    algorithms: ['RS256']
});

const errorHandler = function errorHandler (err, req, res, next) {
    if (err.name === "UnauthorizedError") {
        res.auth_valid = false;
        res.status(401).json({"Error": "Invalid or missing token"});
    } else {
        next(err);
    }
};

const auth_check = [checkJwt, errorHandler];

/************* Error Handling *********************/

const header_check = function header_check(req, res, next) {
    // 406 - client has accept header set to MIME type not supported by endpoint
    if (!req.accepts('application/json')) {
        res.status(406).json({"Error": "Must accept application/json"});
    } else {
        next();
    }
};

/**************************************************/

// Add a single boat
router.post('/', auth_check, header_check, function(req, res) {

    // Check that user is in datastore
    ds.entity_exists(req.auth.sub, "unique_id", "Captain")
    .then( (exists) => {
        if (exists) {
            req.body.owner = req.auth.sub;
            req.body.load = null;
            ds.post_entity(req.body, "Boat")
            .then( (boat) => {
                req.body.self = req.protocol + "://" + req.get("host") + req.baseUrl + "/" + boat.id;
                res.status(201).json(boat);
            });
        } else {
            // Does not belong to captain
            res.status(403).json({"Error": "Unauthorized, boat is not owned by this user id"});
        }
    });
});

// Return array of boats that match given sub property in JWT
router.get('/', auth_check, header_check, function(req, res) {
    // Send array of boats that match given sub property in JWT
    ds.get_all_entities_pag(req, "Boat")
    .then( (boats) => {
        res.status(200).json(boats);
    });
});

// Return a single boat
router.get('/:boat_id', auth_check, header_check, function(req, res) {
    let url = req.protocol + "://" + req.get("host") + req.baseUrl + "/";
    ds.get_entity(req.params.boat_id, "Boat", url)
    .then( (boat) => {
        if (boat === undefined) {
            res.status(404).json({"Error": "No boat with this id exists"});
        }
        else if (boat.owner != req.auth.sub) {
            res.status(403).json({"Error": "Unauthorized, boat is not owned by this user id"});
        } else {
            res.status(200).json(boat);
        }
    });
});

router.patch('/:boat_id', auth_check, function(req, res) {
    let url = "";
    ds.get_entity(req.params.boat_id, "Boat", url)
    .then ( (boat) => {
        // Boat not found
        if (boat == undefined) {
            res.status(404).json({"Error": "No boat with this id exists"});
        
        // Boat does not belong to this owner
        } else if ((boat.owner != req.auth.sub)){
            res.status(403).json({"Error": "Unauthorized, boat is not owned by this user id"});
        
        } else {
            ds.patch_boat(req.body, req.params.boat_id)
            .then ( () => {
                res.status(204).send({});
            });
        }
    });
});

router.put('/:boat_id', auth_check, function(req, res) {
    let url = "";
    ds.get_entity(req.params.boat_id, "Boat", url)
    .then ( (boat) => {
        // Boat not found
        if (boat == undefined) {
            res.status(404).json({"Error": "No boat with this id exists"});
        
        // Boat does not belong to this owner
        } else if ((boat.owner != req.auth.sub)){
            res.status(403).json({"Error": "Unauthorized, boat is not owned by this user id"});

        // Put Boat
        } else {
            ds.put_entity(req.params.boat_id, req, "Boat")
            .then( () => {
                res.status(204).json({});
            });
        }
    });
});


// Assign a load to a boat
router.patch('/:boat_id/loads/:load_id', auth_check, function(req, res) {
    let url = "";
    ds.get_entity(req.params.boat_id, "Boat", url)
    .then ( (boat) => {
        // Boat not found
        if (boat == undefined) {
            res.status(404).json({"Error": "No boat with this id exists"});
        
        // Boat does not belong to this owner
        } else if ((boat.owner != req.auth.sub)){
            res.status(403).json({"Error": "Unauthorized, boat is not owned by this user id"});

        // Patch Boat
        } else {
            ds.get_entity(req.params.load_id, "Load", url)
            .then( (load) => {
                if (load !== undefined) {
                    ds.add_load_to_boat(req.params.boat_id, req.params.load_id)
                    .then ( () =>{
                        ds.add_boat_to_load(req.params.load_id, req.params.boat_id)
                        .then( () => {
                            res.status(204).json({});
                        });
                    });
                // Load not found
                } else {
                    res.status(404).json({"Error": "No load with this id exists"});
                }
            });
        }
    });
});

// Remove a load to a boat
router.delete('/:boat_id/loads/:load_id', auth_check, function(req, res) {
    let url = "";
    ds.get_entity(req.params.boat_id, "Boat", url)
    .then ( (boat) => {
        // Boat not found
        if (boat == undefined) {
            res.status(404).json({"Error": "No boat with this id exists"});
        
        // Boat does not belong to this owner
        } else if ((boat.owner != req.auth.sub)){
            res.status(403).json({"Error": "Unauthorized, boat is not owned by this user id"});

        // Check Load
        } else {
            ds.get_entity(req.params.load_id, "Load", url)
            .then( (load) => {
                if (load !== undefined) {
                    ds.remove_load_from_boat(req.params.boat_id, req.params.load_id)
                    .then ( () =>{
                        ds.remove_boat_from_load(req.params.load_id, req.params.boat_id)
                        .then( () => {
                            res.status(204).json({});
                        });
                    });
                // Load not found
                } else {
                    res.status(404).json({"Error": "No load with this id exists"});
                }
            });
        }
    });
});

router.delete('/:boat_id', auth_check, function(req, res) {
    let url = "";
    ds.get_entity(req.params.boat_id, "Boat", url)
    .then ( (boat) => {
        // Boat not found
        if (boat == undefined) {
            res.status(404).json({"Error": "No boat with this id exists"});
        
        // Boat does not belong to this owner
        } else if ((boat.owner != req.auth.sub)){
            res.status(403).json({"Error": "Unauthorized, boat is not owned by this user id"});

        // Check Load
        } else {
            // Check if load is on boat
            if (boat.load !== null) {
                // Remove boat from load
                ds.remove_boat_from_load(boat.load, req.params.boat_id)
                .then ( () =>{
                    // Delete Boat
                    ds.delete_entity(req.params.boat_id, "Boat")
                    .then( () => {
                        res.status(204).json({});
                    });
                });
            } else {
                // Delete Boat
                ds.delete_entity(req.params.boat_id, "Boat")
                .then( () => {
                    res.status(204).json({});
                });
            }
        }
    });
});

module.exports = router;