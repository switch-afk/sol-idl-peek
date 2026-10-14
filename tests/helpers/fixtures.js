'use strict';

const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { decodeBase58 } = require('../../src/address');

const INTERNAL = crypto.createHash('sha256').update('internal:IdlAccount').digest().subarray(0, 8);
const LEGACY = crypto.createHash('sha256').update('account:IdlAccount').digest().subarray(0, 8);

const AUTHORITY = 'Cu7NwqCXSmsR5vgGA3Vw9uYVViPi3kQvkbKByVQ8nPY9';

const SAMPLE_IDL = {
  address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  metadata: { name: 'sample', version: '0.1.0', spec: '0.1.0' },
  instructions: [{ name: 'initialize', discriminator: [1, 2, 3, 4, 5, 6, 7, 8], accounts: [], args: [] }],
};

// Builds raw IDL account bytes the way Anchor stores them.
function idlAccountBytes(idl = SAMPLE_IDL, options = {}) {
  const compressed = options.compressed || zlib.deflateSync(Buffer.from(JSON.stringify(idl)));
  const header = Buffer.alloc(44);
  (options.discriminator || INTERNAL).copy(header, 0);
  Buffer.from(decodeBase58(options.authority || AUTHORITY)).copy(header, 8);
  header.writeUInt32LE(options.length ?? compressed.length, 40);
  return Buffer.concat([header, compressed, Buffer.alloc(options.padding ?? 16)]);
}

// A getAccountInfo handler result for that account.
function accountInfo(bytes, owner) {
  return {
    context: { slot: 1 },
    value: {
      data: [bytes.toString('base64'), 'base64'],
      executable: false,
      lamports: 1000000,
      owner,
      rentEpoch: 0,
      space: bytes.length,
    },
  };
}

module.exports = { INTERNAL, LEGACY, AUTHORITY, SAMPLE_IDL, idlAccountBytes, accountInfo };