'use strict';

const express = require('express');
const router = express.Router();

const providers = require('../../controllers/admin/providerController');
const adminRole = require('../../middleware/admin/role');

router.get('/', providers.list);
router.post('/', providers.create);
router.get('/:id', providers.getOne);
router.patch('/:id', providers.update);
router.post('/:id/suspend', providers.suspend);
router.post('/:id/activate', providers.activate);
router.post('/:id/approve', providers.approveSubscription);
router.post('/:id/reject', providers.reject);
router.delete('/:id', adminRole('superadmin'), providers.remove);

module.exports = router;