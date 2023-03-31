const express = require('express');
const router = express.Router();
const ds = require('./datastore');

router.get("/", function(req, res) {
    // Get all ProjectManagers with matching JWT
    ds.get_all_entities("ProjectManager")
    .then ( (ProjectManagers) => {
        res.status(200).json(ProjectManagers);
    });
});

router.post('/', function(req, res) {
    res.status(405).json({ "Error": "Method not allowed"});
});

router.patch('/', function(req, res) {
    res.status(405).json({ "Error": "Method not allowed"});
});

router.put('/', function(req, res) {
    res.status(405).json({ "Error": "Method not allowed"});
});

router.delete('/', function(req, res) {
    res.status(405).json({ "Error": "Method not allowed"});
});

module.exports = router;