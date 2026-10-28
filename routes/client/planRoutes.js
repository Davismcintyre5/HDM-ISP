'use strict';

const express = require('express');
const router = express.Router();

const plans = require('../../controllers/client/planController');

router.get('/', plans.list);
router.post('/', plans.create);
router.get('/:id', plans.getOne);
router.patch('/:id', plans.update);
router.delete('/:id', plans.remove);

module.exports = router;