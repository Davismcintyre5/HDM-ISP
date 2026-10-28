'use strict';

const express = require('express');
const router = express.Router();

const transactions = require('../../controllers/client/transactionController');

router.get('/', transactions.list);
router.get('/summary', transactions.summary);
router.get('/:id', transactions.getOne);

module.exports = router;