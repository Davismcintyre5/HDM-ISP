'use strict';

const mongoose = require('mongoose');
const config = require('./env');

let isConnected = false;

async function connect() {
  if (isConnected) return mongoose.connection;

  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    console.log('[db] MongoDB connected');
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB error:', err.message);
  });

  await mongoose.connect(config.mongodbUri, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 20,
  });

  isConnected = true;
  return mongoose.connection;
}

async function disconnect() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  console.log('[db] MongoDB connection closed');
}

function status() {
  return {
    connected: isConnected,
    readyState: mongoose.connection.readyState,
  };
}

module.exports = { connect, disconnect, status };