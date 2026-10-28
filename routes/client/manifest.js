'use strict';

const express = require('express');
const router = express.Router();
const manifest = require('../../controllers/client/manifestController');
const auth = require('../../middleware/provider/auth');

// Accept token via query string for manifest fetch (browsers cannot send Authorization on <link rel=manifest>)
function allowQueryToken(req, res, next) {
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
}

router.get('/', allowQueryToken, auth, manifest.getManifest);

module.exports = router;