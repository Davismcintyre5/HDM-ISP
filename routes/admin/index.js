'use strict';

const express = require('express');
const router = express.Router();

const adminAuth = require('../../middleware/admin/auth');
const adminRole = require('../../middleware/admin/role');

const auth = require('../../controllers/admin/authController');
const health = require('../../controllers/admin/healthController');

router.post('/auth/login', auth.login);
router.post('/auth/refresh', auth.refresh);

router.use(adminAuth);

router.get('/auth/me', auth.me);
router.post('/auth/logout', auth.logout);
router.post('/auth/change-password', auth.changePassword);

router.get('/health', health.getBasicHealth);
router.get('/health/detailed', health.getDetailedHealth);

router.use('/providers/pending', require('./pendingProviderRoutes'));
router.use('/billing', require('./billingRoutes'));

router.use('/providers', require('./providerRoutes'));
router.use('/billing-plans', require('./billingPlanRoutes'));
router.use('/payment-methods', require('./paymentMethodRoutes'));
router.use('/legal', require('./legalRoutes'));
router.use('/settings', require('./settingsRoutes'));
router.use('/notifications', require('./notificationRoutes'));
router.use('/reports', require('./reportRoutes'));
router.use('/admins', adminRole('superadmin'), require('./adminUserRoutes'));
router.use('/invoices', require('./invoiceRoutes'));

module.exports = router;