'use strict';

const express = require('express');
const router = express.Router();

const billing = require('../../controllers/admin/billingController');
const adminRole = require('../../middleware/admin/role');

router.get('/transactions', billing.listTransactions);
router.get('/transactions/:id', billing.getTransaction);
router.get('/pending-payments', billing.listPendingPayments);
router.get('/upgrade-payments', billing.listUpgradePayments);
router.get('/summary', billing.summary);
router.post('/confirm-payment', adminRole('superadmin'), billing.confirmPayment);
router.post('/reject-payment', adminRole('superadmin'), billing.rejectPayment);

module.exports = router;