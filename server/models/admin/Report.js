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
    type: {
      type: String,
      enum: ['daily', 'monthly'],
      required: true,
    },
    date: { type: Date, required: true, index: true },
    generatedAt: { type: Date, default: Date.now },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

schema.index({ providerId: 1, type: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Report', schema);