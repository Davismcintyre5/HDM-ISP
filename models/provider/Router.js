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
    name: { type: String, required: true, trim: true },
    ipAddress: { type: String, required: true, trim: true },
    apiPort: { type: Number, default: 8728 },
    apiUsername: { type: String, required: true },
    apiPasswordEnc: { type: String, required: true, select: false },
    radiusSecretEnc: { type: String, required: true, select: false },
    siteName: { type: String, trim: true },
    status: {
      type: String,
      enum: ['online', 'offline', 'unknown'],
      default: 'unknown',
    },
    lastSeenAt: { type: Date },
  },
  { timestamps: true }
);

schema.index({ providerId: 1, ipAddress: 1 }, { unique: true });

schema.set('toJSON', {
  transform: (_, ret) => {
    delete ret.apiPasswordEnc;
    delete ret.radiusSecretEnc;
    return ret;
  },
});

module.exports = mongoose.model('Router', schema);