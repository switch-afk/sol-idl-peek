'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { typeToString, summarizeIdl } = require('../src/summary');
const { IdlError } = require('../src/idl');
const { SAMPLE_IDL, OLD_STYLE_IDL } = require('./helpers/fixtures');

test('typeToString renders primitives and the old publicKey name', () => {
  assert.equal(typeToString('u64'), 'u64');
  assert.equal(typeToString('bool'), 'bool');
  assert.equal(typeToString('pubkey'), 'pubkey');
  assert.equal(typeToString('publicKey'), 'pubkey');
});

test('typeToString renders wrapped, array and tuple types', () => {
  assert.equal(typeToString({ vec: 'u8' }), 'Vec<u8>');
  assert.equal(typeToString({ option: 'u32' }), 'Option<u32>');
  assert.equal(typeToString({ coption: 'pubkey' }), 'COption<pubkey>');
  assert.equal(typeToString({ array: ['u8', 32] }), '[u8; 32]');
  assert.equal(typeToString({ tuple: ['u8', { vec: 'u16' }] }), '(u8, Vec<u16>)');
  assert.equal(typeToString({ vec: { option: { defined: { name: 'Fee' } } } }), 'Vec<Option<Fee>>');
});

test('typeToString renders defined types in both formats, with generics', () => {
  assert.equal(typeToString({ defined: 'Fee' }), 'Fee');
  assert.equal(typeToString({ defined: { name: 'Fee' } }), 'Fee');
  assert.equal(
    typeToString({
      defined: { name: 'Pair', generics: [{ kind: 'type', type: 'u8' }, { kind: 'const', value: '6' }] },
    }),
    'Pair<u8, 6>'
  );
  assert.equal(typeToString({ generic: 'T' }), 'T');
});

test('typeToString falls back to unknown for shapes it does not recognise', () => {
  assert.equal(typeToString(undefined), 'unknown');
  assert.equal(typeToString(null), 'unknown');
  assert.equal(typeToString({ weird: true }), 'unknown');
  assert.equal(typeToString({ defined: {} }), 'unknown');
});

test('summarizeIdl reads the new format', () => {
  const summary = summarizeIdl(SAMPLE_IDL);
  assert.equal(summary.name, 'sample');
  assert.equal(summary.version, '0.1.0');
  assert.equal(summary.spec, '0.1.0');
  assert.deepEqual(summary.instructions, [
    {
      name: 'initialize',
      args: [
        { name: 'fee_authority', type: 'pubkey' },
        { name: 'fee_rate', type: 'u16' },
      ],
    },
    { name: 'close', args: [] },
  ]);
  assert.deepEqual(summary.accounts, ['State', 'Vault']);
  assert.deepEqual(summary.events, ['Deposited']);
  assert.equal(summary.errorCount, 2);
  assert.equal(summary.typeCount, 1);
});

test('summarizeIdl reads the old format', () => {
  const summary = summarizeIdl(OLD_STYLE_IDL);
  assert.equal(summary.name, 'marinade_finance');
  assert.equal(summary.version, '0.1.0');
  assert.equal(summary.spec, null);
  assert.deepEqual(summary.instructions[1], {
    name: 'addValidator',
    args: [
      { name: 'index', type: 'u32' },
      { name: 'score', type: 'Option<u32>' },
      { name: 'keys', type: 'Vec<pubkey>' },
    ],
  });
  assert.deepEqual(summary.accounts, ['State']);
  assert.deepEqual(summary.events, ['DepositEvent']);
  assert.equal(summary.errorCount, 1);
  assert.equal(summary.typeCount, 1);
});

test('summarizeIdl copes with missing sections and odd entries', () => {
  const summary = summarizeIdl({ instructions: [{ name: 'a' }, null, { args: 'nope' }] });
  assert.equal(summary.name, null);
  assert.deepEqual(summary.instructions, [
    { name: 'a', args: [] },
    { name: '?', args: [] },
    { name: '?', args: [] },
  ]);
  assert.deepEqual(summary.accounts, []);
  assert.deepEqual(summary.events, []);
  assert.equal(summary.errorCount, 0);
  assert.equal(summary.typeCount, 0);
});

test('summarizeIdl rejects an IDL that is not a JSON object', () => {
  for (const bad of [null, 'text', 42, [1, 2]]) {
    assert.throws(() => summarizeIdl(bad), (err) => {
      assert.ok(err instanceof IdlError);
      assert.match(err.message, /not a JSON object/);
      return true;
    });
  }
});