'use strict';

const config = require('./env');

module.exports = {
  apiKey: config.hdm.apiKey,
  baseUrl: config.hdm.apiUrl.replace(/\/+$/, ''),
  fromEmail: config.hdm.fromEmail,
  fromName: config.hdm.fromName,
  smsSender: config.hdm.smsSender,
  timeout: config.hdm.timeout,
  retryCount: config.hdm.retryCount,
  smsEnabled: config.hdm.smsEnabled,
  emailEnabled: config.hdm.emailEnabled,
  endpoints: {
    emailSend: '/emails/send',
    emailStatus: (messageId) => `/emails/status/${messageId}`,
    smsSend: '/sms/send',
  },
};