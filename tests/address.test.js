'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { decodeBase58, encodeBase58, isValidAddress } = require('../src/address');

test('accepts well-known valid addresses', () => {
  assert.equal(isValidAddress('11111111111111111111111111111111'), true);
  assert.equal(isValidAddress('So11111111111111111111111111111111111111112'), true);
  assert.equal(isValidAddress('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), true);
});

test('rejects wrong length', () => {
  assert.equal(isValidAddress('abc'), false);
  assert.equal(isValidAddress('1'.repeat(45)), false);
});

test('rejects characters outside the base58 alphabet', () => {
  assert.equal(isValidAddress('0okenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), false);
  assert.equal(isValidAddress('Ookenkeg QfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), false);
});

test('rejects non-strings', () => {
  assert.equal(isValidAddress(undefined), false);
  assert.equal(isValidAddress(42), false);
});

test('encodeBase58 round-trips with decodeBase58', () => {
  for (const address of [
    '11111111111111111111111111111111',
    'So11111111111111111111111111111111111111112',
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    'Cu7NwqCXSmsR5vgGA3Vw9uYVViPi3kQvkbKByVQ8nPY9',
  ]) {
    assert.equal(encodeBase58(decodeBase58(address)), address);
  }
});

test('encodeBase58 keeps leading zero bytes as 1s', () => {
  assert.equal(encodeBase58(new Uint8Array(32)), '1'.repeat(32));
  assert.equal(encodeBase58(Uint8Array.of(0, 0, 1)), '112');
});