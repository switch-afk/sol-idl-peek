'use strict';

const { IdlError } = require('./idl');

function list(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return typeof value === 'string' && value ? value : null;
}

function nameOf(item) {
  return item && typeof item === 'object' && text(item.name) ? item.name : '?';
}

function genericToString(generic) {
  if (!generic || typeof generic !== 'object') return 'unknown';
  if (generic.kind === 'const') return String(generic.value);
  return typeToString(generic.type);
}

// Renders an IDL type (old and new formats) the way you would write it in Rust.
function typeToString(type) {
  if (typeof type === 'string') return type === 'publicKey' ? 'pubkey' : type;
  if (!type || typeof type !== 'object') return 'unknown';

  if ('vec' in type) return `Vec<${typeToString(type.vec)}>`;
  if ('option' in type) return `Option<${typeToString(type.option)}>`;
  if ('coption' in type) return `COption<${typeToString(type.coption)}>`;
  if (Array.isArray(type.array)) return `[${typeToString(type.array[0])}; ${type.array[1]}]`;
  if (Array.isArray(type.tuple)) return `(${type.tuple.map(typeToString).join(', ')})`;
  if ('generic' in type) return String(type.generic);

  if ('defined' in type) {
    const defined = type.defined;
    const name = typeof defined === 'string' ? defined : defined && defined.name;
    if (!name) return 'unknown';
    const generics = defined && typeof defined === 'object' ? list(defined.generics) : [];
    return generics.length > 0 ? `${name}<${generics.map(genericToString).join(', ')}>` : name;
  }

  return 'unknown';
}

// Reduces an IDL, in either the old (Anchor 0.29 and older) or the new
// (Anchor 0.30+) format, to what the text output needs.
function summarizeIdl(idl) {
  if (!idl || typeof idl !== 'object' || Array.isArray(idl)) {
    throw new IdlError('The IDL is not a JSON object', 'invalid');
  }

  const meta = idl.metadata && typeof idl.metadata === 'object' ? idl.metadata : {};

  return {
    name: text(meta.name) || text(idl.name),
    version: text(meta.version) || text(idl.version),
    spec: text(meta.spec),
    instructions: list(idl.instructions).map((ix) => ({
      name: nameOf(ix),
      args: list(ix && ix.args).map((arg) => ({
        name: nameOf(arg),
        type: typeToString(arg && arg.type),
      })),
    })),
    accounts: list(idl.accounts).map(nameOf),
    events: list(idl.events).map(nameOf),
    errorCount: list(idl.errors).length,
    typeCount: list(idl.types).length,
  };
}

module.exports = { typeToString, summarizeIdl };