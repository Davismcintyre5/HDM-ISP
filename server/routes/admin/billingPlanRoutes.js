'use strict';

const express = require('express');
const router = express.Router();

const billingPlans = require('../../controllers/admin/billingPlanController');
const adminRole = require('../../middleware/admin/role');

router.get('/', billingPlans.list);
router.post('/', adminRole('superadmin'), billingPlans.create);
router.get('/:id', billingPlans.getOne);
router.patch('/:id', adminRole('superadmin'), billingPlans.update);
router.delete('/:id', adminRole('superadmin'), billingPlans.remove);

module.exports = router;