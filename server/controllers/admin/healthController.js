'use strict';

const os = require('os');
const mongoose = require('mongoose');
const config = require('../../config/env');
const db = require('../../config/database');
const { client: cloudinary } = require('../../config/cloudinary');

const Provider = require('../../models/admin/Provider');
const Admin = require('../../models/admin/Admin');
const Customer = require('../../models/provider/Customer');
const Router = require('../../models/provider/Router');
const Session = require('../../models/admin/Session');
const Transaction = require('../../models/admin/Transaction');
const NotificationLog = require('../../models/admin/NotificationLog');

function humanUptime(seconds) {
  const s = Math.floor(seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (sec || parts.length === 0) parts.push(`${sec}s`);
  return parts.join(' ');
}

function bytesToMb(bytes) {
  return Math.round((bytes || 0) / (1024 * 1024));
}

function mask(v, keep = 4) {
  if (!v) return null;
  const s = String(v);
  if (s.length <= keep) return '****';
  return `${s.slice(0, keep)}****`;
}

function isPlaceholder(v) {
  if (!v) return true;
  const s = String(v);
  return /^your[_-]/i.test(s) || /^change[_-]?me/i.test(s) || s === '';
}

async function checkDatabase() {
  const start = Date.now();
  try {
    if (mongoose.connection.readyState !== 1) {
      return { status: 'down', error: 'not connected' };
    }
    await mongoose.connection.db.admin().ping();
    const pingMs = Date.now() - start;

    const collections = await mongoose.connection.db.listCollections().toArray();
    let documents = 0;
    for (const c of collections) {
      try {
        documents += await mongoose.connection.db.collection(c.name).estimatedDocumentCount();
      } catch (_) {}
    }

    return {
      status: 'up',
      database: mongoose.connection.db.databaseName,
      host: mongoose.connection.host,
      collections: collections.length,
      documents,
      pingMs,
    };
  } catch (err) {
    return { status: 'down', error: err.message };
  }
}

async function checkCloudinary() {
  const name = config.cloudinary.cloudName;
  const key = config.cloudinary.apiKey;
  const secret = config.cloudinary.apiSecret;

  if (isPlaceholder(name) || isPlaceholder(key) || isPlaceholder(secret)) {
    return { status: 'disabled', message: 'not configured' };
  }

  const start = Date.now();
  try {
    const res = await Promise.race([
      cloudinary.api.ping(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Cloudinary ping timeout')), 3000)
      ),
    ]);
    return {
      status: 'up',
      cloud: name,
      folder: config.cloudinary.vouchersFolder,
      pingMs: Date.now() - start,
      ...(res?.status ? { message: res.status } : {}),
    };
  } catch (err) {
    return { status: 'down', cloud: name, message: err.message };
  }
}

function checkHdmBridge() {
  if (isPlaceholder(config.hdm.apiKey)) {
    return { status: 'disabled', message: 'not configured' };
  }
  return {
    status: 'configured',
    fromEmail: config.hdm.fromEmail,
    fromName: config.hdm.fromName,
    smsSender: config.hdm.smsSender,
    smsEnabled: config.hdm.smsEnabled,
    emailEnabled: config.hdm.emailEnabled,
  };
}

function checkMpesa() {
  if (isPlaceholder(config.mpesa.consumerKey) || isPlaceholder(config.mpesa.passkey)) {
    return { status: 'disabled', message: 'not configured' };
  }
  return {
    status: 'configured',
    env: config.mpesa.env,
    transactionType: config.mpesa.transactionType,
    shortCode: mask(config.mpesa.shortCode),
    tillNumber: mask(config.mpesa.tillNumber),
    callbackUrl: config.mpesa.callbackUrl,
  };
}

function checkRadius() {
  if (isPlaceholder(config.radius.sharedSecret)) {
    return { status: 'disabled', message: 'not configured' };
  }
  return {
    status: 'configured',
    rateLimitAttribute: config.radius.rateLimitAttribute,
    sessionTimeout: config.radius.defaultSessionTimeout,
    acctInterimInterval: config.radius.acctInterimInterval,
  };
}

function checkSchedulers() {
  return {
    status: config.schedulers.runInProcess ? 'enabled' : 'separate_process',
    inProcess: config.schedulers.runInProcess,
  };
}

async function getCounts() {
  const [providers, admins, customers, routers, sessions, transactions, notifications] =
    await Promise.all([
      Provider.countDocuments().catch(() => 0),
      Admin.countDocuments().catch(() => 0),
      Customer.countDocuments().catch(() => 0),
      Router.countDocuments().catch(() => 0),
      Session.countDocuments().catch(() => 0),
      Transaction.countDocuments().catch(() => 0),
      NotificationLog.countDocuments().catch(() => 0),
    ]);

  return {
    providers,
    admins,
    customers,
    routers,
    sessions,
    transactions,
    notifications,
  };
}

async function getActivity() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [transactions24h, sessions24h, notifications24h] = await Promise.all([
    Transaction.countDocuments({ createdAt: { $gte: since } }).catch(() => 0),
    Session.countDocuments({ startTime: { $gte: since } }).catch(() => 0),
    NotificationLog.countDocuments({ createdAt: { $gte: since } }).catch(() => 0),
  ]);
  return { transactions24h, sessions24h, notifications24h };
}

function buildServer() {
  const cpu = os.cpus() || [];
  const loadAvg = os.loadavg();
  const mem = process.memoryUsage();
  const totalSystem = os.totalmem();
  const freeSystem = os.freemem();

  return {
    status: 'up',
    url: config.appUrl,
    appName: config.appName,
    version: '1.0.0',
    node: process.version,
    env: config.nodeEnv,
    platformFull: `${os.platform()} ${os.release()}`,
    arch: os.arch(),
    uptimeHuman: humanUptime(process.uptime()),
    uptimeSeconds: Math.floor(process.uptime()),
    startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    pid: process.pid,
    cpu: {
      cores: cpu.length,
      model: cpu[0]?.model?.trim() || null,
      loadAvg: loadAvg.map((v) => Number(v.toFixed(2))),
    },
    memory: {
      rssMb: bytesToMb(mem.rss),
      heapUsedMb: bytesToMb(mem.heapUsed),
      heapTotalMb: bytesToMb(mem.heapTotal),
      freeSystemMb: bytesToMb(freeSystem),
      totalSystemMb: bytesToMb(totalSystem),
    },
  };
}

async function getDetailedHealth(req, res) {
  const [database, cloudinaryStatus, counts, activity] = await Promise.all([
    checkDatabase(),
    checkCloudinary(),
    getCounts(),
    getActivity(),
  ]);

  const services = {
    server: buildServer(),
    database,
    cloudinary: cloudinaryStatus,
    hdmBridge: checkHdmBridge(),
    mpesa: checkMpesa(),
    radius: checkRadius(),
    schedulers: checkSchedulers(),
  };

  const upStates = ['up', 'configured', 'enabled'];
  const enabled = Object.values(services).filter(
    (s) => s.status && s.status !== 'disabled' && s.status !== 'separate_process'
  );
  const up = enabled.filter((s) => upStates.includes(s.status)).length;
  const total = enabled.length;
  const healthy = up === total;

  const body = {
    success: true,
    status: healthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    overall: { up, total },
    server: services.server,
    database: services.database,
    cloudinary: services.cloudinary,
    hdmBridge: services.hdmBridge,
    mpesa: services.mpesa,
    radius: services.radius,
    schedulers: services.schedulers,
    data: counts,
    activity,
  };

  // 503 only when the database itself is unreachable.
  // Every other degraded service returns 200 with its own `status: 'down'`.
  const statusCode = database.status === 'down' ? 503 : 200;

  return res.status(statusCode).json(body);
}

async function getBasicHealth(req, res) {
  const dbStatus = db.status();
  const healthy = dbStatus.connected;
  return res.status(healthy ? 200 : 503).json({
    success: true,
    status: healthy ? 'ok' : 'degraded',
    uptime: process.uptime(),
    db: dbStatus,
    timestamp: new Date().toISOString(),
  });
}

module.exports = { getDetailedHealth, getBasicHealth };