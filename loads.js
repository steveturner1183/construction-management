const express = require('express');
const router = express.Router();
const ds = require('./datastore');

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

// Add a single load
router.post('/', header_check, function(req, res) {
    req.body.boat = null;
    ds.post_entity(req.body, "Load")
    .then( (load) => {
        req.body.self = req.protocol + "://" + req.get("host") + req.baseUrl + "/" + load.id;
        res.status(201).json(load);
    });
});

// Return array of loads that match given sub property in JWT
router.get('/', header_check, function(req, res) {
    // Send array of loads that match given sub property in JWT
    ds.get_all_entities_pag(req, "Load")
    .then( (loads) => {
        res.status(200).json(loads);
    });
});

// Return a single load
router.get('/:load_id', header_check, function(req, res) {
    let url = req.protocol + "://" + req.get("host") + req.baseUrl + "/";
    ds.get_entity(req.params.load_id, "Load", url)
    .then( (load) => {
        if (load === undefined) {
            res.status(404).json({"Error": "No load with this load id exists"});
        } else {
            res.status(200).json(load);
        }
        
    });
});

router.patch('/:load_id', function(req, res) {
    let url = "";
    ds.get_entity(req.params.load_id, "Load", url)
    .then ( (load) => {
        // Load not found
        if (load == undefined) {
            res.status(404).json({"Error": "No load with this id exists"});
        
        } else {
            ds.patch_load(req.body, req.params.load_id)
            .then ( () => {
                res.status(204).send({});
            });
        }
    });
});

router.put('/:load_id', function(req, res) {
    let url = "";
    ds.get_entity(req.params.load_id, "Load", url)
    .then ( (load) => {
        // Load not found
        if (load == undefined) {
            res.status(404).json({"Error": "No load with this id exists"});

        // Put Load
        } else {
            ds.put_entity(req.params.load_id, req, "Load")
            .then( () => {
                res.status(204).json({});
            });
        }
    });
});

// Delete load
router.delete('/:load_id', function(req, res) {
    let url = "";
    ds.get_entity(req.params.load_id, "Load", url)
    .then ( (load) => {
        // Load not found
        if (load == undefined) {
            res.status(404).json({"Error": "No load with this id exists"});
        
        // Check Load
        } else {
            // Check if boat has been assigned to load
            if (load.boat !== null) {
                // Remove load from boat
                ds.remove_load_from_boat(load.boat, req.params.load_id)
                .then ( () =>{
                    // Delete load
                    ds.delete_entity(req.params.load_id, "Load")
                    .then( () => {
                        res.status(204).json({});
                    });
                });
            // Delete load if no boat present
            } else {
                ds.delete_entity(req.params.load_id, "Load")
                .then( () => {
                    res.status(204).json({});
                });
            }
        }
    });
});

module.exports = router;