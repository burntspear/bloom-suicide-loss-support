'use strict';
const config = require('./config');
let transport;
/** Best-effort notification. A failure never loses the message: it is already saved in the database. */
async function notify(subject, text) {
  const s = config.smtp;
  if (!(s.host && s.from && s.notifyTo)) return false;
  try {
    if (!transport) transport = require('nodemailer').createTransport({ host: s.host, port: s.port, secure: s.secure, auth: s.user ? { user: s.user, pass: s.pass } : undefined });
    await transport.sendMail({ from: s.from, to: s.notifyTo, subject, text });
    return true;
  } catch (e) { console.error('[mail] notification failed:', e.message); return false; }
}
module.exports = { notify };
