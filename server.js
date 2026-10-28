'use strict';

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');

const config = require('./config/env');
const db = require('./config/database');
const keepAlive = require('./config/keepAlive');
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

function findDir(candidates) {
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch (_) {}
  }
  return candidates[0];
}

const PROJECT_ROOT = __dirname;

const CLIENT_DIST = findDir([
  path.join(PROJECT_ROOT, 'client', 'dist'),
  path.join(PROJECT_ROOT, '..', 'client', 'dist'),
  path.join(process.cwd(), 'client', 'dist'),
]);

const PORTAL_DIR = findDir([
  path.join(PROJECT_ROOT, 'public', 'portal'),
  path.join(PROJECT_ROOT, '..', 'public', 'portal'),
  path.join(PROJECT_ROOT, 'server', 'public', 'portal'),
  path.join(process.cwd(), 'public', 'portal'),
  path.join(process.cwd(), 'server', 'public', 'portal'),
]);

const PORTAL_INDEX = path.join(PORTAL_DIR, 'index.html');
const CLIENT_INDEX = path.join(CLIENT_DIST, 'index.html');

function logConfigStatus() {
  const ok = (v) => (v ? 'OK' : 'MISSING');
  const mask = (v, keep = 4) => (v ? `${String(v).slice(0, keep)}****` : '—');
  const exists = (p) => {
    try {
      return fs.existsSync(p);
    } catch (_) {
      return false;
    }
  };

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
      `  App URL      : ${config.appUrl}`,
      `  Provider URL : ${config.providerUrl}`,
      `  Admin URL    : ${config.adminUrl}`,
      `  Callback URL : ${config.mpesa.callbackUrl}`,
      '─────────────────────────────────────────────',
      `  MongoDB      : ${ok(config.mongodbUri)}`,
      `  JWT          : ${ok(config.jwt.secret && config.jwt.refreshSecret)}`,
      `  RADIUS       : ${ok(config.radius.sharedSecret)}`,
      `  MikroTik     : ${ok(config.mikrotik.apiPort)}`,
      `  M-PESA       : ${ok(config.mpesa.consumerKey && config.mpesa.passkey)} (env: ${config.mpesa.env})`,
      `  M-PESA Short : ${mask(config.mpesa.shortCode)}`,
      `  M-PESA Till  : ${mask(config.mpesa.tillNumber)}`,
      `  Cloudinary   : ${ok(config.cloudinary.cloudName)}`,
      `  HDM Bridge   : ${ok(config.hdm.apiKey)}`,
      `  Schedulers   : ${config.schedulers.runInProcess ? 'in-process' : 'separate'}`,
      `  Keep alive   : ${config.keepAlive.enabled ? `on (verbose ${config.keepAlive.verbose ? 'on' : 'off'})` : 'off'}`,
      `  CORS         : ${config.corsOrigins.length} origin(s)`,
      '─────────────────────────────────────────────',
      `  Client dist  : ${exists(CLIENT_INDEX) ? 'OK' : 'MISSING'} — ${CLIENT_DIST}`,
      `  Portal dir   : ${exists(PORTAL_INDEX) ? 'OK' : 'MISSING'} — ${PORTAL_DIR}`,
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

app.use('/api', routes);

if (fs.existsSync(PORTAL_INDEX)) {
  app.use(
    '/portal',
    express.static(PORTAL_DIR, {
      index: 'index.html',
      maxAge: NODE_ENV === 'production' ? '1h' : 0,
    })
  );

  app.get('/portal/*', (req, res) => {
    res.sendFile(PORTAL_INDEX);
  });
} else {
  app.get('/portal/*', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Portal not installed. Add files to server/public/portal/.',
      searched: PORTAL_DIR,
    });
  });
}

if (fs.existsSync(CLIENT_INDEX)) {
  app.use(
    express.static(CLIENT_DIST, {
      index: false,
      maxAge: NODE_ENV === 'production' ? '1h' : 0,
    })
  );
}

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    uptime: process.uptime(),
    db: db.status(),
    timestamp: new Date().toISOString(),
  });
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/portal')) {
    return next();
  }

  if (!fs.existsSync(CLIENT_INDEX)) {
    return res.status(503).json({
      success: false,
      message: 'Client build not found. Run `npm run build` in client/.',
      searched: CLIENT_DIST,
    });
  }

  return res.sendFile(CLIENT_INDEX);
});

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
      `[startup] ${APP_NAME} ready on ${config.appUrl} (portal ${fs.existsSync(PORTAL_INDEX) ? `${config.appUrl}/portal` : 'not installed'})`
    );

    keepAlive.startKeepAlive();
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
    keepAlive.stopKeepAlive();
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