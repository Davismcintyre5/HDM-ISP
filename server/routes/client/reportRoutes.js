'use strict';

const express = require('express');
const router = express.Router();

const reports = require('../../controllers/client/reportController');

router.get('/revenue', reports.revenue);
router.get('/sessions', reports.sessions);
router.get('/customers', reports.customers);

module.exports = router;