'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    username: { type: String, required: true, index: true },
    sessionId: { type: String, required: true, unique: true },
    nasIpAddress: { type: String },
    startTime: { type: Date, required: true },
    stopTime: { type: Date },
    bytesIn: { type: Number, default: 0 },
    bytesOut: { type: Number, default: 0 },
    terminateCause: { type: String },
  },
  { timestamps: true }
);

schema.index({ providerId: 1, startTime: -1 });

module.exports = mongoose.model('Session', schema);