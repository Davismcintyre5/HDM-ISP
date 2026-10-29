'use strict';

const env = require('../../config/env');
const ApiError = require('../../utils/apiError');

/**
 * Safaricom Daraja callback IPs.
 *
 * Source: Safaricom Daraja documentation (developer.safaricom.co.ke).
 * If Safaricom adds new callback IPs, this list must be updated. A rejected
 * callback from a genuinely new Safaricom IP is a sign the list is stale.
 */
const SAFARICOM_IPS = [
  '196.201.214.200',
  '196.201.214.206',
  '196.201.213.114',
  '196.201.214.207',
  '196.201.214.208',
  '196.201.213.44',
  '196.201.212.127',
  '196.201.212.138',
  '196.201.212.129',
  '196.201.212.136',
  '196.201.212.74',
  '196.201.212.69',
];

/**
 * Normalize an IP string. Express may return IPv4-mapped IPv6 addresses
 * (e.g. "::ffff:196.201.214.200") from req.ip when the connection is
 * IPv6 but the client is IPv4. Strip the prefix so the plain IPv4 is
 * compared against SAFARICOM_IPS.
 */
function normalizeIp(ip) {
  if (!ip) return '';
  return String(ip).replace(/^::ffff:/, '').trim();
}

/**
 * Extract the client IP from the request.
 *
 * Why we read X-Forwarded-For[0] directly instead of relying on req.ip:
 *
 * This app runs on Render behind Cloudflare. The proxy chain is:
 *
 *   Safaricom → Cloudflare → Render edge → Render internal → Node
 *
 * With three proxies, `trust proxy` must be set to 3 for Express to walk
 * back to the original client IP. req.ip resolves correctly when the
 * chain is stable.
 *
 * However, the chain is not always stable — Render has changed its proxy
 * architecture before, and Cloudflare can add/remove edge hops. Each
 * change requires updating `TRUST_PROXY_HOPS` in server.js. If that
 * number is off by one, req.ip resolves to Cloudflare's IP instead of
 * Safaricom's, and the allowlist rejects every callback.
 *
 * Reading X-Forwarded-For[0] directly is more robust:
 *
 * - Cloudflare OVERWRITES the inbound X-Forwarded-For header (does not
 *   append) by default. So the leftmost entry is always the original
 *   client IP as Cloudflare saw it — Safaricom's IP.
 * - Render's proxies APPEND to the header. The leftmost entry is
 *   untouched; new hops accumulate to the right.
 * - Therefore X-Forwarded-For[0] is Safaricom's IP regardless of how
 *   many proxies Render adds or removes.
 *
 * If Cloudflare is ever removed (Node exposed directly to the internet
 * behind Render), this strategy becomes spoofable: a client could send
 * `X-Forwarded-For: 196.201.213.44` with a malicious request, and this
 * function would return it. The defense against that is:
 *
 * - The callback body must contain a `checkoutRequestId` matching a
 *   pending Transaction in the database. A spoofed IP with a random
 *   checkoutRequestId is a no-op — no voucher issued, no state change.
 * - To forge a successful payment, an attacker would need to know a real
 *   checkoutRequestId from a pending STK push, which they cannot get
 *   without intercepting the STK response.
 *
 * So the spoofing risk is low in practice, but it exists if Cloudflare is
 * removed. In that case, switch this function to read `req.ip` with
 * `trust proxy: 2` (Render edge + Render internal) and accept that the
 * hop count is now a hard dependency.
 *
 * When in doubt, keep the current behavior: leftmost X-Forwarded-For with
 * Cloudflare in front. It has survived multiple Render proxy changes
 * without intervention.
 */
function extractClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    const first = xff.split(',')[0].trim();
    if (first) return normalizeIp(first);
  }
  return normalizeIp(req.ip);
}

module.exports = function mpesaIpAllowlist(req, res, next) {
  if (env.mpesa.env !== 'production') return next();

  const ip = extractClientIp(req);

  if (!SAFARICOM_IPS.includes(ip)) {
    console.warn('[mpesa] callback rejected — IP not allowed', {
      ip,
      reqIp: req.ip,
      xff: req.headers['x-forwarded-for'] || null,
      path: req.originalUrl,
    });
    return next(ApiError.forbidden('Source IP not allowed'));
  }

  next();
};