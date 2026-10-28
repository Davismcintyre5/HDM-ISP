'use strict';

const express = require('express');
const router = express.Router();

const {
  getDetailedHealth,
  getBasicHealth,
} = require('../../controllers/admin/healthController');

router.get('/', getBasicHealth);
router.get('/detailed', getDetailedHealth);

module.exports = router;