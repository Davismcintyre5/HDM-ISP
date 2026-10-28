'use strict';

const cron = require('node-cron');
const config = require('../config/env');

const jobs = new Map();

const JOB_DEFINITIONS = [
  {
    name: 'sessionEnforcer',
    schedule: '* * * * *',
    handler: require('./sessionEnforcer'),
  },
  {
    name: 'paymentReconciler',
    schedule: '*/5 * * * *',
    handler: require('./paymentReconciler'),
  },
  {
    name: 'notificationScheduler',
    schedule: '*/10 * * * *',
    handler: require('./notificationScheduler'),
  },
  {
    name: 'voucherExpiry',
    schedule: '*/15 * * * *',
    handler: require('./voucherExpiry'),
  },
  {
    name: 'subscriptionExpiry',
    schedule: '0 8 * * *',
    handler: require('./subscriptionExpiry'),
  },
  {
    name: 'reportAggregator',
    schedule: '5 0 * * *',
    handler: require('./reportAggregator'),
  },
];

function register(job) {
  const { name, schedule, handler } = job || {};

  if (!name || typeof name !== 'string') {
    throw new Error('[scheduler] job.name is required');
  }
  if (!schedule || !cron.validate(schedule)) {
    throw new Error(`[scheduler] invalid cron schedule for "${name}"`);
  }
  if (typeof handler !== 'function') {
    throw new Error(`[scheduler] handler for "${name}" must be a function`);
  }
  if (jobs.has(name)) {
    throw new Error(`[scheduler] job "${name}" already registered`);
  }

  const task = cron.schedule(schedule, async () => {
    const startedAt = Date.now();
    try {
      await handler();
      const ms = Date.now() - startedAt;
      console.log(`[scheduler:${name}] ok (${ms}ms)`);
    } catch (err) {
      const ms = Date.now() - startedAt;
      console.error(`[scheduler:${name}] failed (${ms}ms):`, err.message);
    }
  });

  jobs.set(name, task);
  console.log(`[scheduler] registered "${name}" (${schedule})`);
  return task;
}

function start() {
  if (!config.schedulers.runInProcess) {
    console.log('[scheduler] RUN_SCHEDULERS_IN_PROCESS=false — skipping in-process schedulers');
    return { started: 0, jobs: [] };
  }

  for (const job of JOB_DEFINITIONS) {
    register(job);
  }

  console.log(`[scheduler] ${jobs.size} job(s) running`);
  return { started: jobs.size, jobs: Array.from(jobs.keys()) };
}

function stop() {
  for (const [name, task] of jobs.entries()) {
    try {
      task.stop();
      console.log(`[scheduler] stopped "${name}"`);
    } catch (err) {
      console.error(`[scheduler] failed to stop "${name}":`, err.message);
    }
  }
  jobs.clear();
}

function list() {
  return Array.from(jobs.keys());
}

module.exports = {
  start,
  stop,
  register,
  list,
  JOB_DEFINITIONS,
};