'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  renderText,
  renderJson,
  renderJsonValue,
  renderInstruction,
  renderErrors,
  renderTypes,
} = require('../src/format');
const { findInstruction, describeInstruction, listErrors, listTypes } = require('../src/detail');
const { AUTHORITY, SAMPLE_IDL, OLD_STYLE_IDL, DETAIL_IDL } = require('./helpers/fixtures');

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

test('renderJsonValue pretty-prints any value with a trailing newline', () => {
  assert.equal(renderJsonValue([1]), '[\n  1\n]\n');
});

test('renderInstruction shows discriminator, docs, args, accounts and returns', () => {
  const out = renderInstruction(describeInstruction(findInstruction(DETAIL_IDL, 'swap')));
  assert.equal(
    out,
    [
      'Instruction:    swap',
      'Discriminator:  f8c69e91e17587c8',
      '',
      'Swap one token for another.',
      '',
      '### Authority',
      '- `owner` signs.',
      '',
      'Args (2)',
      '  amount: u64',
      '  route: Vec<Hop>',
      '',
      'Accounts (5)',
      '  1  pool            writable, pda',
      '  2  owner           signer',
      '  3  vaults.vault_a  writable',
      '  4  vaults.vault_b  writable, optional',
      '  5  token_program   address TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      '',
      'Returns: u64',
      '',
    ].join('\n')
  );
});

test('renderInstruction leaves out empty parts and pads long account lists', () => {
  const bare = renderInstruction(describeInstruction({ name: 'ping', accounts: [], args: [] }));
  assert.equal(bare, 'Instruction:    ping\n');

  const accounts = Array.from({ length: 10 }, (_, i) => ({ name: `a${i}`, isMut: i === 9 }));
  const out = renderInstruction(describeInstruction({ name: 'many', accounts, args: [] }));
  assert.match(out, /^ {3}1 {2}a0$/m);
  assert.match(out, /^ {2}10 {2}a9 {2}writable$/m);
});

test('renderErrors aligns code, name and message', () => {
  assert.equal(
    renderErrors(listErrors(DETAIL_IDL)),
    [
      'Errors (3)',
      '  6000  Unauthorized  Not allowed',
      '  6001  Overflow      Math overflow',
      '  6100  Silent',
      '',
    ].join('\n')
  );
});

test('renderErrors caps the name column so one long name does not widen every row', () => {
  const longName = 'X'.repeat(50);
  const out = renderErrors([
    { code: 1, name: 'Short', msg: 'a' },
    { code: 2, name: longName, msg: 'b' },
  ]);
  assert.equal(
    out,
    ['Errors (2)', `  1  Short${' '.repeat(25)}  a`, `  2  ${longName}  b`, ''].join('\n')
  );
});

test('renderErrors handles a missing code and an empty list', () => {
  assert.match(renderErrors([{ code: null, name: 'Odd', msg: 'x' }]), /^ {2}- {2}Odd {2}x$/m);
  assert.equal(renderErrors([]), 'This IDL has no errors.\n');
});

test('renderTypes prints each type with its kind and members', () => {
  const out = renderTypes(listTypes(DETAIL_IDL));
  assert.match(out, /^Types \(7\)$/m);
  assert.match(out, /^Hop \(struct\)\n {2}pool: pubkey\n {2}fee_bps: u16$/m);
  assert.match(out, /^Mode \(enum\)\n {2}Fast\n {2}Exact \{ amount: u64, slippage: u16 \}\n {2}Split\(u8, u8\)$/m);
  assert.match(out, /^Alias \(alias\)\n {2}\[u8; 32\]$/m);
  assert.match(out, /^Wrapper<T, const N: usize> \(struct\)$/m);
  assert.match(out, /^Odd \(unknown\)$/m);
  assert.ok(out.endsWith('\n'));
  assert.ok(!out.endsWith('\n\n'));
});

test('renderTypes handles an empty list', () => {
  assert.equal(renderTypes([]), 'This IDL has no types.\n');
});