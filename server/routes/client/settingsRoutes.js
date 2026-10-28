'use strict';

const express = require('express');
const router = express.Router();

const settings = require('../../controllers/client/settingsController');

router.get('/', settings.list);
router.post('/bulk', settings.bulkUpdate);
router.patch('/:key', settings.update);

module.exports = router;