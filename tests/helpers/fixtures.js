'use strict';

const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { decodeBase58 } = require('../../src/address');

const INTERNAL = crypto.createHash('sha256').update('internal:IdlAccount').digest().subarray(0, 8);
const LEGACY = crypto.createHash('sha256').update('account:IdlAccount').digest().subarray(0, 8);

const AUTHORITY = 'Cu7NwqCXSmsR5vgGA3Vw9uYVViPi3kQvkbKByVQ8nPY9';

// New style (Anchor 0.30+): metadata block, discriminators, snake_case names.
const SAMPLE_IDL = {
  address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  metadata: { name: 'sample', version: '0.1.0', spec: '0.1.0' },
  instructions: [
    {
      name: 'initialize',
      discriminator: [1, 2, 3, 4, 5, 6, 7, 8],
      accounts: [{ name: 'state', writable: true, signer: false }],
      args: [
        { name: 'fee_authority', type: 'pubkey' },
        { name: 'fee_rate', type: 'u16' },
      ],
    },
    {
      name: 'close',
      docs: ['Close the state account.'],
      discriminator: [9, 9, 9, 9, 9, 9, 9, 9],
      accounts: [],
      args: [],
    },
  ],
  accounts: [
    { name: 'State', discriminator: [1, 1, 1, 1, 1, 1, 1, 1] },
    { name: 'Vault', discriminator: [2, 2, 2, 2, 2, 2, 2, 2] },
  ],
  events: [{ name: 'Deposited', discriminator: [3, 3, 3, 3, 3, 3, 3, 3] }],
  errors: [
    { code: 6000, name: 'Unauthorized', msg: 'Not allowed' },
    { code: 6001, name: 'Overflow', msg: 'Math overflow' },
  ],
  types: [{ name: 'State', type: { kind: 'struct', fields: [{ name: 'bump', type: 'u8' }] } }],
};

// Old style (Anchor 0.29 and older): top-level name/version, camelCase, isMut/isSigner.
const OLD_STYLE_IDL = {
  version: '0.1.0',
  name: 'marinade_finance',
  instructions: [
    {
      name: 'deposit',
      accounts: [{ name: 'state', isMut: true, isSigner: false }],
      args: [{ name: 'lamports', type: 'u64' }],
    },
    {
      name: 'addValidator',
      accounts: [],
      args: [
        { name: 'index', type: 'u32' },
        { name: 'score', type: { option: 'u32' } },
        { name: 'keys', type: { vec: 'publicKey' } },
      ],
    },
  ],
  accounts: [{ name: 'State', type: { kind: 'struct', fields: [] } }],
  types: [{ name: 'Fee', type: { kind: 'struct', fields: [] } }],
  events: [{ name: 'DepositEvent', fields: [{ name: 'amount', type: 'u64', index: false }] }],
  errors: [{ code: 6000, name: 'WrongReserveOwner', msg: 'Wrong reserve owner' }],
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

module.exports = {
  INTERNAL,
  LEGACY,
  AUTHORITY,
  SAMPLE_IDL,
  OLD_STYLE_IDL,
  idlAccountBytes,
  accountInfo,
};