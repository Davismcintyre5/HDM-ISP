'use strict';

const express = require('express');
const router = express.Router();

const renewals = require('../../controllers/client/renewalController');

router.post('/', renewals.renew);
router.post('/bulk', renewals.bulkRenew);

module.exports = router;