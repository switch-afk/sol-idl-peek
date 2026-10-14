'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  findInstruction,
  describeInstruction,
  rawErrors,
  listErrors,
  rawTypes,
  listTypes,
} = require('../src/detail');
const { IdlError } = require('../src/idl');
const { DETAIL_IDL, OLD_STYLE_IDL } = require('./helpers/fixtures');

test('findInstruction prefers an exact name', () => {
  assert.equal(findInstruction(DETAIL_IDL, 'collect_fees').name, 'collect_fees');
  assert.equal(findInstruction(DETAIL_IDL, 'collect_fees_v2').name, 'collect_fees_v2');
});

test('findInstruction ignores case, underscores and hyphens', () => {
  assert.equal(findInstruction(DETAIL_IDL, 'collectFees').name, 'collect_fees');
  assert.equal(findInstruction(DETAIL_IDL, 'COLLECT-FEES-V2').name, 'collect_fees_v2');
  assert.equal(findInstruction(OLD_STYLE_IDL, 'add_validator').name, 'addValidator');
});

test('findInstruction suggests close names when nothing matches', () => {
  assert.throws(() => findInstruction(DETAIL_IDL, 'collect'), (err) => {
    assert.ok(err instanceof IdlError);
    assert.equal(err.code, 'not-found');
    assert.match(err.message, /No instruction named "collect" in this IDL/);
    assert.match(err.message, /Did you mean: collect_fees, collect_fees_v2\?/);
    return true;
  });
});

test('findInstruction gives no suggestion when nothing is close', () => {
  assert.throws(() => findInstruction(DETAIL_IDL, 'zzz'), (err) => {
    assert.match(err.message, /No instruction named "zzz" in this IDL$/);
    return true;
  });
});

test('findInstruction rejects an IDL that is not a JSON object', () => {
  assert.throws(() => findInstruction(null, 'swap'), /not a JSON object/);
});

test('describeInstruction reads docs, discriminator, args and returns', () => {
  const detail = describeInstruction(findInstruction(DETAIL_IDL, 'swap'));
  assert.equal(detail.name, 'swap');
  assert.equal(detail.discriminator, 'f8c69e91e17587c8');
  assert.deepEqual(detail.docs, ['Swap one token for another.', '', '### Authority', '- `owner` signs.']);
  assert.deepEqual(detail.args, [
    { name: 'amount', type: 'u64' },
    { name: 'route', type: 'Vec<Hop>' },
  ]);
  assert.equal(detail.returns, 'u64');
});

test('describeInstruction flattens nested accounts and reads the new flags', () => {
  const { accounts } = describeInstruction(findInstruction(DETAIL_IDL, 'swap'));
  assert.deepEqual(
    accounts.map((a) => a.path),
    ['pool', 'owner', 'vaults.vault_a', 'vaults.vault_b', 'token_program']
  );
  assert.deepEqual(accounts[0], { path: 'pool', writable: true, signer: false, optional: false, pda: true, address: null });
  assert.equal(accounts[1].signer, true);
  assert.equal(accounts[3].optional, true);
  assert.equal(accounts[4].address, 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
});

test('describeInstruction reads the old flags and nested groups', () => {
  const { accounts, discriminator, returns } = describeInstruction(findInstruction(OLD_STYLE_IDL, 'addValidator'));
  assert.equal(discriminator, null);
  assert.equal(returns, null);
  assert.deepEqual(
    accounts.map((a) => [a.path, a.writable, a.signer, a.optional]),
    [
      ['common.state', true, false, false],
      ['common.authority', false, true, false],
      ['rentPayer', true, true, true],
    ]
  );
});

test('describeInstruction ignores a malformed discriminator and odd entries', () => {
  const detail = describeInstruction({ name: 'x', discriminator: [1, 'two', 3], docs: ['ok', 5], accounts: [null], args: [null] });
  assert.equal(detail.discriminator, null);
  assert.deepEqual(detail.docs, ['ok']);
  assert.deepEqual(detail.accounts, [{ path: '?', writable: false, signer: false, optional: false, pda: false, address: null }]);
  assert.deepEqual(detail.args, [{ name: '?', type: 'unknown' }]);
});

test('listErrors returns code, name and message', () => {
  assert.deepEqual(listErrors(DETAIL_IDL), [
    { code: 6000, name: 'Unauthorized', msg: 'Not allowed' },
    { code: 6001, name: 'Overflow', msg: 'Math overflow' },
    { code: 6100, name: 'Silent', msg: null },
  ]);
  assert.deepEqual(listErrors({}), []);
  assert.deepEqual(listErrors({ errors: [null, { code: 'x', name: 'Odd' }] }), [
    { code: null, name: '?', msg: null },
    { code: null, name: 'Odd', msg: null },
  ]);
});

test('rawErrors and rawTypes return the original entries', () => {
  assert.equal(rawErrors(DETAIL_IDL), DETAIL_IDL.errors);
  assert.equal(rawTypes(DETAIL_IDL).length, DETAIL_IDL.types.length);
  assert.throws(() => rawErrors([]), /not a JSON object/);
  assert.throws(() => rawTypes('x'), /not a JSON object/);
});

test('listTypes describes structs, tuple structs, unit structs, enums, aliases and generics', () => {
  const types = Object.fromEntries(listTypes(DETAIL_IDL).map((t) => [t.name, t]));

  assert.deepEqual(types.Hop, { name: 'Hop', kind: 'struct', lines: ['pool: pubkey', 'fee_bps: u16'] });
  assert.deepEqual(types.Pair, { name: 'Pair', kind: 'struct', lines: ['(u8, Vec<u16>)'] });
  assert.deepEqual(types.Marker, { name: 'Marker', kind: 'struct', lines: ['(no fields)'] });
  assert.deepEqual(types.Mode, {
    name: 'Mode',
    kind: 'enum',
    lines: ['Fast', 'Exact { amount: u64, slippage: u16 }', 'Split(u8, u8)'],
  });
  assert.deepEqual(types.Alias, { name: 'Alias', kind: 'alias', lines: ['[u8; 32]'] });
  assert.deepEqual(types['Wrapper<T, const N: usize>'], {
    name: 'Wrapper<T, const N: usize>',
    kind: 'struct',
    lines: ['inner: T'],
  });
  assert.deepEqual(types.Odd, { name: 'Odd', kind: 'unknown', lines: [] });
});

test('listTypes includes account structs from older IDLs', () => {
  const types = listTypes(OLD_STYLE_IDL);
  assert.deepEqual(
    types.map((t) => t.name),
    ['Fee', 'State']
  );
  assert.deepEqual(types[1].lines, ['validatorCount: u32']);
});