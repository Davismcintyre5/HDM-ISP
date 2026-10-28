'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    businessName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },

    emailVerificationToken: { type: String, select: false, index: true },
    emailVerificationExpiresAt: { type: Date },

    status: {
      type: String,
      enum: [
        'unverified',
        'verified',
        'awaiting_payment',
        'awaiting_approval',
        'approved',
        'rejected',
        'expired',
      ],
      default: 'unverified',
      index: true,
    },

    billingPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'BillingPlan' },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },

    verifiedAt: { type: Date },
    paidAt: { type: Date },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },

    expiresAt: { type: Date },
  },
  { timestamps: true }
);

schema.index({ status: 1, createdAt: -1 });

schema.set('toJSON', {
  transform: (_, ret) => {
    delete ret.passwordHash;
    delete ret.emailVerificationToken;
    return ret;
  },
});

module.exports = mongoose.model('PendingProvider', schema);