'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['hotspot', 'pppoe'], default: 'hotspot' },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'KES' },
    validityUnit: { type: String, enum: ['minutes', 'hours', 'days', 'months'], required: true },
    validityValue: { type: Number, required: true, min: 1 },
    rateLimitDownKbps: { type: Number, required: true, min: 0 },
    rateLimitUpKbps: { type: Number, required: true, min: 0 },
    dataCapMb: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
  },
  { timestamps: true }
);

schema.index({ providerId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Plan', schema);