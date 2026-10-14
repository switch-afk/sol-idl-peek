'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseArgs, UsageError } = require('../src/args');

const PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

test('parses a bare program address with defaults', () => {
  const opts = parseArgs([PROGRAM]);
  assert.equal(opts.program, PROGRAM);
  assert.equal(opts.json, false);
  assert.equal(opts.rpc, null);
});

test('parses --json and both --rpc forms', () => {
  assert.equal(parseArgs([PROGRAM, '--json']).json, true);
  assert.equal(parseArgs([PROGRAM, '--rpc', 'https://rpc.example.com']).rpc, 'https://rpc.example.com');
  assert.equal(parseArgs(['--rpc=https://rpc.example.com', PROGRAM]).rpc, 'https://rpc.example.com');
});

test('--json does not take a value', () => {
  assert.throws(() => parseArgs([PROGRAM, '--json=yes']), /does not take a value/);
});

test('--help and --version work without an address', () => {
  assert.equal(parseArgs(['--help']).help, true);
  assert.equal(parseArgs(['-h']).help, true);
  assert.equal(parseArgs(['--version']).version, true);
  assert.equal(parseArgs(['-v']).version, true);
});

test('missing program address is a usage error', () => {
  assert.throws(() => parseArgs([]), UsageError);
  assert.throws(() => parseArgs(['--json']), /Missing program address/);
});

test('invalid program address is a usage error', () => {
  assert.throws(() => parseArgs(['not-an-address']), /valid Solana address/);
});

test('unknown option and extra argument are usage errors', () => {
  assert.throws(() => parseArgs([PROGRAM, '--nope']), /Unknown option: --nope/);
  assert.throws(() => parseArgs([PROGRAM, PROGRAM]), /Only one program address/);
});

test('--rpc needs a valid http(s) URL and never echoes it', () => {
  assert.throws(() => parseArgs([PROGRAM, '--rpc']), /needs a URL/);
  assert.throws(() => parseArgs([PROGRAM, '--rpc=']), /needs a URL/);
  assert.throws(() => parseArgs([PROGRAM, '--rpc', 'ftp://example.com/?key=secret']), (err) => {
    assert.ok(err instanceof UsageError);
    assert.ok(!err.message.includes('secret'));
    return true;
  });
  assert.throws(() => parseArgs([PROGRAM, '--rpc', 'garbage']), /valid http\(s\) URL/);
});