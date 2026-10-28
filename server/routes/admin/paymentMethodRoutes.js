'use strict';

const express = require('express');
const router = express.Router();

const paymentMethods = require('../../controllers/admin/paymentMethodController');
const adminRole = require('../../middleware/admin/role');

router.get('/', paymentMethods.list);
router.patch('/:id', adminRole('superadmin'), paymentMethods.update);

module.exports = router;