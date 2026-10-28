const TONE_MAP = {
  active: 'success',
  online: 'success',
  completed: 'success',
  unused: 'success',
  used: 'info',
  pending: 'warning',
  unknown: 'warning',
  expiring: 'warning',
  suspended: 'danger',
  offline: 'danger',
  failed: 'danger',
  revoked: 'danger',
  expired: 'danger',
  archived: 'neutral',
  draft: 'neutral',
  customer_purchase: 'info',
  provider_subscription: 'info',
};

const LABEL_MAP = {
  active: 'Active',
  online: 'Online',
  offline: 'Offline',
  unknown: 'Unknown',
  suspended: 'Suspended',
  expired: 'Expired',
  pending: 'Pending',
  completed: 'Completed',
  failed: 'Failed',
  unused: 'Unused',
  used: 'Used',
  revoked: 'Revoked',
  archived: 'Archived',
  draft: 'Draft',
  customer_purchase: 'Customer purchase',
  provider_subscription: 'Provider subscription',
};

export function statusTone(status) {
  return TONE_MAP[status] || 'neutral';
}

export function statusLabel(status) {
  if (!status) return '—';
  return LABEL_MAP[status] || status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}