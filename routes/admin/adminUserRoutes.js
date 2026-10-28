'use strict';

const express = require('express');
const router = express.Router();

const adminUsers = require('../../controllers/admin/adminUserController');

router.get('/', adminUsers.list);
router.post('/', adminUsers.create);
router.patch('/:id', adminUsers.update);
router.delete('/:id', adminUsers.remove);

module.exports = router;