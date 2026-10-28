'use strict';

const express = require('express');
const router = express.Router();

const settings = require('../../controllers/admin/platformSettingsController');
const adminRole = require('../../middleware/admin/role');

router.get('/', settings.list);
router.post('/bulk', adminRole('superadmin'), settings.bulkUpdate);
router.get('/:key', settings.getOne);
router.patch('/:key', adminRole('superadmin'), settings.update);

module.exports = router;