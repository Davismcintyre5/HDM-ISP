import { api, trimParams } from './axios';

export function getCurrentSubscription() {
  return api.get('/api/client/billing/current');
}

export function getAvailablePlans() {
  return api.get('/api/client/billing/available-plans');
}

export function initiateUpgrade(billingPlanId) {
  return api.post('/api/client/billing/upgrade/initiate', { billingPlanId });
}

export function initiateRenewal(billingPlanId) {
  return api.post('/api/client/billing/renew/initiate', billingPlanId ? { billingPlanId } : {});
}

export function listInvoices(params) {
  return api.get('/api/client/billing/invoices', { params: trimParams(params) });
}

export function getInvoice(id) {
  return api.get(`/api/client/billing/invoices/${id}`);
}

export function payInvoiceStk(id, phone) {
  return api.post(`/api/client/billing/invoices/${id}/pay/stk`, { phone });
}

export function markInvoicePaid(id, payload = {}) {
  return api.post(`/api/client/billing/invoices/${id}/mark-paid`, payload);
}

export function getPaymentStatus(checkoutRequestId) {
  return api.get(`/api/client/billing/payment/status/${checkoutRequestId}`);
}

export function listBillingTransactions(params) {
  return api.get('/api/client/billing/transactions', { params: trimParams(params) });
}