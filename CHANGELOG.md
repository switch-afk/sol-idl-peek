# Changelog

## [0.1.0] - 2026-10-15

First release.

### Added
- Fetch and decode the on-chain Anchor IDL of any program address
- Readable summary: program, name and version, IDL account and authority, instruction signatures with typed args, account and event names, error and type counts
- Works with both the old (Anchor 0.29 and older) and new (0.30+) IDL formats
- `--instruction <name>` detail view: discriminator, docs, args, accounts with signer, writable, optional, PDA and fixed-address flags, return type. Names match loosely (`collectFees` finds `collect_fees`) and unknown names get suggestions
- `--errors` and `--types` to list every error and every struct and enum
- `--json` prints the full IDL, or just the part picked with `--instruction`, `--errors` or `--types`
- IDL account address derived with Node's built-in crypto, checked against `@solana/web3.js`; the account must be owned by the program
- RPC client with 429 retry and backoff, `--rpc` and `SOL_IDL_PEEK_RPC`, hostname-only error messages