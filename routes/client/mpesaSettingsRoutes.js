'use strict';

const express = require('express');
const router = express.Router();

const mpesa = require('../../controllers/client/mpesaSettingsController');

router.get('/', mpesa.getMpesaSettings);
router.put('/', mpesa.updateMpesaSettings);
router.post('/test', mpesa.testMpesaSettings);

module.exports = router;