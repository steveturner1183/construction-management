const router = module.exports = require('express').Router();

router.use('/projects', require('./projects'));
router.use('/auth', require('./auth'));
router.use('/projectManagers', require('./projectManagers'));
router.use('/tasks', require('./tasks'));