'use strict';

const express = require('express');
const router = express.Router();

const invoices = require('../../controllers/admin/invoiceController');

router.get('/', invoices.list);
router.get('/:id', invoices.getOne);

module.exports = router;