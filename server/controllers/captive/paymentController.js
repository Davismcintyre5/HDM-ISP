'use strict';

const Transaction = require('../../models/admin/Transaction');
const PendingProvider = require('../../models/admin/PendingProvider');
const Plan = require('../../models/provider/Plan');
const Provider = require('../../models/admin/Provider');
const mpesaService = require('../../services/mpesaService');
const ApiError = require('../../utils/apiError');
const { success, created } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const initiateStk = asyncHandler(async (req, res) => {
  const { providerId, planId, phone } = req.body;
  if (!providerId || !planId || !phone) {
    throw ApiError.badRequest('providerId, planId, phone required');
  }

  const provider = await Provider.findById(providerId).lean();
  if (!provider) throw ApiError.notFound('Provider not found');

  const plan = await Plan.findOne({ _id: planId, providerId, status: 'active' }).lean();
  if (!plan) throw ApiError.notFound('Plan not found');

  const normalized = mpesaService.normalizePhone(phone);
  if (!normalized || normalized.length < 10) {
    throw ApiError.badRequest('Invalid phone number');
  }

  const accountRef = `WIFI-${providerId.toString().slice(-6)}-${planId.toString().slice(-6)}`;

  const result = await mpesaService.initiateSTKPush({
    phone: normalized,
    amount: plan.price,
    accountReference: accountRef,
    description: `${provider.name} ${plan.name}`,
  });

  if (!result.success) {
    throw ApiError.badGateway(
      result.error?.errorMessage || 'Failed to initiate STK push',
      { raw: result.error }
    );
  }

  const tx = await Transaction.create({
    providerId: provider._id,
    planId: plan._id,
    phone: normalized,
    amount: plan.price,
    currency: plan.currency || 'KES',
    checkoutRequestId: result.checkoutRequestId,
    merchantRequestId: result.merchantRequestId,
    status: 'pending',
  });

  return created(res, {
    transactionId: tx._id,
    checkoutRequestId: result.checkoutRequestId,
    customerMessage: result.customerMessage,
    amount: plan.price,
    currency: plan.currency || 'KES',
  });
});

const paymentStatus = asyncHandler(async (req, res) => {
  const { checkoutRequestId } = req.params;
  if (!checkoutRequestId) throw ApiError.badRequest('checkoutRequestId required');

  const tx = await Transaction.findOne({ checkoutRequestId }).lean();
  if (!tx) throw ApiError.notFound('Transaction not found');

  const isPending = tx.status === 'pending';

  if (isPending) {
    const query = await mpesaService.querySTKStatus(checkoutRequestId);
    if (query.success && query.resultCode !== '500.001.1001' && query.resultCode !== '4999') {
      if (query.resultCode === '0') {
        await Transaction.updateOne(
          { _id: tx._id, status: 'pending' },
          {
            $set: {
              status: 'completed',
              resultCode: query.resultCode,
              resultDesc: query.resultDesc,
            },
          }
        );
        return success(res, { status: 'completed', checkoutRequestId });
      }
      await Transaction.updateOne(
        { _id: tx._id, status: 'pending' },
        {
          $set: {
            status: query.resultCode === '1032' ? 'cancelled' : 'failed',
            resultCode: query.resultCode,
            resultDesc: query.resultDesc,
          },
        }
      );
      return success(res, {
        status: query.resultCode === '1032' ? 'cancelled' : 'failed',
        checkoutRequestId,
        resultDesc: query.resultDesc,
      });
    }
  }

  return success(res, {
    status: tx.status,
    checkoutRequestId,
    resultDesc: tx.resultDesc || null,
    mpesaReceiptNumber: tx.mpesaReceiptNumber || null,
  });
});

module.exports = { initiateStk, paymentStatus };