'use strict';

const Invoice = require('../models/admin/Invoice');
const paymentInstructionsService = require('./paymentInstructionsService');
const ApiError = require('../utils/apiError');
const { logger = console } = require('../utils/logger') || {};
const { generateInvoiceNumber } = require('../utils/invoiceNumber');

const DUE_HOURS = 3;

function intervalLabel(billingCycle) {
  if (billingCycle === 'onetime') return 'One-time';
  if (billingCycle === 'trial') return 'Free trial';
  return 'Monthly';
}

async function createInvoiceWithRetry(data, attempts = 5) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await Invoice.create({
        ...data,
        invoiceNumber: generateInvoiceNumber(),
      });
    } catch (err) {
      if (err.code !== 11000) throw err;
      logger.warn({ attempt: i + 1 }, 'invoice number collision, retrying');
    }
  }
  throw ApiError.internal('Could not generate a unique invoice number');
}

async function generateRegistrationInvoice({ providerId, owner, provider, plan }) {
  if (!providerId || !owner) {
    throw ApiError.badRequest('providerId and owner required');
  }

  const price = plan?.price ?? 0;
  const currency = plan?.currency || 'KES';
  const planName = plan?.name || 'Plan';
  const label = intervalLabel(plan?.billingCycle);

  const issuedAt = new Date();
  const dueDate = new Date(issuedAt.getTime() + DUE_HOURS * 60 * 60 * 1000);

  const items = [
    {
      productId: plan?._id || null,
      name: `${provider?.name || 'Provider'} ${planName} Plan`,
      description: `${label} · ${provider?.name || ''}`,
      qty: 1,
      unitPrice: price,
      subtotal: price,
    },
  ];

  const subtotal = price;
  const total = subtotal;

  const invoiceNumber = generateInvoiceNumber();

  const instructions = await paymentInstructionsService.getPaymentInstructions({
    amount: total,
    currency,
    invoiceNumber,
  });

  const invoice = await createInvoiceWithRetry({
    providerId,
    invoiceNumber,
    purpose: 'registration',
    customerId: null,
    customerSnapshot: {
      name: owner.name,
      email: owner.email,
      phone: owner.phone || null,
      address: null,
    },
    items,
    subtotal,
    discount: 0,
    tax: 0,
    total,
    amountPaid: 0,
    amountDue: total,
    currency,
    status: 'sent',
    dueDate,
    issuedAt,
    sentAt: issuedAt,
    notes: `Registration invoice. Payment due within ${DUE_HOURS} hours to secure your account.`,
    paymentInstructions: instructions,
    createdBy: owner._id,
  });

  logger.info(
    {
      providerId,
      invoiceNumber: invoice.invoiceNumber,
      total,
      dueHours: DUE_HOURS,
      methodCount: instructions.length,
      billingCycle: plan?.billingCycle,
      purpose: 'registration',
    },
    'registration invoice created'
  );

  return { invoice, instructions };
}

async function generateUpgradeInvoice({ provider, plan, createdBy = null }) {
  if (!provider || !plan) {
    throw ApiError.badRequest('provider and plan required');
  }

  const price = plan.price ?? 0;
  const currency = plan.currency || 'KES';
  const planName = plan.name || 'Plan';
  const label = intervalLabel(plan.billingCycle);

  const issuedAt = new Date();
  const dueDate = new Date(issuedAt.getTime() + DUE_HOURS * 60 * 60 * 1000);

  const items = [
    {
      productId: plan._id,
      name: `${planName} Plan`,
      description: `${label} · ${provider.name}`,
      qty: 1,
      unitPrice: price,
      subtotal: price,
    },
  ];

  const subtotal = price;
  const total = subtotal;

  const invoiceNumber = generateInvoiceNumber();

  const instructions = await paymentInstructionsService.getPaymentInstructions({
    amount: total,
    currency,
    invoiceNumber,
  });

  const invoice = await createInvoiceWithRetry({
    providerId: provider._id,
    invoiceNumber,
    purpose: 'upgrade',
    customerId: null,
    customerSnapshot: {
      name: provider.name,
      email: provider.email,
      phone: provider.phone || null,
      address: null,
    },
    items,
    subtotal,
    discount: 0,
    tax: 0,
    total,
    amountPaid: 0,
    amountDue: total,
    currency,
    status: 'sent',
    dueDate,
    issuedAt,
    sentAt: issuedAt,
    notes: `Upgrade invoice for ${planName}. Payment due within ${DUE_HOURS} hours.`,
    paymentInstructions: instructions,
    createdBy: createdBy || provider.userId,
  });

  logger.info(
    {
      providerId: provider._id,
      invoiceNumber: invoice.invoiceNumber,
      total,
      planName,
      billingCycle: plan.billingCycle,
      methodCount: instructions.length,
      purpose: 'upgrade',
    },
    'upgrade invoice created'
  );

  return { invoice, instructions };
}

async function generateRenewalInvoice({ provider, plan, createdBy = null }) {
  if (!provider || !plan) {
    throw ApiError.badRequest('provider and plan required');
  }

  const price = plan.price ?? 0;
  const currency = plan.currency || 'KES';
  const planName = plan.name || 'Plan';
  const label = intervalLabel(plan.billingCycle);

  const issuedAt = new Date();
  const dueDate = new Date(issuedAt.getTime() + DUE_HOURS * 60 * 60 * 1000);

  const items = [
    {
      productId: plan._id,
      name: `${planName} Plan Renewal`,
      description: `${label} · ${provider.name}`,
      qty: 1,
      unitPrice: price,
      subtotal: price,
    },
  ];

  const subtotal = price;
  const total = subtotal;

  const invoiceNumber = generateInvoiceNumber();

  const instructions = await paymentInstructionsService.getPaymentInstructions({
    amount: total,
    currency,
    invoiceNumber,
  });

  const invoice = await createInvoiceWithRetry({
    providerId: provider._id,
    invoiceNumber,
    purpose: 'renewal',
    customerId: null,
    customerSnapshot: {
      name: provider.name,
      email: provider.email,
      phone: provider.phone || null,
      address: null,
    },
    items,
    subtotal,
    discount: 0,
    tax: 0,
    total,
    amountPaid: 0,
    amountDue: total,
    currency,
    status: 'sent',
    dueDate,
    issuedAt,
    sentAt: issuedAt,
    notes: `Renewal invoice for ${planName}. Payment due within ${DUE_HOURS} hours.`,
    paymentInstructions: instructions,
    createdBy: createdBy || provider.userId,
  });

  logger.info(
    {
      providerId: provider._id,
      invoiceNumber: invoice.invoiceNumber,
      total,
      planName,
      billingCycle: plan.billingCycle,
      methodCount: instructions.length,
      purpose: 'renewal',
    },
    'renewal invoice created'
  );

  return { invoice, instructions };
}

module.exports = {
  generateRegistrationInvoice,
  generateUpgradeInvoice,
  generateRenewalInvoice,
  DUE_HOURS,
};