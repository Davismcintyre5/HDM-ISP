'use strict';

const express = require('express');

const router = express.Router();

router.use('/client', require('./client'));
router.use('/admin', require('./admin'));
router.use('/captive', require('./captive'));
router.use('/public', require('./public'));

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API',
    groups: ['client', 'admin', 'captive', 'public'],
  });
});

module.exports = router;