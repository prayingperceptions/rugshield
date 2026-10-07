# rugshield 🛡️

**Scan before you ape.** Paste any token contract, get a plain-English risk report —
honeypots, mint traps, hidden owners — before your money finds out.

Built for the Colosseum Crypto World's Fair hackathon (Base track).

Live: https://rugshield-xi.vercel.app

![landing](screenshots/01-landing.jpg)

## How it works

1. Connect a wallet (auto-switches to Base).
2. Paste a token contract address.
3. Click **Deep scan** — your wallet sends a **$0.005 USDC** transfer on Base.
   The API verifies the Transfer event on-chain before scanning. No account,
   no API key, no subscription, no middlemen.
4. Get a 0–100 score, A–F grade, itemized reasons, market + contract security breakdown.

![payment](screenshots/02-payment.jpg)

## Real scans

**openhuman — C (moderate risk):** contract clean, but the pair is hours old with thin volume.

![openhuman report](screenshots/03-report-openhuman.jpg)

**tacocat — D (high risk):** $82K volume against $9K liquidity on a day-old pair.

![tacocat report](screenshots/04-report-tacocat.jpg)

## The risk engine

Scoring is powered by [token-risk-api](https://github.com/prayingperceptions/token-risk-api)
(MIT) — Dexscreener market signals (liquidity, volume, age) + GoPlus contract
security (honeypot, mintable, hidden owner, taxes). That repo is pre-existing
open-source work and is disclosed as the platform this app was built on; all
code in *this* repo was written during the hackathon window.

## Stack

- Next.js 16 + Tailwind (app router)
- wagmi + viem for wallet + direct USDC transfers on Base
- On-chain payment verification in [token-risk-api](https://github.com/prayingperceptions/token-risk-api) (`?txHash=` checked against Base RPC — no facilitator)
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
