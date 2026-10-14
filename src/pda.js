'use strict';

const crypto = require('node:crypto');
const { decodeBase58, encodeBase58 } = require('./address');

// Curve25519 field prime and the Edwards curve constant d = -121665 / 121666.
const P = (1n << 255n) - 19n;

function mod(value) {
  const result = value % P;
  return result >= 0n ? result : result + P;
}

function modPow(base, exponent) {
  let result = 1n;
  let b = mod(base);
  let e = exponent;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % P;
    b = (b * b) % P;
    e >>= 1n;
  }
  return result;
}

const D = mod(-121665n * modPow(121666n, P - 2n));

function sha256(...chunks) {
  const hash = crypto.createHash('sha256');
  for (const chunk of chunks) hash.update(chunk);
  return new Uint8Array(hash.digest());
}

// True when the 32 bytes decode to a point on the ed25519 curve.
// Program derived addresses are the hashes that are NOT on the curve.
function isOnCurve(bytes) {
  if (bytes.length !== 32) return false;

  const copy = Uint8Array.from(bytes);
  const signBit = copy[31] >> 7;
  copy[31] &= 0x7f;

  let y = 0n;
  for (let i = 31; i >= 0; i--) y = (y << 8n) | BigInt(copy[i]);
  if (y >= P) return false;

  const y2 = mod(y * y);
  const u = mod(y2 - 1n);
  const v = mod(D * y2 + 1n);
  const x2 = mod(u * modPow(v, P - 2n));

  if (x2 === 0n) return signBit === 0;
  return modPow(x2, (P - 1n) / 2n) === 1n;
}

// seeds: array of Uint8Array/Buffer. programId: 32 bytes.
function findProgramAddress(seeds, programId) {
  const marker = Buffer.from('ProgramDerivedAddress');
  for (let bump = 255; bump >= 0; bump--) {
    const hash = sha256(...seeds, Uint8Array.of(bump), programId, marker);
    if (!isOnCurve(hash)) return { address: hash, bump };
  }
  throw new Error('Could not find a program derived address');
}

// Same as web3.js PublicKey.createWithSeed: sha256(base + seed + owner).
function createWithSeed(base, seed, owner) {
  return sha256(base, Buffer.from(seed, 'utf8'), owner);
}

const IDL_SEED = 'anchor:idl';

// Where Anchor stores a program's IDL: createWithSeed(PDA of the program with
// no seeds, "anchor:idl", program).
function idlAddress(program) {
  const programBytes = decodeBase58(program);
  const { address: base } = findProgramAddress([], programBytes);
  return encodeBase58(createWithSeed(base, IDL_SEED, programBytes));
}

module.exports = { isOnCurve, findProgramAddress, createWithSeed, idlAddress, IDL_SEED };