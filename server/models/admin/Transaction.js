'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', index: true },
    phone: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'KES' },
    checkoutRequestId: { type: String, index: true },
    merchantRequestId: { type: String },
    mpesaReceiptNumber: { type: String, unique: true, sparse: true },
    resultCode: { type: String },
    resultDesc: { type: String },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    kind: {
      type: String,
      enum: ['provider_subscription', 'customer_purchase'],
      default: 'customer_purchase',
      index: true,
    },
    voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher' },
    rawCallback: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

schema.index({ providerId: 1, createdAt: -1 });
schema.index({ providerId: 1, phone: 1, createdAt: -1 });
schema.index({ providerId: 1, kind: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', schema);