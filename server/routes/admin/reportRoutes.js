'use strict';

const express = require('express');
const router = express.Router();

const reports = require('../../controllers/admin/reportController');

router.get('/summary', reports.platformSummary);
router.get('/daily', reports.dailyReports);
router.get('/provider-revenue', reports.providerRevenue);

module.exports = router;