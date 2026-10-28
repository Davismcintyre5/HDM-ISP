(function () {
  'use strict';

  const API = '/api';

  const state = {
    provider: null,
    plans: [],
    selectedPlan: null,
    checkoutRequestId: null,
    pollTimer: null,
  };

  const el = {};

  function cache() {
    el.loading = document.getElementById('screen-loading');
    el.error = document.getElementById('screen-error');
    el.errorMessage = document.getElementById('error-message');
    el.errorRetry = document.getElementById('error-retry');
    el.plans = document.getElementById('screen-plans');
    el.plansList = document.getElementById('plans-list');
    el.plansHint = document.getElementById('plans-hint');
    el.payment = document.getElementById('screen-payment');
    el.paymentForm = document.getElementById('payment-form');
    el.paymentSubmit = document.getElementById('payment-submit');
    el.paymentBack = document.getElementById('payment-back');
    el.paymentStatus = document.getElementById('payment-status');
    el.phone = document.getElementById('phone');
    el.selectedPlanSummary = document.getElementById('selected-plan-summary');
    el.voucher = document.getElementById('screen-voucher');
    el.voucherCode = document.getElementById('voucher-code');
    el.voucherHint = document.getElementById('voucher-hint');
    el.voucherContinue = document.getElementById('voucher-continue');
    el.success = document.getElementById('screen-success');
    el.logoWrap = document.getElementById('logo-wrap');
    el.logo = document.getElementById('logo');
    el.providerName = document.getElementById('provider-name');
    el.providerSupport = document.getElementById('provider-support');
    el.footerSupport = document.getElementById('footer-support');
    el.footerPowered = document.getElementById('footer-powered');
  }

  function showScreen(name) {
    ['loading', 'error', 'plans', 'payment', 'voucher', 'success'].forEach((k) => {
      if (el[k]) el[k].hidden = k !== name;
    });
  }

  function showError(message, retry) {
    el.errorMessage.textContent = message;
    el.errorRetry.hidden = !retry;
    showScreen('error');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[c]));
  }

  function getSlug() {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const lastTwo = parts.slice(-2).join('.');
      if (lastTwo === 'hdm.co.ke') {
        return parts[0];
      }
    }
    return null;
  }

  function getNasIp() {
    const params = new URLSearchParams(window.location.search);
    return params.get('nasip');
  }

  function formatDuration(plan) {
    const unit = plan.validityUnit;
    const value = plan.validityValue;
    const plural = value !== 1 ? 's' : '';
    if (unit === 'minutes') return `${value} minute${plural}`;
    if (unit === 'hours') return `${value} hour${plural}`;
    if (unit === 'days') return `${value} day${plural}`;
    if (unit === 'months') return `${value} month${plural}`;
    return `${value} ${unit}`;
  }

  function formatPrice(amount, currency) {
    const n = Number(amount || 0);
    const formatted = n.toLocaleString('en-KE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return `${currency || 'KES'} ${formatted}`;
  }

  function formatPhone(phone) {
    if (!phone) return '';
    const digits = String(phone).replace(/\D/g, '');
    if (digits.startsWith('254') && digits.length === 12) {
      return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
    }
    return phone;
  }

  async function loadProvider() {
    const slug = getSlug();
    const nasIp = getNasIp();

    let url;
    if (slug) {
      url = `${API}/public/site/provider/${encodeURIComponent(slug)}`;
    } else if (nasIp) {
      url = `${API}/public/site/plans?nasIpAddress=${encodeURIComponent(nasIp)}`;
    } else {
      throw new Error('This network is not configured. Contact your provider.');
    }

    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const body = await res.json().catch(() => ({}));

    if (!res.ok || !body.success) {
      throw new Error(body.message || 'Failed to load WiFi plans');
    }

    state.provider = body.data.provider;
    state.plans = body.data.plans || [];

    applyBranding();
    renderPlans();
    showScreen('plans');
  }

  function applyBranding() {
    const p = state.provider;

    el.providerName.textContent = p.name;
    document.title = `${p.name} — WiFi`;

    if (p.logoUrl) {
      el.logo.src = p.logoUrl;
      el.logo.alt = p.name;
      el.logo.onerror = () => {
        el.logoWrap.hidden = true;
      };
      el.logoWrap.hidden = false;
    } else {
      el.logoWrap.hidden = true;
    }

    if (p.primaryColor) {
      document.documentElement.style.setProperty('--brand', p.primaryColor);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', p.primaryColor);
    }

    const supportParts = [];
    if (p.supportPhone) supportParts.push(formatPhone(p.supportPhone));
    if (p.supportEmail) supportParts.push(p.supportEmail);

    if (supportParts.length > 0) {
      const supportText = supportParts.join(' · ');
      el.providerSupport.textContent = supportText;
      el.providerSupport.hidden = false;
      el.footerSupport.textContent = `Need help? ${supportText}`;
      el.footerSupport.hidden = false;
    } else {
      el.providerSupport.hidden = true;
      el.footerSupport.hidden = true;
    }

    el.footerPowered.textContent = `Powered by HDM Technologies`;
    el.footerPowered.hidden = false;
  }

  function renderPlans() {
    el.plansList.innerHTML = '';

    if (state.plans.length === 0) {
      el.plansHint.textContent = 'No plans are available right now. Please contact your provider.';
      return;
    }

    el.plansHint.textContent = 'Pick a package to get online.';

    state.plans.forEach((plan) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'plan-card';
      btn.innerHTML = `
        <span class="plan-name">${escapeHtml(plan.name)}</span>
        <span class="plan-meta">${escapeHtml(formatDuration(plan))}</span>
        <span class="plan-price">${escapeHtml(formatPrice(plan.price, plan.currency))}</span>
      `;
      btn.addEventListener('click', () => selectPlan(plan));
      el.plansList.appendChild(btn);
    });
  }

  function selectPlan(plan) {
    state.selectedPlan = plan;

    el.selectedPlanSummary.innerHTML = `
      <div><strong>${escapeHtml(plan.name)}</strong></div>
      <div class="muted small">${escapeHtml(formatDuration(plan))} · ${escapeHtml(formatPrice(plan.price, plan.currency))}</div>
    `;

    el.phone.value = '';
    el.paymentStatus.hidden = true;
    el.paymentStatus.className = 'status-box';

    showScreen('payment');
    setTimeout(() => el.phone.focus(), 100);
  }

  function setStatus(message, type) {
    el.paymentStatus.textContent = message;
    el.paymentStatus.className = 'status-box' + (type ? ' ' + type : '');
    el.paymentStatus.hidden = false;
  }

  async function submitPayment(e) {
    e.preventDefault();

    const phone = el.phone.value.trim();
    if (!phone) {
      setStatus('Please enter your phone number.', 'error');
      return;
    }

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setStatus('Please enter a valid phone number.', 'error');
      return;
    }

    el.paymentSubmit.disabled = true;
    setStatus('Sending payment prompt…');

    try {
      const res = await fetch(`${API}/captive/payment/stk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: state.provider.id,
          planId: state.selectedPlan._id,
          phone,
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok || !body.success) {
        throw new Error(body.message || 'Failed to send payment prompt');
      }

      state.checkoutRequestId = body.data.checkoutRequestId;

      setStatus(
        body.data.customerMessage ||
          'Check your phone and enter your M-Pesa PIN to complete the payment.'
      );

      pollStatus();
    } catch (err) {
      setStatus(err.message, 'error');
      el.paymentSubmit.disabled = false;
    }
  }

  function pollStatus() {
    if (state.pollTimer) clearTimeout(state.pollTimer);

    let attempts = 0;
    const maxAttempts = 40;

    const tick = async () => {
      attempts++;
      if (attempts > maxAttempts) {
        setStatus('Payment timed out. If you were charged, contact support.', 'error');
        el.paymentSubmit.disabled = false;
        return;
      }

      try {
        const res = await fetch(
          `${API}/captive/payment/status/${state.checkoutRequestId}`
        );
        const body = await res.json().catch(() => ({}));
        const data = body.data || {};

        if (data.status === 'completed') {
          showVoucher(data.voucherCode);
          return;
        }

        if (data.status === 'failed' || data.status === 'cancelled') {
          setStatus(
            data.resultDesc || 'Payment was cancelled or failed. Please try again.',
            'error'
          );
          el.paymentSubmit.disabled = false;
          return;
        }
      } catch (_) {
        // network hiccup, retry
      }

      state.pollTimer = setTimeout(tick, 3000);
    };

    tick();
  }

  function showVoucher(code) {
    if (code) {
      el.voucherCode.textContent = code;
      el.voucherHint.textContent = 'The code was also sent to your phone by SMS.';
    } else {
      el.voucherCode.textContent = '——';
      el.voucherHint.textContent = 'Check your phone — the voucher code was sent by SMS.';
    }
    showScreen('voucher');
  }

  function goToLogin() {
    const routerIp = getRouterLoginIp();

    if (state.checkoutRequestId) {
      // Optional: could redirect with voucher code pre-filled
      // For now, just go to the router login page.
    }

    window.location.href = `http://${routerIp}/login`;
  }

  function getRouterLoginIp() {
    const params = new URLSearchParams(window.location.search);
    const explicit = params.get('router');
    if (explicit) return explicit;

    // Default MikroTik hotspot gateway
    return '192.168.88.1';
  }

  function bind() {
    el.paymentForm.addEventListener('submit', submitPayment);
    el.paymentBack.addEventListener('click', () => {
      if (state.pollTimer) clearTimeout(state.pollTimer);
      el.paymentSubmit.disabled = false;
      showScreen('plans');
    });
    el.voucherContinue.addEventListener('click', goToLogin);
    el.errorRetry.addEventListener('click', () => {
      showScreen('loading');
      loadProvider().catch((err) => showError(err.message, true));
    });
  }

  async function init() {
    cache();
    bind();

    try {
      await loadProvider();
    } catch (err) {
      showError(err.message, true);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();