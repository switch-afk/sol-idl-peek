'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { renderText, renderJson } = require('../src/format');
const { AUTHORITY, SAMPLE_IDL, OLD_STYLE_IDL } = require('./helpers/fixtures');

const PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const IDL_ADDRESS = '4nmzuuebvZ9EVghi2khvz9SyxUNvuXXdAzWtG5N7avYf';

function result(idl) {
  return { program: PROGRAM, address: IDL_ADDRESS, authority: AUTHORITY, idl };
}

test('renders the header, sections and counts for a new-style IDL', () => {
  assert.equal(
    renderText(result(SAMPLE_IDL)),
    [
      `Program:    ${PROGRAM}`,
      'Name:       sample 0.1.0 (IDL spec 0.1.0)',
      `IDL:        ${IDL_ADDRESS}`,
      `Authority:  ${AUTHORITY}`,
      '',
      'Instructions (2)',
      '  initialize(fee_authority: pubkey, fee_rate: u16)',
      '  close()',
      '',
      'Accounts (2)',
      '  State',
      '  Vault',
      '',
      'Events (1)',
      '  Deposited',
      '',
      'Also: 2 errors, 1 type',
      '',
    ].join('\n')
  );
});

test('renders an old-style IDL without a spec', () => {
  const out = renderText(result(OLD_STYLE_IDL));
  assert.match(out, /^Name:       marinade_finance 0\.1\.0$/m);
  assert.match(out, /^ {2}deposit\(lamports: u64\)$/m);
  assert.match(out, /^ {2}addValidator\(index: u32, score: Option<u32>, keys: Vec<pubkey>\)$/m);
  assert.match(out, /^Also: 1 error, 1 type$/m);
});

test('leaves out sections that are empty and names an unnamed IDL', () => {
  const out = renderText(result({ instructions: [{ name: 'ping', args: [] }] }));
  assert.match(out, /^Name:       unknown$/m);
  assert.match(out, /^Instructions \(1\)$/m);
  assert.doesNotMatch(out, /Accounts/);
  assert.doesNotMatch(out, /Events/);
  assert.doesNotMatch(out, /Also:/);
  assert.ok(out.endsWith('\n'));
  assert.ok(!out.endsWith('\n\n'));
});

test('renderJson prints the IDL unchanged', () => {
  assert.deepEqual(JSON.parse(renderJson(result(SAMPLE_IDL))), SAMPLE_IDL);
  assert.ok(renderJson(result(SAMPLE_IDL)).endsWith('}\n'));
});