'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', index: true },
    channel: { type: String, enum: ['email', 'sms'], required: true },
    to: { type: String, required: true },
    messageId: { type: String },
    status: { type: String, enum: ['sent', 'failed', 'queued'], required: true },
    creditsUsed: { type: Number, default: 0 },
    hdmCode: { type: String },
    error: { type: String },
    template: { type: String },
  },
  { timestamps: true }
);

schema.index({ providerId: 1, createdAt: -1 });

module.exports = mongoose.model('NotificationLog', schema);