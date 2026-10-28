require('./dnsSet');
require('dotenv/config');

const mongoose = require('mongoose');
const Provider = require('../models/admin/Provider');
require('../models/admin/BillingPlan'); // registers the schema for populate()

const email = process.argv[2] || 'davismcintyre5@gmail.com';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const provider = await Provider.findOneAndUpdate(
    { email: email.toLowerCase() },
    {
      $set: {
        status: 'suspended',
        billingStatus: 'overdue',
        subscriptionEndsAt: new Date(Date.now() - 60 * 1000),
        subscriptionExpiredAt: new Date(),
      },
    },
    { new: true }
  ).populate('billingPlanId');

  if (!provider) {
    console.log(`No provider found with email: ${email}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log('Provider expired:');
  console.log(JSON.stringify(
    {
      email: provider.email,
      name: provider.name,
      plan: provider.billingPlanId?.name || null,
      cycle: provider.billingPlanId?.billingCycle || null,
      status: provider.status,
      billingStatus: provider.billingStatus,
      subscriptionEndsAt: provider.subscriptionEndsAt,
      subscriptionExpiredAt: provider.subscriptionExpiredAt,
    },
    null,
    2
  ));

  await mongoose.disconnect();
  console.log('Done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});