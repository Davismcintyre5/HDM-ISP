'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    recipientType: {
      type: String,
      enum: ['admin', 'provider'],
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '' },
    link: { type: String, default: null },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

schema.index({ recipientId: 1, recipientType: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('InAppNotification', schema);