'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    code: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ['unused', 'used', 'expired', 'revoked'], default: 'unused' },
    usedByCustomerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    usedAt: { type: Date },
    expiresAt: { type: Date, required: true },
    batchId: { type: String, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Voucher', schema);