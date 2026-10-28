'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, sparse: true, lowercase: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    status: { type: String, enum: ['active', 'suspended', 'pending'], default: 'pending' },
    logoUrl: { type: String },
    avatarUrl: { type: String },
    billingPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'BillingPlan' },
    billingStatus: { type: String, enum: ['active', 'overdue', 'suspended'], default: 'active' },
    subscriptionEndsAt: { type: Date, default: null },
    subscriptionExpiredAt: { type: Date, default: null },
    subscriptionNoticesSent: { type: [Number], default: [] },
    lastSeenAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Provider', schema);