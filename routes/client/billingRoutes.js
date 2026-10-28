'use strict';

const express = require('express');
const router = express.Router();

const billing = require('../../controllers/client/billingController');

router.get('/current', billing.getCurrent);
router.get('/available-plans', billing.getAvailablePlans);
router.post('/upgrade/initiate', billing.initiateUpgrade);
router.post('/renew/initiate', billing.initiateRenewal);

router.get('/invoices', billing.listInvoices);
router.get('/invoices/:id', billing.getInvoice);
router.post('/invoices/:id/pay/stk', billing.payInvoiceStk);
router.post('/invoices/:id/mark-paid', billing.markInvoicePaid);

router.get('/payment/status/:checkoutRequestId', billing.getInvoicePaymentStatus);

router.get('/transactions', billing.listTransactions);

module.exports = router;