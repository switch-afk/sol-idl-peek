# Contributing

Thanks for helping out. This is a small tool, so the rules are short.

## Setup

Node 18 or newer. There are no dependencies to install.

```bash
git clone https://github.com/switch-afk/sol-idl-peek.git
cd sol-idl-peek
npm test
```

## Ground rules

- Keep it zero-dependency
- Keep it read-only: no signing, no private keys, no wallet files
- Errors must never print the full RPC URL, only the hostname (URLs often hold API keys)
- Tests use the mock RPC in `tests/helpers/mock-rpc.js` and the IDL fixtures in `tests/helpers/fixtures.js`. Do not hit a real RPC from tests
- Support both IDL formats: old (Anchor 0.29 and older) and new (0.30+). New fixtures should cover both

## Pull requests

1. Branch off `main`
2. Add or update tests for what you change
3. Run `npm test`
4. Open a PR. CI runs on Node 18, 20 and 22

## Reporting bugs

Open an issue with the command you ran, what you expected, and what happened. Remove any API keys from URLs first. If an IDL is displayed wrongly, include the program address.