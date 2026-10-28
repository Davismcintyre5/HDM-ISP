'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
      index: true,
    },
    key: { type: String, required: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed },
    description: { type: String },
  },
  { timestamps: true }
);

schema.index({ providerId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('Settings', schema);