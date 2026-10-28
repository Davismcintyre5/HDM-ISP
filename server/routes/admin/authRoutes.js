'use strict';

const express = require('express');
const router = express.Router();

const auth = require('../../controllers/admin/authController');
const adminAuth = require('../../middleware/admin/auth');

router.post('/login', auth.login);
router.post('/refresh', auth.refresh);

router.use(adminAuth);

router.get('/me', auth.me);
router.post('/logout', auth.logout);
router.post('/change-password', auth.changePassword);

module.exports = router;