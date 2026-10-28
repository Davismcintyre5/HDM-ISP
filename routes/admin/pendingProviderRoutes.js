'use strict';

const express = require('express');
const router = express.Router();

const pendingProviders = require('../../controllers/admin/pendingProviderController');
const adminRole = require('../../middleware/admin/role');

router.get('/', pendingProviders.list);
router.get('/:id', pendingProviders.getOne);
router.post('/:id/approve', adminRole('superadmin'), pendingProviders.approve);
router.post('/:id/reject', adminRole('superadmin'), pendingProviders.reject);
router.delete('/:id', adminRole('superadmin'), pendingProviders.remove);
router.post('/expire-stale', adminRole('superadmin'), pendingProviders.expireStale);

module.exports = router;