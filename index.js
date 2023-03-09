const router = module.exports = require('express').Router();

router.use('/boats', require('./boats'));
router.use('/auth', require('./auth'));
router.use('/captains', require('./captains'));
router.use('/loads', require('./loads'));