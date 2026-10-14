'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { run } = require('../src/cli');
const { version } = require('../package.json');
const { createMockRpc, httpError } = require('./helpers/mock-rpc');
const { SAMPLE_IDL, idlAccountBytes, accountInfo } = require('./helpers/fixtures');

const PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

function sink() {
  return {
    data: '',
    write(chunk) {
      this.data += chunk;
    },
  };
}

test('--help prints usage and exits 0', async () => {
  const stdout = sink();
  const code = await run(['--help'], { stdout, stderr: sink() });
  assert.equal(code, 0);
  assert.match(stdout.data, /Usage:/);
  assert.match(stdout.data, /--rpc/);
  assert.match(stdout.data, /SOL_IDL_PEEK_RPC/);
  assert.match(stdout.data, /--json/);
});

test('--version prints the package version', async () => {
  const stdout = sink();
  const code = await run(['--version'], { stdout, stderr: sink() });
  assert.equal(code, 0);
  assert.equal(stdout.data.trim(), version);
});

test('usage errors exit 2 and print to stderr', async () => {
  const stdout = sink();
  const stderr = sink();
  const code = await run([], { stdout, stderr });
  assert.equal(code, 2);
  assert.equal(stdout.data, '');
  assert.match(stderr.data, /Error: Missing program address/);
  assert.match(stderr.data, /Usage:/);
});

test('prints the on-chain IDL as JSON and exits 0', async () => {
  const mock = createMockRpc({ getAccountInfo: accountInfo(idlAccountBytes(), PROGRAM) });
  const stdout = sink();
  const stderr = sink();
  const code = await run([PROGRAM], { stdout, stderr, fetch: mock.fetch, env: {} });
  assert.equal(code, 0);
  assert.equal(stderr.data, '');
  assert.deepEqual(JSON.parse(stdout.data), SAMPLE_IDL);
});

test('uses SOL_IDL_PEEK_RPC and the --rpc flag over the default', async () => {
  const mock = createMockRpc({ getAccountInfo: accountInfo(idlAccountBytes(), PROGRAM) });
  await run([PROGRAM], {
    stdout: sink(),
    stderr: sink(),
    fetch: mock.fetch,
    env: { SOL_IDL_PEEK_RPC: 'https://env.example.com' },
  });
  assert.equal(mock.calls[0].url, 'https://env.example.com');

  const flagMock = createMockRpc({ getAccountInfo: accountInfo(idlAccountBytes(), PROGRAM) });
  await run([PROGRAM, '--rpc', 'https://flag.example.com'], {
    stdout: sink(),
    stderr: sink(),
    fetch: flagMock.fetch,
    env: { SOL_IDL_PEEK_RPC: 'https://env.example.com' },
  });
  assert.equal(flagMock.calls[0].url, 'https://flag.example.com');
});

test('a program without an IDL exits 1 with a clear message', async () => {
  const mock = createMockRpc({ getAccountInfo: { context: { slot: 1 }, value: null } });
  const stdout = sink();
  const stderr = sink();
  const code = await run([PROGRAM], { stdout, stderr, fetch: mock.fetch, env: {} });
  assert.equal(code, 1);
  assert.equal(stdout.data, '');
  assert.match(stderr.data, /No Anchor IDL found on-chain/);
});

test('RPC failures exit 1 and never print the URL', async () => {
  const mock = createMockRpc({ getAccountInfo: httpError(500) });
  const stderr = sink();
  const code = await run([PROGRAM, '--rpc', 'https://rpc.example.com/?api-key=secret'], {
    stdout: sink(),
    stderr,
    fetch: mock.fetch,
    env: {},
  });
  assert.equal(code, 1);
  assert.match(stderr.data, /rpc\.example\.com returned HTTP 500/);
  assert.ok(!stderr.data.includes('secret'));
});