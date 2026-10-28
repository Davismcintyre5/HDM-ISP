'use strict';

const express = require('express');
const router = express.Router();

const customers = require('../../controllers/client/customerController');

router.get('/', customers.list);
router.post('/', customers.create);
router.get('/:id', customers.getOne);
router.post('/:id/suspend', customers.suspend);
router.post('/:id/activate', customers.activate);
router.delete('/:id', customers.remove);

module.exports = router;