'use strict';

module.exports = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const id = req.id ? ` [${req.id.slice(0, 8)}]` : '';
    const who = req.user ? ` u=${req.user.id}` : '';
    console.log(
      `[http]${id} ${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms${who}`
    );
  });

  next();
};