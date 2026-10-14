'use strict';

const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { encodeBase58 } = require('./address');
const { idlAddress } = require('./pda');

// Layout of an Anchor IDL account:
// 8 byte discriminator, 32 byte authority, u32 LE length, zlib-compressed JSON.
const HEADER_SIZE = 8 + 32 + 4;
const MAX_IDL_BYTES = 16 * 1024 * 1024;

function discriminator(name) {
  return crypto.createHash('sha256').update(name).digest().subarray(0, 8);
}

// Anchor 0.30 and newer use "internal:", older versions used "account:".
const DISCRIMINATORS = [discriminator('internal:IdlAccount'), discriminator('account:IdlAccount')];

class IdlError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'IdlError';
    this.code = code;
  }
}

function decodeIdlAccount(data) {
  if (data.length < HEADER_SIZE) {
    throw new IdlError('IDL account data is too short', 'invalid');
  }

  const head = data.subarray(0, 8);
  if (!DISCRIMINATORS.some((d) => d.equals(head))) {
    throw new IdlError('Account is not an Anchor IDL account', 'invalid');
  }

  const authority = encodeBase58(data.subarray(8, 40));
  const length = data.readUInt32LE(40);
  if (HEADER_SIZE + length > data.length) {
    throw new IdlError('IDL account data is truncated', 'invalid');
  }

  let json;
  try {
    json = zlib
      .inflateSync(data.subarray(HEADER_SIZE, HEADER_SIZE + length), {
        maxOutputLength: MAX_IDL_BYTES,
      })
      .toString('utf8');
  } catch {
    throw new IdlError('Could not decompress the IDL', 'invalid');
  }

  let idl;
  try {
    idl = JSON.parse(json);
  } catch {
    throw new IdlError('The IDL is not valid JSON', 'invalid');
  }

  return { authority, idl };
}

async function fetchIdl(client, program) {
  const address = idlAddress(program);
  const response = await client.call('getAccountInfo', [address, { encoding: 'base64' }]);

  if (!response || !response.value) {
    throw new IdlError(`No Anchor IDL found on-chain for ${program}`, 'not-found');
  }

  const account = response.value;
  if (account.owner !== program) {
    throw new IdlError('The IDL account is not owned by the program', 'invalid');
  }

  const encoded = Array.isArray(account.data) ? account.data[0] : null;
  if (typeof encoded !== 'string') {
    throw new IdlError('Unexpected account data from the RPC', 'invalid');
  }

  const { authority, idl } = decodeIdlAccount(Buffer.from(encoded, 'base64'));
  return { program, address, authority, idl };
}

module.exports = { IdlError, decodeIdlAccount, fetchIdl };