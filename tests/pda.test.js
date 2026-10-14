'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { decodeBase58, encodeBase58 } = require('../src/address');
const { isOnCurve, findProgramAddress, idlAddress } = require('../src/pda');

// Expected values come from @solana/web3.js (findProgramAddressSync + createWithSeed).
const VECTORS = [
  ['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', '29aDZ12ST2mQkLeVfoeKkkm7WA83MCyiGU3Zf8MjDDGV', 255, '4nmzuuebvZ9EVghi2khvz9SyxUNvuXXdAzWtG5N7avYf'],
  ['11111111111111111111111111111111', 'Cu7NwqCXSmsR5vgGA3Vw9uYVViPi3kQvkbKByVQ8nPY9', 255, 'J7NactFg7ikhyNGKsub9rrPE5WWMmndPuWmQtDXUbXi8'],
  ['metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s', 'F5qujjbNbaUe7wtJtGgvFPJfL5a4xgLQMHSGzGUzo7bb', 255, '77SZ5QQdT1vZV5FbMLMCmiYimtSkNnADbkusCCu5vVRL'],
  ['JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', 'GPJkEFWhjnpQADAtoiSQ2upCDSPp7qCNeYtiy8ty2KcF', 254, 'C88XWfp26heEmDkmfSzeXP7Fd7GQJ2j9dDTUsyiZbUTa'],
  ['675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', 'J5iuasi2B1v18qCqMQLnSChCNAUEyHxby6my7no9Z83h', 254, 'C2Di4S9JkWFaBFXKYCse7QTSeYefkwRf1rKMhjWTwY1T'],
];

test('findProgramAddress matches web3.js, including the bump', () => {
  for (const [program, base, bump] of VECTORS) {
    const found = findProgramAddress([], decodeBase58(program));
    assert.equal(encodeBase58(found.address), base);
    assert.equal(found.bump, bump);
  }
});

test('idlAddress matches web3.js createWithSeed', () => {
  for (const [program, , , idl] of VECTORS) {
    assert.equal(idlAddress(program), idl);
  }
});

test('isOnCurve accepts real public keys and the base point', () => {
  assert.equal(isOnCurve(decodeBase58('So11111111111111111111111111111111111111112')), true);
  assert.equal(isOnCurve(decodeBase58('11111111111111111111111111111111')), true);
  const basePoint = Buffer.from('5866666666666666666666666666666666666666666666666666666666666666', 'hex');
  assert.equal(isOnCurve(basePoint), true);
});

test('isOnCurve rejects program derived addresses', () => {
  for (const [, base] of VECTORS) {
    assert.equal(isOnCurve(decodeBase58(base)), false);
  }
});

test('isOnCurve rejects a y value at or above the field prime and wrong lengths', () => {
  const tooBig = new Uint8Array(32).fill(0xff);
  tooBig[31] = 0x7f;
  assert.equal(isOnCurve(tooBig), false);
  assert.equal(isOnCurve(new Uint8Array(31)), false);
});