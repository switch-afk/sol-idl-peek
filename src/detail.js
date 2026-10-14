'use strict';

const { IdlError } = require('./idl');
const { typeToString, assertIdlObject, list, text, nameOf } = require('./summary');

function isObject(value) {
  return Boolean(value) && typeof value === 'object';
}

// "collect_fees", "collectFees" and "collect-fees" all mean the same thing.
function normalizeName(name) {
  return String(name).toLowerCase().replace(/[_-]/g, '');
}

function findInstruction(idl, query) {
  assertIdlObject(idl);
  const instructions = list(idl.instructions).filter((ix) => isObject(ix) && text(ix.name));

  const exact = instructions.find((ix) => ix.name === query);
  if (exact) return exact;

  const key = normalizeName(query);
  const loose = instructions.find((ix) => normalizeName(ix.name) === key);
  if (loose) return loose;

  const near = instructions
    .map((ix) => ix.name)
    .filter((name) => {
      const other = normalizeName(name);
      return other.includes(key) || (other.length >= 3 && key.includes(other));
    })
    .slice(0, 5);
  const hint = near.length > 0 ? `. Did you mean: ${near.join(', ')}?` : '';
  throw new IdlError(`No instruction named "${query}" in this IDL${hint}`, 'not-found');
}

// Old IDLs use isMut/isSigner/isOptional, new ones writable/signer/optional.
// Nested account groups are flattened into group.child paths.
function flattenAccounts(accounts, prefix = '') {
  const flat = [];
  for (const item of list(accounts)) {
    if (isObject(item) && Array.isArray(item.accounts)) {
      flat.push(...flattenAccounts(item.accounts, `${prefix}${nameOf(item)}.`));
      continue;
    }
    const account = isObject(item) ? item : {};
    flat.push({
      path: prefix + nameOf(item),
      writable: account.writable === true || account.isMut === true,
      signer: account.signer === true || account.isSigner === true,
      optional: account.optional === true || account.isOptional === true,
      pda: isObject(account.pda),
      address: text(account.address),
    });
  }
  return flat;
}

function discriminatorHex(value) {
  const valid =
    Array.isArray(value) && value.length > 0 && value.every((n) => Number.isInteger(n) && n >= 0 && n <= 255);
  return valid ? Buffer.from(value).toString('hex') : null;
}

function describeInstruction(raw) {
  return {
    name: nameOf(raw),
    discriminator: discriminatorHex(raw.discriminator),
    docs: list(raw.docs).filter((line) => typeof line === 'string'),
    args: list(raw.args).map((arg) => ({
      name: nameOf(arg),
      type: typeToString(isObject(arg) ? arg.type : undefined),
    })),
    accounts: flattenAccounts(raw.accounts),
    returns: raw.returns === undefined ? null : typeToString(raw.returns),
  };
}

function rawErrors(idl) {
  assertIdlObject(idl);
  return list(idl.errors);
}

function listErrors(idl) {
  return rawErrors(idl).map((error) => ({
    code: isObject(error) && Number.isInteger(error.code) ? error.code : null,
    name: nameOf(error),
    msg: isObject(error) ? text(error.msg) : null,
  }));
}

// Newer IDLs keep every struct and enum in "types". Older ones keep account
// structs inside "accounts", so those are included too.
function rawTypes(idl) {
  assertIdlObject(idl);
  const accountTypes = list(idl.accounts).filter((a) => isObject(a) && isObject(a.type));
  return [...list(idl.types), ...accountTypes];
}

function isNamed(fields) {
  return fields.every((f) => isObject(f) && 'name' in f && 'type' in f);
}

function fieldLines(fields) {
  if (!Array.isArray(fields) || fields.length === 0) return [];
  if (isNamed(fields)) return fields.map((f) => `${nameOf(f)}: ${typeToString(f.type)}`);
  return [`(${fields.map(typeToString).join(', ')})`];
}

function variantLine(variant) {
  const name = nameOf(variant);
  const fields = isObject(variant) ? variant.fields : null;
  if (!Array.isArray(fields) || fields.length === 0) return name;
  if (isNamed(fields)) {
    return `${name} { ${fields.map((f) => `${nameOf(f)}: ${typeToString(f.type)}`).join(', ')} }`;
  }
  return `${name}(${fields.map(typeToString).join(', ')})`;
}

function genericLabel(generic) {
  if (!isObject(generic)) return '?';
  if (generic.kind === 'const') return `const ${nameOf(generic)}: ${typeToString(generic.type)}`;
  return nameOf(generic);
}

function describeType(raw) {
  const generics = isObject(raw) ? list(raw.generics) : [];
  const name = nameOf(raw) + (generics.length > 0 ? `<${generics.map(genericLabel).join(', ')}>` : '');
  const def = isObject(raw) && isObject(raw.type) ? raw.type : {};

  if (def.kind === 'struct') {
    const lines = fieldLines(def.fields);
    return { name, kind: 'struct', lines: lines.length > 0 ? lines : ['(no fields)'] };
  }
  if (def.kind === 'enum') {
    return { name, kind: 'enum', lines: list(def.variants).map(variantLine) };
  }
  if (def.kind === 'type') {
    return { name, kind: 'alias', lines: [typeToString(def.alias)] };
  }
  return { name, kind: 'unknown', lines: [] };
}

function listTypes(idl) {
  return rawTypes(idl).map(describeType);
}

module.exports = {
  findInstruction,
  describeInstruction,
  rawErrors,
  listErrors,
  rawTypes,
  listTypes,
};