'use strict';

const express = require('express');
const router = express.Router();

const radius = require('../../controllers/public/radiusController');

router.post('/check', radius.check);
router.post('/auth', radius.auth);
router.post('/accounting', radius.accounting);

module.exports = router;