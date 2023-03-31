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

// Add a single Project
router.post('/', auth_check, header_check, function(req, res) {

    // Check that user is in datastore
    ds.entity_exists(req.auth.sub, "unique_id", "ProjectManager")
    .then( (exists) => {
        if (exists) {
            req.body.owner = req.auth.sub;
            req.body.task = null;
            ds.post_entity(req.body, "Project")
            .then( (Project) => {
                req.body.self = req.protocol + "://" + req.get("host") + req.baseUrl + "/" + Project.id;
                res.status(201).json(Project);
            });
        } else {
            // Does not belong to ProjectManager
            res.status(403).json({"Error": "Unauthorized, Project is not owned by this user id"});
        }
    });
});

// Return array of Projects that match given sub property in JWT
router.get('/', auth_check, header_check, function(req, res) {
    // Send array of Projects that match given sub property in JWT
    ds.get_all_entities_pag(req, "Project")
    .then( (Projects) => {
        res.status(200).json(Projects);
    });
});

// Return a single Project
router.get('/:Project_id', auth_check, header_check, function(req, res) {
    let url = req.protocol + "://" + req.get("host") + req.baseUrl + "/";
    ds.get_entity(req.params.Project_id, "Project", url)
    .then( (Project) => {
        if (Project === undefined) {
            res.status(404).json({"Error": "No Project with this id exists"});
        }
        else if (Project.owner != req.auth.sub) {
            res.status(403).json({"Error": "Unauthorized, Project is not owned by this user id"});
        } else {
            res.status(200).json(Project);
        }
    });
});

router.patch('/:Project_id', auth_check, function(req, res) {
    let url = "";
    ds.get_entity(req.params.Project_id, "Project", url)
    .then ( (Project) => {
        // Project not found
        if (Project == undefined) {
            res.status(404).json({"Error": "No Project with this id exists"});
        
        // Project does not belong to this owner
        } else if ((Project.owner != req.auth.sub)){
            res.status(403).json({"Error": "Unauthorized, Project is not owned by this user id"});
        
        } else {
            ds.patch_Project(req.body, req.params.Project_id)
            .then ( () => {
                res.status(204).send({});
            });
        }
    });
});

router.put('/:Project_id', auth_check, function(req, res) {
    let url = "";
    ds.get_entity(req.params.Project_id, "Project", url)
    .then ( (Project) => {
        // Project not found
        if (Project == undefined) {
            res.status(404).json({"Error": "No Project with this id exists"});
        
        // Project does not belong to this owner
        } else if ((Project.owner != req.auth.sub)){
            res.status(403).json({"Error": "Unauthorized, Project is not owned by this user id"});

        // Put Project
        } else {
            ds.put_entity(req.params.Project_id, req, "Project")
            .then( () => {
                res.status(204).json({});
            });
        }
    });
});


// Assign a task to a Project
router.patch('/:Project_id/tasks/:task_id', auth_check, function(req, res) {
    let url = "";
    ds.get_entity(req.params.Project_id, "Project", url)
    .then ( (Project) => {
        // Project not found
        if (Project == undefined) {
            res.status(404).json({"Error": "No Project with this id exists"});
        
        // Project does not belong to this owner
        } else if ((Project.owner != req.auth.sub)){
            res.status(403).json({"Error": "Unauthorized, Project is not owned by this user id"});

        // Patch Project
        } else {
            ds.get_entity(req.params.task_id, "task", url)
            .then( (task) => {
                if (task !== undefined) {
                    ds.add_task_to_Project(req.params.Project_id, req.params.task_id)
                    .then ( () =>{
                        ds.add_Project_to_task(req.params.task_id, req.params.Project_id)
                        .then( () => {
                            res.status(204).json({});
                        });
                    });
                // task not found
                } else {
                    res.status(404).json({"Error": "No task with this id exists"});
                }
            });
        }
    });
});

// Remove a task to a Project
router.delete('/:Project_id/tasks/:task_id', auth_check, function(req, res) {
    let url = "";
    ds.get_entity(req.params.Project_id, "Project", url)
    .then ( (Project) => {
        // Project not found
        if (Project == undefined) {
            res.status(404).json({"Error": "No Project with this id exists"});
        
        // Project does not belong to this owner
        } else if ((Project.owner != req.auth.sub)){
            res.status(403).json({"Error": "Unauthorized, Project is not owned by this user id"});

        // Check task
        } else {
            ds.get_entity(req.params.task_id, "task", url)
            .then( (task) => {
                if (task !== undefined) {
                    ds.remove_task_from_Project(req.params.Project_id, req.params.task_id)
                    .then ( () =>{
                        ds.remove_Project_from_task(req.params.task_id, req.params.Project_id)
                        .then( () => {
                            res.status(204).json({});
                        });
                    });
                // task not found
                } else {
                    res.status(404).json({"Error": "No task with this id exists"});
                }
            });
        }
    });
});

router.delete('/:Project_id', auth_check, function(req, res) {
    let url = "";
    ds.get_entity(req.params.Project_id, "Project", url)
    .then ( (Project) => {
        // Project not found
        if (Project == undefined) {
            res.status(404).json({"Error": "No Project with this id exists"});
        
        // Project does not belong to this owner
        } else if ((Project.owner != req.auth.sub)){
            res.status(403).json({"Error": "Unauthorized, Project is not owned by this user id"});

        // Check task
        } else {
            // Check if task is on Project
            if (Project.task !== null) {
                // Remove Project from task
                ds.remove_Project_from_task(Project.task, req.params.Project_id)
                .then ( () =>{
                    // Delete Project
                    ds.delete_entity(req.params.Project_id, "Project")
                    .then( () => {
                        res.status(204).json({});
                    });
                });
            } else {
                // Delete Project
                ds.delete_entity(req.params.Project_id, "Project")
                .then( () => {
                    res.status(204).json({});
                });
            }
        }
    });
});

module.exports = router;