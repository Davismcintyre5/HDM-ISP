'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    username: { type: String, required: true, trim: true },
    passwordHash: { type: String, select: false },
    phone: { type: String, trim: true, index: true },
    email: { type: String, lowercase: true, trim: true },
    macAddress: { type: String, trim: true, index: true },
    siteName: { type: String, trim: true },
    status: { type: String, enum: ['active', 'expired', 'suspended'], default: 'active' },
    expiresAt: { type: Date },
    dataUsedMb: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

schema.index({ providerId: 1, username: 1 }, { unique: true });

schema.set('toJSON', {
  transform: (_, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = mongoose.model('Customer', schema);