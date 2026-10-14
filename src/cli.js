'use strict';

const { parseArgs, UsageError } = require('./args');
const { createRpcClient, resolveRpcUrl, RpcError } = require('./rpc');
const { fetchIdl, IdlError } = require('./idl');
const {
  findInstruction,
  describeInstruction,
  rawErrors,
  listErrors,
  rawTypes,
  listTypes,
} = require('./detail');
const {
  renderText,
  renderJson,
  renderJsonValue,
  renderInstruction,
  renderErrors,
  renderTypes,
} = require('./format');
const { version } = require('../package.json');

const HELP = `sol-idl-peek v${version}

Peek at the on-chain Anchor IDL of a Solana program: its instructions,
accounts, types, events and errors. Read-only: never signs anything.

Usage:
  sol-idl-peek <program-address> [options]

Options:
  --instruction <name>  Show one instruction in full: args, accounts, docs
  --errors              List every error code and message
  --types               List every struct and enum
  --rpc <url>           RPC endpoint (or set SOL_IDL_PEEK_RPC)
  --json                Print the full IDL as JSON (or just the part you picked)
  -h, --help            Show this help
  -v, --version         Show the version
`;

function output(result, opts) {
  const { idl } = result;

  if (opts.instruction !== null) {
    const raw = findInstruction(idl, opts.instruction);
    return opts.json ? renderJsonValue(raw) : renderInstruction(describeInstruction(raw));
  }
  if (opts.errors) {
    return opts.json ? renderJsonValue(rawErrors(idl)) : renderErrors(listErrors(idl));
  }
  if (opts.types) {
    return opts.json ? renderJsonValue(rawTypes(idl)) : renderTypes(listTypes(idl));
  }
  return opts.json ? renderJson(result) : renderText(result);
}

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
    const result = await fetchIdl(client, opts.program);
    stdout.write(output(result, opts));
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