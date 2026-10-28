'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed },
    description: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlatformSettings', schema);