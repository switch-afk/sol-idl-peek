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

function renderJson(result) {
  return JSON.stringify(result.idl, null, 2) + '\n';
}

module.exports = { renderText, renderJson };