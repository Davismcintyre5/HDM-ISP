'use strict';

const express = require('express');
const router = express.Router();

const dashboard = require('../../controllers/client/dashboardController');

router.get('/summary', dashboard.summary);

module.exports = router;