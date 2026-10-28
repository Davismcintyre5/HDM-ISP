'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    status: { type: String, enum: ['active', 'suspended', 'pending'], default: 'pending' },
    refreshTokenHash: { type: String, select: false },
    lastLoginAt: { type: Date },
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

module.exports = mongoose.model('User', schema);