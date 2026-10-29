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
    code: {
      type: String,
      enum: ['mpesa_stk', 'mpesa_paybill', 'mpesa_till', 'mpesa_send', 'cash', 'bank'],
      required: true,
    },
    displayName: { type: String, required: true, trim: true },
    isEnabled: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: 'provider_payment_methods' }
);

schema.index({ providerId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('ProviderPaymentMethod', schema);