'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'KES' },
    billingCycle: {
      type: String,
      enum: ['trial', 'monthly', 'onetime'],
      required: true,
    },
    trialDays: { type: Number, default: 0, min: 0 },
    features: { type: [String], default: [] },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
  },
  { timestamps: true }
);

schema.index({ billingCycle: 1, status: 1 });

module.exports = mongoose.model('BillingPlan', schema);