'use strict';

const express = require('express');
const router = express.Router();

const vouchers = require('../../controllers/client/voucherController');

router.get('/', vouchers.list);
router.post('/generate', vouchers.generate);
router.post('/:code/revoke', vouchers.revoke);

module.exports = router;