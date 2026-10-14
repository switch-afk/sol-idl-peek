# sol-idl-peek

[![CI](https://github.com/switch-afk/sol-idl-peek/actions/workflows/ci.yml/badge.svg)](https://github.com/switch-afk/sol-idl-peek/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/sol-idl-peek)](https://www.npmjs.com/package/sol-idl-peek)
[![license](https://img.shields.io/npm/l/sol-idl-peek)](LICENSE)

Peek at the on-chain Anchor IDL of any Solana program: its instructions, accounts, types, events and errors, straight from your terminal.

Anchor programs can publish an IDL, a JSON description of their interface, to a special account on chain. This tool finds that account for any program address, decodes it and prints it in a readable form, so you can see what a program does without cloning its repo or digging through an explorer.

- Read-only: it never signs anything and never asks for a key
- Handles both IDL formats: old (Anchor 0.29 and older) and new (0.30+)
- Detail view per instruction: args, accounts with signer, writable and optional flags, docs
- Zero dependencies, Node 18+

## Install

```bash
npx sol-idl-peek <program-address>
```

Or install it globally:

```bash
npm install -g sol-idl-peek
```

## Usage

```bash
sol-idl-peek <program-address> [options]
```

| Option | Description |
| --- | --- |
| `--instruction <name>` | Show one instruction in full: discriminator, docs, args and accounts. Matching ignores case, `_` and `-`, so `collectFees` finds `collect_fees` |
| `--errors` | List every error code and message |
| `--types` | List every struct and enum (account structs of older IDLs included) |
| `--rpc <url>` | RPC endpoint (or set `SOL_IDL_PEEK_RPC`) |
| `--json` | Print the full IDL as JSON, or just the part you picked with `--instruction`, `--errors` or `--types` |
| `-h`, `--help` | Show help |
| `-v`, `--version` | Show the version |

Use only one of `--instruction`, `--errors` and `--types` at a time.

## RPC endpoint

The endpoint is picked in this order: `--rpc`, then the `SOL_IDL_PEEK_RPC` environment variable, then the public mainnet endpoint. The public endpoint is rate limited, so use your own RPC for anything serious.

```bash
export SOL_IDL_PEEK_RPC="https://your-rpc.example.com/?api-key=..."
```

```powershell
$env:SOL_IDL_PEEK_RPC = "https://your-rpc.example.com/?api-key=..."
```

Errors only ever print the RPC hostname, so API keys in the URL are not leaked. Requests that get an HTTP 429 are retried with backoff.

## Example output

Real output for the Marinade program, shortened. Events, error and type counts follow when the IDL has them.

```
Program:    MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD
Name:       marinade_finance 0.1.0
IDL:        9jWC3EixD3D7ChMrrSRw3opnGHQ8YxZGJqGkzcup3tAn
Authority:  42VJbDihcS81YJPbuhHnHgvo1ehu42j8VK9sNwrnAarR

Instructions (29)
  initialize(data: InitializeData)
  changeAuthority(data: ChangeAuthorityData)
  addValidator(score: u32)
  removeValidator(index: u32, validatorVote: pubkey)
  ...

Accounts (2)
  TicketAccountData
  State
```

### One instruction

```bash
sol-idl-peek MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD --instruction add_validator
```

```
Instruction:    addValidator

Args (1)
  score: u32

Accounts (9)
  1  state             writable
  2  managerAuthority  signer
  3  validatorList     writable
  4  validatorVote
  5  duplicationFlag   writable
  6  rentPayer         writable, signer
  7  clock
  8  rent
  9  systemProgram
```

IDLs in the new format also show the instruction's discriminator, its docs, and for each account whether it is a PDA, optional, or has a fixed address. Nested account groups are shown as `group.account`.

### Errors

```bash
sol-idl-peek whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc --errors
```

```
Errors (70)
  6000  InvalidEnum                     Enum value could not be converted
  6001  InvalidStartTick                Invalid start tick index provided.
  6002  TickArrayExistInPool            Tick-array already exists in this whirlpool
  6003  TickArrayIndexOutofBounds       Attempt to search for a tick-array failed
  ...
```

## JSON output

`--json` prints the IDL exactly as the program published it, so you can pipe it to `jq`:

```bash
sol-idl-peek <program-address> --json | jq '.instructions[].name'
```

With `--instruction <name>`, `--errors` or `--types`, only that part is printed (one instruction object, the errors array, or the types array).

## How it works

Anchor stores a program's IDL in an account whose address is derived from the program address: a program derived address with no seeds, then `createWithSeed` with the seed `anchor:idl`. The account holds an 8 byte discriminator, the 32 byte authority allowed to update the IDL, a length, and the IDL as zlib-compressed JSON.

sol-idl-peek derives that address with Node's built-in crypto, fetches the account with `getAccountInfo`, checks that it is owned by the program, and inflates the JSON. Both Anchor discriminators are accepted (`internal:IdlAccount` for 0.30+, `account:IdlAccount` before that).

## Good to know

- Only programs whose authors uploaded an IDL on chain have one. Many programs did not, and programs that are not built with Anchor usually cannot. For those the tool exits with `No Anchor IDL found on-chain`
- IDLs published some other way, for example through the Program Metadata program, are not read
- The IDL is whatever the authority uploaded. It is not checked against the deployed program, so it can be outdated or wrong. Treat it as documentation, not proof

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `1` | RPC or runtime error, no IDL on chain, unreadable IDL, or unknown instruction name |
| `2` | Usage error (bad arguments) |

## Development

```bash
npm test
```

No dependencies to install. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT