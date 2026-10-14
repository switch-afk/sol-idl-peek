'use strict';

const { summarizeIdl } = require('./summary');

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function nameLine(summary) {
  const label = [summary.name || 'unknown', summary.version].filter(Boolean).join(' ');
  return summary.spec ? `${label} (IDL spec ${summary.spec})` : label;
}

function signature(instruction) {
  const args = instruction.args.map((arg) => `${arg.name}: ${arg.type}`).join(', ');
  return `${instruction.name}(${args})`;
}

function section(title, items) {
  return ['', `${title} (${items.length})`, ...items.map((item) => `  ${item}`)];
}

function renderText(result) {
  const summary = summarizeIdl(result.idl);

  const lines = [
    `Program:    ${result.program}`,
    `Name:       ${nameLine(summary)}`,
    `IDL:        ${result.address}`,
    `Authority:  ${result.authority}`,
  ];

  if (summary.instructions.length > 0) {
    lines.push(...section('Instructions', summary.instructions.map(signature)));
  }
  if (summary.accounts.length > 0) {
    lines.push(...section('Accounts', summary.accounts));
  }
  if (summary.events.length > 0) {
    lines.push(...section('Events', summary.events));
  }

  const also = [];
  if (summary.errorCount > 0) also.push(plural(summary.errorCount, 'error'));
  if (summary.typeCount > 0) also.push(plural(summary.typeCount, 'type'));
  if (also.length > 0) lines.push('', `Also: ${also.join(', ')}`);

  return lines.join('\n') + '\n';
}

function renderJsonValue(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function renderJson(result) {
  return renderJsonValue(result.idl);
}

function accountNotes(account) {
  const flags = [];
  if (account.writable) flags.push('writable');
  if (account.signer) flags.push('signer');
  if (account.optional) flags.push('optional');
  if (account.pda) flags.push('pda');
  const parts = [];
  if (flags.length > 0) parts.push(flags.join(', '));
  if (account.address) parts.push(`address ${account.address}`);
  return parts.join('  ');
}

function renderInstruction(detail) {
  const lines = [`Instruction:    ${detail.name}`];
  if (detail.discriminator) lines.push(`Discriminator:  ${detail.discriminator}`);

  if (detail.docs.length > 0) lines.push('', ...detail.docs);

  if (detail.args.length > 0) {
    lines.push(...section('Args', detail.args.map((arg) => `${arg.name}: ${arg.type}`)));
  }

  if (detail.accounts.length > 0) {
    const indexWidth = String(detail.accounts.length).length;
    const nameWidth = Math.max(...detail.accounts.map((a) => a.path.length));
    const rows = detail.accounts.map((account, i) => {
      const index = String(i + 1).padStart(indexWidth);
      const notes = accountNotes(account);
      return `${index}  ${account.path.padEnd(nameWidth)}${notes ? `  ${notes}` : ''}`.trimEnd();
    });
    lines.push(...section('Accounts', rows));
  }

  if (detail.returns) lines.push('', `Returns: ${detail.returns}`);

  return lines.join('\n') + '\n';
}

// A few programs have very long error names; cap the column so one of them
// does not push every message far to the right.
const MAX_NAME_WIDTH = 30;

function renderErrors(errors) {
  if (errors.length === 0) return 'This IDL has no errors.\n';

  const codes = errors.map((e) => (e.code === null ? '-' : String(e.code)));
  const codeWidth = Math.max(...codes.map((c) => c.length));
  const nameWidth = Math.min(Math.max(...errors.map((e) => e.name.length)), MAX_NAME_WIDTH);

  const rows = errors.map((error, i) => {
    const row = `${codes[i].padEnd(codeWidth)}  ${error.name.padEnd(nameWidth)}`;
    return error.msg ? `${row}  ${error.msg}` : row.trimEnd();
  });
  return [`Errors (${errors.length})`, ...rows.map((row) => `  ${row}`)].join('\n') + '\n';
}

function renderTypes(types) {
  if (types.length === 0) return 'This IDL has no types.\n';

  const lines = [`Types (${types.length})`];
  for (const type of types) {
    lines.push('', `${type.name} (${type.kind})`, ...type.lines.map((line) => `  ${line}`));
  }
  return lines.join('\n') + '\n';
}

module.exports = {
  renderText,
  renderJson,
  renderJsonValue,
  renderInstruction,
  renderErrors,
  renderTypes,
};