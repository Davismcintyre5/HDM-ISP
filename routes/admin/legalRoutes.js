'use strict';

const express = require('express');
const router = express.Router();

const legal = require('../../controllers/admin/legalController');
const adminRole = require('../../middleware/admin/role');

router.get('/', legal.list);
router.post('/', adminRole('superadmin'), legal.create);
router.get('/:id', legal.getOne);
router.patch('/:id', adminRole('superadmin'), legal.update);
router.delete('/:id', adminRole('superadmin'), legal.remove);

module.exports = router;