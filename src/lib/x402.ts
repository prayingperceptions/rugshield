// x402 v2 "exact" scheme client for EVM (EIP-3009 transferWithAuthorization).
// Flow: GET -> 402 {accepts[0]} -> EIP-712 sign -> retry with X-PAYMENT header.

export interface AcceptRequirement {
  scheme: string;
  network: string;
  amount: string; // atomic units, e.g. "5000" = 0.005 USDC
  asset: string; // token contract
  payTo: string;
  maxTimeoutSeconds: number;
}

export interface PaymentChallenge {
  x402Version: number;
  accepts: AcceptRequirement[];
}

export interface RiskReport {
  token: string;
  score: number;
  grade: string;
  verdict: string;
  reasons: string[];
  market?: { chain?: string; liquidityUsd?: number; ageDays?: number; volumeUsd?: number };
  security?: {
    honeypot?: boolean;
    hiddenOwner?: boolean;
    mintable?: boolean;
    buyTax?: number;
    sellTax?: number;
  };
  payment?: { txHash?: string | null; mode?: string };
}

export const API_BASE = "https://token-risk-api-topaz.vercel.app";
export const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const BASE_CHAIN_ID = 8453;

// USDC (Circle) EIP-712 domain on Base
export const USDC_DOMAIN = {
  name: "USD Coin",
  version: "2",
  chainId: BASE_CHAIN_ID,
  verifyingContract: USDC_BASE as `0x${string}`,
} as const;

export const TRANSFER_AUTH_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

export interface Authorization {
  from: `0x${string}`;
  to: `0x${string}`;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: `0x${string}`;
}

export function randomNonce(): `0x${string}` {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return ("0x" + [...b].map((x) => x.toString(16).padStart(2, "0")).join("")) as `0x${string}`;
}

export function buildAuthorization(
  from: `0x${string}`,
  req: AcceptRequirement,
): Authorization {
  const now = Math.floor(Date.now() / 1000);
  return {
    from,
    to: req.payTo as `0x${string}`,
    value: req.amount,
    validAfter: "0",
    validBefore: String(now + (req.maxTimeoutSeconds || 300)),
    nonce: randomNonce(),
  };
}

/** Base64-encode the x402 v2 payment payload for the X-PAYMENT header. */
export function buildPaymentHeader(
  req: AcceptRequirement,
  auth: Authorization,
  signature: `0x${string}`,
): string {
  const payload = {
    x402Version: 2,
    scheme: "exact",
    network: req.network,
    payload: { signature, authorization: auth },
  };
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin);
}

export function parseChallenge(res402: PaymentChallenge): AcceptRequirement {
  const acc = res402.accepts?.[0];
  if (!acc) throw new Error("No payment requirements in 402 response");
  if (acc.scheme !== "exact") throw new Error(`Unsupported x402 scheme: ${acc.scheme}`);
  return acc;
}

export function formatUsdc(atomic: string): string {
  return (Number(atomic) / 1e6).toFixed(3).replace(/\.?0+$/, "") || "0";
}
