require('./dnsSet');
require('dotenv/config');

const mongoose = require('mongoose');
const Provider = require('../models/admin/Provider');
const ProviderPaymentMethod = require('../models/provider/PaymentMethod');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const providers = await Provider.find({}, '_id name email').lean();
  console.log(`Found ${providers.length} provider(s)`);

  let created = 0;
  let skipped = 0;

  for (const p of providers) {
    const existing = await ProviderPaymentMethod.findOne({
      providerId: p._id,
      code: 'mpesa_stk',
    }).lean();

    if (existing) {
      skipped++;
      continue;
    }

    await ProviderPaymentMethod.create({
      providerId: p._id,
      code: 'mpesa_stk',
      displayName: 'M-Pesa',
      isEnabled: true,
      sortOrder: 1,
      config: { mode: 'global' },
    });

    created++;
    console.log(`  + ${p.name} <${p.email}> → mpesa_stk (global)`);
  }

  console.log('');
  console.log(`Created: ${created}`);
  console.log(`Skipped (already had mpesa_stk): ${skipped}`);
  console.log('Done');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});