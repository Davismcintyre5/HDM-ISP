'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    type: { type: String, enum: ['terms', 'privacy', 'refund', 'aup'], required: true, unique: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    version: { type: String, default: '1.0' },
    isActive: { type: Boolean, default: true },
    effectiveFrom: { type: Date, default: Date.now },
    createdByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Legal', schema);