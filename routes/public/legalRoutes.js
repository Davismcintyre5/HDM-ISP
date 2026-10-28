'use strict';

const express = require('express');
const router = express.Router();

const legal = require('../../controllers/admin/legalController');
const rateLimiter = require('../../middleware/global/rateLimiter');

router.get('/', rateLimiter.captive, legal.list);
router.get('/:id', rateLimiter.captive, legal.getOne);

module.exports = router;