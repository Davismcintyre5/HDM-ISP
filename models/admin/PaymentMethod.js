'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      enum: [
        'stripe',
        'mpesa_stk',
        'mpesa_send',
        'mpesa_till',
        'mpesa_paybill',
        'bank',
        'cash',
      ],
    },
    label: { type: String, required: true },
    mode: { type: String, enum: ['auto', 'manual'], default: 'manual' },
    enabled: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

schema.index({ sortOrder: 1 });

module.exports = mongoose.model('PaymentMethod', schema);