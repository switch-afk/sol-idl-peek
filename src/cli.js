'use strict';

const { parseArgs, UsageError } = require('./args');
const { createRpcClient, resolveRpcUrl, RpcError } = require('./rpc');
const { fetchIdl, IdlError } = require('./idl');
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
  const env = io.env || process.env;

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

  const client = createRpcClient({
    url: resolveRpcUrl(opts.rpc, env),
    fetch: io.fetch,
    sleep: io.sleep,
  });

  try {
    const { idl } = await fetchIdl(client, opts.program);
    stdout.write(JSON.stringify(idl, null, 2) + '\n');
    return 0;
  } catch (err) {
    if (err instanceof RpcError || err instanceof IdlError) {
      stderr.write(`Error: ${err.message}\n`);
      return 1;
    }
    throw err;
  }
}

module.exports = { run, HELP };