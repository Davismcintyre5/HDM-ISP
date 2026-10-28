'use strict';

const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, default: null },
    name: { type: String, required: true },
    description: { type: String },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: ['registration', 'upgrade', 'renewal'],
      default: 'upgrade',
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    customerSnapshot: {
      name: { type: String },
      email: { type: String },
      phone: { type: String },
      address: { type: String },
    },
    items: { type: [itemSchema], default: [] },
    subtotal: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    amountDue: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'KES' },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded'],
      default: 'draft',
      index: true,
    },
    dueDate: { type: Date },
    issuedAt: { type: Date, default: Date.now },
    sentAt: { type: Date },
    paidAt: { type: Date },
    notes: { type: String },
    paymentInstructions: { type: mongoose.Schema.Types.Mixed, default: [] },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  { timestamps: true }
);

schema.index({ providerId: 1, status: 1 });
schema.index({ providerId: 1, purpose: 1, status: 1 });
schema.index({ providerId: 1, createdAt: -1 });

module.exports = mongoose.model('Invoice', schema);