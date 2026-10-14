'use strict';

const { isValidAddress } = require('./address');

const VALUE_OPTIONS = {
  '--rpc': { key: 'rpc', needs: 'a URL' },
  '--instruction': { key: 'instruction', needs: 'a name' },
};

const FLAG_OPTIONS = {
  '--json': 'json',
  '--errors': 'errors',
  '--types': 'types',
};

class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UsageError';
  }
}

function checkRpcUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new UsageError('--rpc must be a valid http(s) URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UsageError('--rpc must be a valid http(s) URL');
  }
  return value;
}

function parseArgs(argv) {
  const opts = {
    program: null,
    rpc: null,
    instruction: null,
    errors: false,
    types: false,
    json: false,
    help: false,
    version: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    let name = arg;
    let inline = null;
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq !== -1) {
        name = arg.slice(0, eq);
        inline = arg.slice(eq + 1);
      }
    }

    if (name === '--help' || name === '-h') {
      opts.help = true;
    } else if (name === '--version' || name === '-v') {
      opts.version = true;
    } else if (FLAG_OPTIONS[name]) {
      if (inline !== null) throw new UsageError(`${name} does not take a value`);
      opts[FLAG_OPTIONS[name]] = true;
    } else if (VALUE_OPTIONS[name]) {
      const { key, needs } = VALUE_OPTIONS[name];
      let value = inline;
      if (value === null) {
        value = argv[++i];
        if (value === undefined || value.startsWith('-')) {
          throw new UsageError(`${name} needs ${needs}`);
        }
      }
      if (value === '') {
        throw new UsageError(`${name} needs ${needs}`);
      }

      opts[key] = key === 'rpc' ? checkRpcUrl(value) : value;
    } else if (arg.startsWith('-')) {
      throw new UsageError(`Unknown option: ${name}`);
    } else if (opts.program === null) {
      opts.program = arg;
    } else {
      throw new UsageError('Only one program address can be given');
    }
  }

  if (!opts.help && !opts.version) {
    const views = [opts.instruction !== null, opts.errors, opts.types].filter(Boolean).length;
    if (views > 1) {
      throw new UsageError('Use only one of --instruction, --errors and --types');
    }
    if (!opts.program) {
      throw new UsageError('Missing program address');
    }
    if (!isValidAddress(opts.program)) {
      throw new UsageError('Not a valid Solana address');
    }
  }

  return opts;
}

module.exports = { parseArgs, UsageError };