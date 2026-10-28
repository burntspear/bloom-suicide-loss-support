#!/usr/bin/env node
'use strict';
// Usage: npm run hash-password -- "your long passphrase"   (or run with no argument to be prompted)
const readline = require('readline');
const { hashPassword } = require('../src/security');

function done(pw) {
  if (!pw || pw.length < 12) { console.error('Please use a password or passphrase of at least 12 characters.'); process.exit(1); }
  console.log('\nPaste this into your environment as ADMIN_PASSWORD_HASH (keep the quotes):\n');
  console.log(`ADMIN_PASSWORD_HASH='${hashPassword(pw)}'\n`);
}
const arg = process.argv[2];
if (arg) done(arg);
else {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Choose an admin password (min 12 characters): ', (a) => { rl.close(); done(a); });
}
