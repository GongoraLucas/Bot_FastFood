const express = require('express');
const router = express.Router();
const botController = require('../controllers/botController');

router.post('/', botController.handleMessage);

module.exports = router;