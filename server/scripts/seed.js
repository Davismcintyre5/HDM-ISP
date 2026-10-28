require('./dnsSet');
require('dotenv/config');

const readline = require('readline');

const { connect, disconnect } = require('../config/database');
const BillingPlan = require('../models/admin/BillingPlan');
const PaymentMethod = require('../models/admin/PaymentMethod');
const PlatformSettings = require('../models/admin/PlatformSettings');
const Legal = require('../models/admin/Legal');

const C = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise((resolve) => rl.question(question, (a) => resolve(a.trim())));
}

function clear() {
  process.stdout.write('\x1b[2J\x1b[0f');
}

function line(str = '') {
  console.log(str);
}

function heading(title) {
  line();
  line(`${C.bold}${C.cyan}${title}${C.reset}`);
  line(`${C.dim}${'─'.repeat(title.length)}${C.reset}`);
  line();
}

function ok(msg) {
  line(`${C.green}✔${C.reset} ${msg}`);
}

function warn(msg) {
  line(`${C.yellow}⚠${C.reset} ${msg}`);
}

function err(msg) {
  line(`${C.red}✖${C.reset} ${msg}`);
}

async function seedBillingPlans() {
  const plans = [
    {
      name: 'Free Trial',
      description: '14-day free trial with full access.',
      price: 0,
      currency: 'KES',
      billingCycle: 'trial',
      trialDays: 14,
      features: ['hotspot', 'pppoe', 'vouchers', 'sms', 'email'],
      status: 'active',
    },
    {
      name: 'Monthly',
      description: 'Monthly subscription with full access.',
      price: 1500,
      currency: 'KES',
      billingCycle: 'monthly',
      trialDays: 0,
      features: ['hotspot', 'pppoe', 'vouchers', 'sms', 'email', 'reports', 'priority'],
      status: 'active',
    },
    {
      name: 'One-Time',
      description: 'One-time payment. Access never expires.',
      price: 15000,
      currency: 'KES',
      billingCycle: 'onetime',
      trialDays: 0,
      features: ['hotspot', 'pppoe', 'vouchers', 'sms', 'email', 'reports', 'priority'],
      status: 'active',
    },
  ];

  let upserted = 0;
  for (const plan of plans) {
    await BillingPlan.updateOne(
      { name: plan.name },
      { $setOnInsert: plan },
      { upsert: true }
    );
    upserted++;
  }
  ok(`Billing plans: ${upserted} upserted`);
}

async function seedPaymentMethods() {
  const methods = [
    {
      code: 'mpesa_stk',
      label: 'M-Pesa STK Push',
      mode: 'auto',
      enabled: false,
      order: 1,
      config: {
        env: 'sandbox',
        consumerKey: '',
        consumerSecret: '',
        shortcode: '',
        passkey: '',
        callbackUrl: '',
      },
    },
    {
      code: 'mpesa_send',
      label: 'M-Pesa Send Money',
      mode: 'manual',
      enabled: false,
      order: 2,
      config: { phone: '', name: '' },
    },
    {
      code: 'mpesa_till',
      label: 'M-Pesa Till',
      mode: 'manual',
      enabled: false,
      order: 3,
      config: { tillNumber: '', name: '' },
    },
    {
      code: 'mpesa_paybill',
      label: 'M-Pesa Paybill',
      mode: 'manual',
      enabled: false,
      order: 4,
      config: { paybillNumber: '', accountNumber: '', name: '' },
    },
    {
      code: 'bank',
      label: 'Bank Transfer',
      mode: 'manual',
      enabled: false,
      order: 5,
      config: { bankName: '', accountName: '', accountNumber: '', branch: '', swift: '' },
    },
    {
      code: 'cash',
      label: 'Cash',
      mode: 'manual',
      enabled: true,
      order: 6,
      config: {},
    },
  ];

  let upserted = 0;
  for (const m of methods) {
    await PaymentMethod.updateOne(
      { code: m.code },
      { $setOnInsert: m },
      { upsert: true }
    );
    upserted++;
  }
  ok(`Payment methods: ${upserted} upserted`);
}

async function seedSettings() {
  const settings = [
    ['branding.logoUrl', null],
    ['branding.faviconUrl', null],
    ['branding.logoDarkUrl', null],
    ['branding.faviconDarkUrl', null],
    ['branding.primaryColor', '#2563eb'],
    ['branding.appName', 'HDM Technologies'],
    ['support.phone', '+254 700 000 000'],
    ['support.email', 'support@hdm.co.ke'],
    ['support.website', 'https://hdm.co.ke'],
    ['default_currency', 'KES'],
    ['default_country', 'KE'],
    ['registration_open', true],
    ['maintenance_mode', false],
    ['session.idleTimeoutMinutes', 60],
    ['session.maxConcurrentDevices', 1],
    ['notifications.smsEnabled', true],
    ['notifications.emailEnabled', true],
  ];

  let upserted = 0;
  for (const [key, value] of settings) {
    await PlatformSettings.updateOne(
      { key },
      { $setOnInsert: { key, value } },
      { upsert: true }
    );
    upserted++;
  }
  ok(`Platform settings: ${upserted} upserted`);
}

async function seedLegals() {
  const terms = `# Terms of Service

By using HDM Technologies you agree to these terms.

## 1. Account
You are responsible for your account and any activity under it.

## 2. Payments
Subscription fees are billed as agreed at signup.

## 3. Data
You retain ownership of your business data.

## 4. Termination
You may cancel at any time. We may suspend accounts that violate these terms.

## 5. Contact
support@hdm.co.ke
`;

  const privacy = `# Privacy Policy

We collect the minimum data needed to run HDM Technologies.

## What we collect
- Business name, owner name, email, phone
- Usage logs

## How we use it
- To operate your account
- To send transactional emails and SMS

## What we don't do
- Sell your data
- Share with third parties except service providers

## Contact
support@hdm.co.ke
`;

  const refund = `# Refund Policy

Subscription fees are non-refundable once a billing period has started.

If you were charged in error, contact support within 7 days.

support@hdm.co.ke
`;

  const aup = `# Acceptable Use Policy

Do not use HDM Technologies to:
- Break any law
- Send spam through email or SMS features
- Attempt to access other providers' data

Violation may lead to suspension or termination.
`;

  const docs = [
    { type: 'terms', title: 'Terms of Service', content: terms },
    { type: 'privacy', title: 'Privacy Policy', content: privacy },
    { type: 'refund', title: 'Refund Policy', content: refund },
    { type: 'aup', title: 'Acceptable Use Policy', content: aup },
  ];

  let inserted = 0;
  for (const d of docs) {
    const existing = await Legal.findOne({ type: d.type }).lean();
    if (existing) continue;

    await Legal.create({
      type: d.type,
      version: '1.0',
      title: d.title,
      content: d.content,
      isActive: true,
      effectiveFrom: new Date(),
    });
    inserted++;
  }
  ok(`Legal docs: ${inserted} inserted`);
}

async function menu() {
  clear();
  line();
  line(`${C.bold}${C.cyan}╭───────────────────────────────────────╮${C.reset}`);
  line(`${C.bold}${C.cyan}│   HDM Technologies — Seed CLI         │${C.reset}`);
  line(`${C.bold}${C.cyan}╰───────────────────────────────────────╯${C.reset}`);
  line();
  line(`  ${C.bold}1${C.reset}.  Seed all`);
  line(`  ${C.bold}2${C.reset}.  Seed platform settings`);
  line(`  ${C.bold}3${C.reset}.  Seed billing plans`);
  line(`  ${C.bold}4${C.reset}.  Seed payment methods`);
  line(`  ${C.bold}5${C.reset}.  Seed legal docs`);
  line();
  line(`  ${C.dim}0.  Exit${C.reset}`);
  line();

  return ask(`${C.cyan}›${C.reset} Select option: `);
}

async function main() {
  clear();
  line(`${C.dim}Connecting to MongoDB...${C.reset}`);

  try {
    await connect();
    ok('Connected');
  } catch (e) {
    err(`Connection failed: ${e.message}`);
    process.exit(1);
  }

  while (true) {
    const choice = await menu();

    try {
      heading('Seeding');

      if (choice === '1') {
        await seedBillingPlans();
        await seedPaymentMethods();
        await seedSettings();
        await seedLegals();
        line();
        ok('All seeds complete');
      } else if (choice === '2') {
        await seedSettings();
      } else if (choice === '3') {
        await seedBillingPlans();
      } else if (choice === '4') {
        await seedPaymentMethods();
      } else if (choice === '5') {
        await seedLegals();
      } else if (choice === '0') {
        break;
      } else {
        continue;
      }
    } catch (e) {
      err(e.message);
    }

    await ask(`${C.dim}Press Enter to continue...${C.reset}`);
  }

  rl.close();
  await disconnect();
  line();
  ok('Bye');
  process.exit(0);
}

main();