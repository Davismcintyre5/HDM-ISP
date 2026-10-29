'use strict';

const express = require('express');
const router = express.Router();

const providerAuth = require('../../middleware/provider/auth');
const providerScope = require('../../middleware/provider/scope');

router.use(providerAuth);
router.use(providerScope);

router.use('/profile', require('./profileRoutes'));
router.use('/billing', require('./billingRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));
router.use('/plans', require('./planRoutes'));
router.use('/routers', require('./routerRoutes'));
router.use('/customers', require('./customerRoutes'));
router.use('/vouchers', require('./voucherRoutes'));
router.use('/transactions', require('./transactionRoutes'));
router.use('/reports', require('./reportRoutes'));
router.use('/renewals', require('./renewalRoutes'));
router.use('/notifications', require('./notificationRoutes'));
router.use('/settings/mpesa', require('./mpesaSettingsRoutes'));
router.use('/settings', require('./settingsRoutes'));

module.exports = router;