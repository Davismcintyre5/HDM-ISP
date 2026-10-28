const DASH = '—';

export function formatMoney(amount, currency = 'KES') {
  if (amount === null || amount === undefined || isNaN(amount)) return DASH;
  return `${currency} ${Number(amount).toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatNumber(n) {
  if (n === null || n === undefined || isNaN(n)) return DASH;
  return Number(n).toLocaleString('en-KE');
}

export function formatDate(iso) {
  if (!iso) return DASH;
  const d = new Date(iso);
  if (isNaN(d)) return DASH;
  return d.toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso) {
  if (!iso) return DASH;
  const d = new Date(iso);
  if (isNaN(d)) return DASH;
  return d.toLocaleString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelative(iso) {
  if (!iso) return DASH;
  const d = new Date(iso);
  if (isNaN(d)) return DASH;
  const diff = Math.round((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} day(s) ago`;
  return formatDate(iso);
}

export function formatRateLimit(kbps) {
  if (kbps === null || kbps === undefined) return DASH;
  const n = Number(kbps);
  if (!n) return 'Unlimited';
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)} Mbps`;
  return `${n} Kbps`;
}

export function formatValidity(value, unit) {
  if (value === null || value === undefined) return DASH;
  if (!unit) return `${value}`;
  const plural = Number(value) === 1 ? unit.replace(/s$/, '') : unit;
  return `${value} ${plural}`;
}

export function formatDataCap(mb) {
  if (mb === null || mb === undefined) return DASH;
  const n = Number(mb);
  if (n === 0) return 'Unlimited';
  if (n >= 1024) return `${(n / 1024).toFixed(n % 1024 === 0 ? 0 : 1)} GB`;
  return `${n} MB`;
}

export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return DASH;
  const s = Math.max(0, Math.floor(Number(seconds)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

export function formatPhone(phone) {
  if (!phone) return DASH;
  const s = String(phone).replace(/\D/g, '');
  if (s.length === 12 && s.startsWith('254')) {
    return `+${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6, 9)} ${s.slice(9)}`;
  }
  if (s.length === 10 && s.startsWith('0')) {
    return `${s.slice(0, 4)} ${s.slice(4, 7)} ${s.slice(7)}`;
  }
  return phone;
}

export function sanitizePhone(input) {
  if (!input) return null;
  let s = String(input).replace(/[\s\-()]/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('0')) s = '254' + s.slice(1);
  if (!s.startsWith('254')) s = '254' + s;
  if (!/^254\d{9}$/.test(s)) return null;
  return s;
}

export function formatVoucherCode(code) {
  if (!code) return DASH;
  const s = String(code);
  if (s.length <= 4) return s;
  return s.match(/.{1,4}/g).join('-');
}

export function formatMbpsToKbps(mbps) {
  return Math.round(Number(mbps) * 1000);
}

export function formatKbpsToMbps(kbps) {
  return Number(kbps) / 1000;
}