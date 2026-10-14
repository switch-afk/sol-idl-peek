'use strict';

const { parseArgs, UsageError } = require('./args');
const { version } = require('../package.json');

const HELP = `sol-idl-peek v${version}

Peek at the on-chain Anchor IDL of a Solana program: its instructions,
accounts, types, events and errors. Read-only: never signs anything.

Usage:
  sol-idl-peek <program-address> [options]

Options:
  --rpc <url>       RPC endpoint (or set SOL_IDL_PEEK_RPC)
  --json            Print machine-readable JSON
  -h, --help        Show this help
  -v, --version     Show the version
`;

async function run(argv, io = {}) {
  const stdout = io.stdout || process.stdout;
  const stderr = io.stderr || process.stderr;

  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    if (err instanceof UsageError) {
      stderr.write(`Error: ${err.message}\n\n${HELP}`);
      return 2;
    }
    throw err;
  }

  if (opts.help) {
    stdout.write(HELP);
    return 0;
  }
  if (opts.version) {
    stdout.write(`${version}\n`);
    return 0;
  }

  stderr.write('Error: fetching IDLs is not implemented yet\n');
  return 1;
}

module.exports = { run, HELP };