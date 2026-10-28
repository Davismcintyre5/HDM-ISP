'use strict';

require('dotenv').config();

const express = require('express');

const config = require('./config/env');
const db = require('./config/database');
const routes = require('./routes');
const schedulers = require('./schedulers');

const requestId = require('./middleware/global/requestId');
const helmet = require('./middleware/global/helmet');
const cors = require('./middleware/global/cors');
const requestLogger = require('./middleware/global/requestLogger');
const notFound = require('./middleware/global/notFound');
const errorHandler = require('./middleware/global/errorHandler');

const app = express();
const { port: PORT, appName: APP_NAME, nodeEnv: NODE_ENV } = config;

function logConfigStatus() {
  const ok = (v) => (v ? 'OK' : 'MISSING');
  const mask = (v, keep = 4) => (v ? `${String(v).slice(0, keep)}****` : '—');

  console.log(
    [
      '',
      '─────────────────────────────────────────────',
      '  CONFIG STATUS',
      '─────────────────────────────────────────────',
      `  App          : ${APP_NAME} (v1.0.0)`,
      `  Author       : Davis Okoth`,
      `  Env          : ${NODE_ENV}`,
      `  Port         : ${PORT}`,
      '─────────────────────────────────────────────',
      `  MongoDB      : ${ok(config.mongodbUri)}`,
      `  JWT          : ${ok(config.jwt.secret && config.jwt.refreshSecret)}`,
      `  RADIUS       : ${ok(config.radius.sharedSecret)} (attr: ${config.radius.rateLimitAttribute})`,
      `  MikroTik     : ${ok(config.mikrotik.apiPort)} (api: ${config.mikrotik.apiPort}, tls: ${config.mikrotik.apiTlsPort})`,
      `  M-PESA       : ${ok(config.mpesa.consumerKey && config.mpesa.passkey)} (env: ${config.mpesa.env}, type: ${config.mpesa.transactionType})`,
      `  M-PESA Short : ${mask(config.mpesa.shortCode)}`,
      `  M-PESA Till  : ${mask(config.mpesa.tillNumber)}`,
      `  Callback URL : ${config.mpesa.callbackUrl || '—'}`,
      `  Cloudinary   : ${ok(config.cloudinary.cloudName && config.cloudinary.apiKey)} (cloud: ${config.cloudinary.cloudName || '—'})`,
      `  HDM Bridge   : ${ok(config.hdm.apiKey)} (email: ${config.hdm.emailEnabled ? 'on' : 'off'}, sms: ${config.hdm.smsEnabled ? 'on' : 'off'})`,
      `  HDM From     : ${config.hdm.fromEmail || '—'}`,
      `  Voucher      : len=${config.voucher.codeLength}, expiry=${config.voucher.defaultExpiryDays}d`,
      `  Schedulers   : ${config.schedulers.runInProcess ? 'in-process' : 'separate process'}`,
      `  CORS         : ${config.corsOrigins.length} origin(s)`,
      '─────────────────────────────────────────────',
      '',
    ].join('\n')
  );
}

app.use(requestId);
app.use(helmet);
app.use(cors);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(requestLogger);

app.get('/', (req, res) => {
  res.json({ success: true, message: `${APP_NAME} is running`, env: NODE_ENV });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    uptime: process.uptime(),
    db: db.status(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

let server;

async function start() {
  logConfigStatus();

  try {
    await db.connect();
  } catch (err) {
    console.error('[startup] Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }

  schedulers.start();

  server = app.listen(PORT, () => {
    console.log(
      [
        '─────────────────────────────────────────────',
        `  ${APP_NAME} listening on http://localhost:${PORT}`,
        `  Health : http://localhost:${PORT}/health`,
        `  API    : http://localhost:${PORT}/api`,
        `  Started at ${new Date().toISOString()}`,
        '─────────────────────────────────────────────',
        '',
      ].join('\n')
    );
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[startup] Port ${PORT} is already in use.`);
    } else {
      console.error('[startup] Server error:', err.message);
    }
    process.exit(1);
  });
}

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\n[shutdown] ${signal} received. Closing server...`);

  const closeHttp = () =>
    new Promise((resolve) => {
      if (!server) return resolve();
      server.close((err) => {
        if (err) console.error('[shutdown] HTTP close error:', err.message);
        else console.log('[shutdown] HTTP server closed.');
        resolve();
      });
    });

  const forceTimer = setTimeout(() => {
    console.error('[shutdown] Forced exit after timeout.');
    process.exit(1);
  }, 10000);
  forceTimer.unref();

  try {
    schedulers.stop();
    const mikrotikService = require('./services/mikrotikService');
    if (typeof mikrotikService.closeAll === 'function') {
      mikrotikService.closeAll();
    }
    await closeHttp();
    await db.disconnect();
  } catch (err) {
    console.error('[shutdown] Error during shutdown:', err.message);
  } finally {
    clearTimeout(forceTimer);
    console.log('[shutdown] Bye.');
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('[process] Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[process] Uncaught exception:', err.message);
  shutdown('uncaughtException');
});

start();