# rugshield 🛡️

**Scan before you ape.** Paste any token contract, get a plain-English risk report —
honeypots, mint traps, hidden owners — before your money finds out.

Built for the Colosseum Crypto World's Fair hackathon (Base track).

## How it works

1. Connect a wallet (Base only).
2. Paste a token contract address, pick a chain.
3. Click **Deep scan** — your wallet signs a $0.005 USDC payment via **x402 v2**
   (EIP-3009 `transferWithAuthorization`, no on-chain tx from you until the
   facilitator settles).
4. Get a 0–100 score, A–F grade, itemized reasons, market + contract security breakdown.

No account. No API key. No subscription. Machines pay machines.

## The risk engine

Scoring is powered by [token-risk-api](https://github.com/prayingperceptions/token-risk-api)
(MIT) — Dexscreener market signals (liquidity, volume, age) + GoPlus contract
security (honeypot, mintable, hidden owner, taxes). That repo is pre-existing
open-source work and is disclosed as the platform this app was built on; all
code in *this* repo was written during the hackathon window.

## Stack

- Next.js 16 + Tailwind (app router)
- wagmi + viem for wallet + EIP-712 signing
- Hand-rolled x402 v2 "exact" scheme client (`src/lib/x402.ts`) — zero x402 SDK deps
- Farcaster miniapp manifest at `.well-known/farcaster.json`

## Run it

```bash
npm install
npm run dev
```

## Deploy

```bash
vercel
```

## Why this exists

Scams are a multi-billion-dollar tax on crypto newcomers — and AI trading agents,
which can't "do your own research," are about to become the biggest victims of all.
rugshield is the consumer wedge: the same $0.005 API call that protects a human
apeing into a memecoin protects an agent executing a thousand swaps. The trust
layer for the agent economy, starting with the people getting rugged today.

## License

MIT
