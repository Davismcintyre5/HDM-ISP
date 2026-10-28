'use strict';

const { RouterOSAPI } = require('node-routeros');
const { decrypt } = require('../utils/crypto');
const config = require('../config/env');
const ApiError = require('../utils/apiError');

const connections = new Map(); // routerId → connection

async function getConnection(router) {
  const key = String(router._id);
  const existing = connections.get(key);
  if (existing && existing.connected) return existing;

  const password = decrypt(router.apiPasswordEnc);
  if (!password) throw ApiError.internal('Failed to decrypt router password');

  const conn = new RouterOSAPI({
    host: router.ipAddress,
    port: router.apiPort || config.mikrotik.apiPort,
    user: router.apiUsername,
    password,
    timeout: config.mikrotik.connectTimeout,
  });

  await conn.connect();
  conn.on('close', () => connections.delete(key));
  connections.set(key, conn);
  return conn;
}

async function testConnection(router) {
  try {
    const conn = await getConnection(router);
    await conn.write('/system/identity/print');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function disconnectUser(router, username) {
  const conn = await getConnection(router);
  const active = await conn.write('/ip/hotspot/active/print', [
    `?user=${username}`,
  ]);
  for (const s of active) {
    await conn.write('/ip/hotspot/active/remove', [`=.id=${s['.id']}`]);
  }
  return { disconnected: active.length };
}

async function getActiveSessions(router) {
  const conn = await getConnection(router);
  return conn.write('/ip/hotspot/active/print');
}

function close(routerId) {
  const key = String(routerId);
  const conn = connections.get(key);
  if (conn) {
    try { conn.close(); } catch (_) {}
    connections.delete(key);
  }
}

function closeAll() {
  for (const key of connections.keys()) close(key);
}

module.exports = {
  getConnection,
  testConnection,
  disconnectUser,
  getActiveSessions,
  close,
  closeAll,
};