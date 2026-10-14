'use strict';

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function decodeBase58(str) {
  let num = 0n;
  for (const ch of str) {
    const index = ALPHABET.indexOf(ch);
    if (index === -1) return null;
    num = num * 58n + BigInt(index);
  }

  const bytes = [];
  while (num > 0n) {
    bytes.unshift(Number(num & 0xffn));
    num >>= 8n;
  }
  for (const ch of str) {
    if (ch === '1') bytes.unshift(0);
    else break;
  }
  return Uint8Array.from(bytes);
}

function encodeBase58(bytes) {
  let num = 0n;
  for (const byte of bytes) num = num * 256n + BigInt(byte);

  let out = '';
  while (num > 0n) {
    out = ALPHABET[Number(num % 58n)] + out;
    num /= 58n;
  }
  for (const byte of bytes) {
    if (byte === 0) out = '1' + out;
    else break;
  }
  return out;
}

function isValidAddress(value) {
  if (typeof value !== 'string') return false;
  if (value.length < 32 || value.length > 44) return false;
  const bytes = decodeBase58(value);
  return bytes !== null && bytes.length === 32;
}

module.exports = { decodeBase58, encodeBase58, isValidAddress };