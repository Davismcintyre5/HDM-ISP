'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');

const profile = require('../../controllers/client/profileController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

router.get('/', profile.getProfile);
router.patch('/', profile.updateProfile);
router.post('/change-password', profile.changePassword);
router.post('/avatar', upload.single('avatar'), profile.uploadAvatar);
router.delete('/avatar', profile.removeAvatar);

module.exports = router;