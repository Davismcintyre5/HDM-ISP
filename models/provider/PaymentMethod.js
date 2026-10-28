'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
    name: { type: String, enum: ['mpesa', 'cash', 'voucher'], required: true },
    displayName: { type: String, required: true },
    isEnabled: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

schema.index({ providerId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('PaymentMethod', schema);