'use strict';
const express = require('express');
const payments = require('../payments');
const router = express.Router();
// Raw body is required for signature checks: mounted BEFORE the JSON/urlencoded parsers.
router.post('/webhooks/:provider', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
  const out = await payments.handleWebhook(req.params.provider, Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0), req.headers);
  res.status(out.http).type('text').send(out.body);
});
module.exports = router;
