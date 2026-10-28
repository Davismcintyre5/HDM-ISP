'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    adminRole: { type: String, enum: ['superadmin', 'support'], default: 'support' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    lastLoginAt: { type: Date },
    refreshTokenHash: { type: String, select: false },
  },
  { timestamps: true }
);

schema.set('toJSON', {
  transform: (_, ret) => {
    delete ret.password;
    delete ret.refreshTokenHash;
    return ret;
  },
});

module.exports = mongoose.model('Admin', schema);