'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const { decodeIdlAccount, fetchIdl, IdlError } = require('../src/idl');
const { idlAddress } = require('../src/pda');
const { createRpcClient, RpcError } = require('../src/rpc');
const { createMockRpc, rpcError } = require('./helpers/mock-rpc');
const {
  INTERNAL,
  LEGACY,
  AUTHORITY,
  SAMPLE_IDL,
  idlAccountBytes,
  accountInfo,
} = require('./helpers/fixtures');

const PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

function clientFor(handlers) {
  const mock = createMockRpc(handlers);
  return {
    mock,
    client: createRpcClient({ url: 'https://rpc.example.com', fetch: mock.fetch, sleep: async () => {} }),
  };
}

test('the IDL account discriminators match Anchor', () => {
  assert.deepEqual([...INTERNAL], [24, 70, 98, 191, 58, 144, 123, 158]);
  assert.deepEqual([...LEGACY], [140, 36, 166, 2, 103, 197, 33, 164]);
});

test('decodeIdlAccount reads the authority and inflates the IDL', () => {
  const { authority, idl } = decodeIdlAccount(idlAccountBytes());
  assert.equal(authority, AUTHORITY);
  assert.deepEqual(idl, SAMPLE_IDL);
});

test('decodeIdlAccount accepts the legacy discriminator', () => {
  const { idl } = decodeIdlAccount(idlAccountBytes(SAMPLE_IDL, { discriminator: LEGACY }));
  assert.deepEqual(idl, SAMPLE_IDL);
});

test('decodeIdlAccount ignores padding after the compressed data', () => {
  const { idl } = decodeIdlAccount(idlAccountBytes(SAMPLE_IDL, { padding: 4096 }));
  assert.deepEqual(idl, SAMPLE_IDL);
});

test('decodeIdlAccount rejects short, foreign and truncated accounts', () => {
  assert.throws(() => decodeIdlAccount(Buffer.alloc(10)), /too short/);
  assert.throws(
    () => decodeIdlAccount(idlAccountBytes(SAMPLE_IDL, { discriminator: Buffer.alloc(8, 7) })),
    /not an Anchor IDL account/
  );
  assert.throws(() => decodeIdlAccount(idlAccountBytes(SAMPLE_IDL, { length: 99999, padding: 0 })), /truncated/);
});

test('decodeIdlAccount reports bad compression and bad JSON cleanly', () => {
  const garbage = Buffer.from('definitely not zlib data');
  assert.throws(() => decodeIdlAccount(idlAccountBytes(SAMPLE_IDL, { compressed: garbage })), /decompress/);

  const notJson = zlib.deflateSync(Buffer.from('{oops'));
  assert.throws(() => decodeIdlAccount(idlAccountBytes(SAMPLE_IDL, { compressed: notJson })), /not valid JSON/);
});

test('decodeIdlAccount errors are IdlError with a code', () => {
  assert.throws(() => decodeIdlAccount(Buffer.alloc(10)), (err) => {
    assert.ok(err instanceof IdlError);
    assert.equal(err.code, 'invalid');
    return true;
  });
});

test('fetchIdl asks for the derived IDL address and decodes the account', async () => {
  const { client, mock } = clientFor({
    getAccountInfo: accountInfo(idlAccountBytes(), PROGRAM),
  });
  const result = await fetchIdl(client, PROGRAM);

  assert.equal(result.program, PROGRAM);
  assert.equal(result.address, '4nmzuuebvZ9EVghi2khvz9SyxUNvuXXdAzWtG5N7avYf');
  assert.equal(result.address, idlAddress(PROGRAM));
  assert.equal(result.authority, AUTHORITY);
  assert.deepEqual(result.idl, SAMPLE_IDL);

  assert.equal(mock.calls[0].method, 'getAccountInfo');
  assert.equal(mock.calls[0].params[0], result.address);
  assert.deepEqual(mock.calls[0].params[1], { encoding: 'base64' });
});

test('fetchIdl reports a program with no IDL as not-found', async () => {
  const { client } = clientFor({ getAccountInfo: { context: { slot: 1 }, value: null } });
  await assert.rejects(fetchIdl(client, PROGRAM), (err) => {
    assert.ok(err instanceof IdlError);
    assert.equal(err.code, 'not-found');
    assert.match(err.message, /No Anchor IDL found/);
    return true;
  });
});

test('fetchIdl refuses an IDL account not owned by the program', async () => {
  const { client } = clientFor({
    getAccountInfo: accountInfo(idlAccountBytes(), '11111111111111111111111111111111'),
  });
  await assert.rejects(fetchIdl(client, PROGRAM), /not owned by the program/);
});

test('fetchIdl rejects unexpected account data from the RPC', async () => {
  const info = accountInfo(idlAccountBytes(), PROGRAM);
  info.value.data = 'not-an-array';
  const { client } = clientFor({ getAccountInfo: info });
  await assert.rejects(fetchIdl(client, PROGRAM), /Unexpected account data/);
});

test('fetchIdl passes RPC errors through', async () => {
  const { client } = clientFor({ getAccountInfo: rpcError(-32005, 'Node is unhealthy') });
  await assert.rejects(fetchIdl(client, PROGRAM), (err) => {
    assert.ok(err instanceof RpcError);
    assert.match(err.message, /Node is unhealthy/);
    return true;
  });
});