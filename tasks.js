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

// Add a single task
router.post('/', header_check, function(req, res) {
    req.body.project = null;
    ds.post_entity(req.body, "task")
    .then( (task) => {
        req.body.self = req.protocol + "://" + req.get("host") + req.baseUrl + "/" + task.id;
        res.status(201).json(task);
    });
});

// Return array of tasks that match given sub property in JWT
router.get('/', header_check, function(req, res) {
    // Send array of tasks that match given sub property in JWT
    ds.get_all_entities_pag(req, "task")
    .then( (tasks) => {
        res.status(200).json(tasks);
    });
});

// Return a single task
router.get('/:task_id', header_check, function(req, res) {
    let url = req.protocol + "://" + req.get("host") + req.baseUrl + "/";
    ds.get_entity(req.params.task_id, "task", url)
    .then( (task) => {
        if (task === undefined) {
            res.status(404).json({"Error": "No task with this task id exists"});
        } else {
            res.status(200).json(task);
        }
        
    });
});

router.patch('/:task_id', function(req, res) {
    let url = "";
    ds.get_entity(req.params.task_id, "task", url)
    .then ( (task) => {
        // task not found
        if (task == undefined) {
            res.status(404).json({"Error": "No task with this id exists"});
        
        } else {
            ds.patch_task(req.body, req.params.task_id)
            .then ( () => {
                res.status(204).send({});
            });
        }
    });
});

router.put('/:task_id', function(req, res) {
    let url = "";
    ds.get_entity(req.params.task_id, "task", url)
    .then ( (task) => {
        // task not found
        if (task == undefined) {
            res.status(404).json({"Error": "No task with this id exists"});

        // Put task
        } else {
            ds.put_entity(req.params.task_id, req, "task")
            .then( () => {
                res.status(204).json({});
            });
        }
    });
});

// Delete task
router.delete('/:task_id', function(req, res) {
    let url = "";
    ds.get_entity(req.params.task_id, "task", url)
    .then ( (task) => {
        // task not found
        if (task == undefined) {
            res.status(404).json({"Error": "No task with this id exists"});
        
        // Check task
        } else {
            // Check if project has been assigned to task
            if (task.project !== null) {
                // Remove task from project
                ds.remove_task_from_project(task.project, req.params.task_id)
                .then ( () =>{
                    // Delete task
                    ds.delete_entity(req.params.task_id, "task")
                    .then( () => {
                        res.status(204).json({});
                    });
                });
            // Delete task if no project present
            } else {
                ds.delete_entity(req.params.task_id, "task")
                .then( () => {
                    res.status(204).json({});
                });
            }
        }
    });
});

module.exports = router;