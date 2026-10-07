"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSendTransaction, useSwitchChain } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { wagmiConfig } from "@/lib/wagmi";
import { base } from "wagmi/chains";
import { encodeFunctionData, parseAbi } from "viem";
import {
  API_BASE,
  USDC_BASE,
  parseChallenge,
  formatUsdc,
  type RiskReport,
} from "@/lib/x402";

type Phase =
  | { kind: "idle" }
  | { kind: "paying"; hash?: `0x${string}` }
  | { kind: "scanning" }
  | { kind: "report"; report: RiskReport }
  | { kind: "error"; message: string };

const USDC_TRANSFER_ABI = parseAbi(["function transfer(address to, uint256 amount) returns (bool)"]);

const GRADE_COLORS: Record<string, string> = {
  A: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  B: "text-lime-300 border-lime-500/40 bg-lime-500/10",
  C: "text-yellow-300 border-yellow-500/40 bg-yellow-500/10",
  D: "text-orange-400 border-orange-500/40 bg-orange-500/10",
  F: "text-red-400 border-red-500/40 bg-red-500/10",
};

function isAddress(v: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(v.trim());
}

export default function Home() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { sendTransactionAsync } = useSendTransaction();
  const { switchChain } = useSwitchChain();
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  // Base-native. The API's risk engine is multi-chain capable, but every scan
  // here is priced, paid, and verified on Base.

  // Auto-switch to Base on connect — scans settle on Base, nothing else.
  useEffect(() => {
    if (isConnected && chainId !== base.id) {
      switchChain({ chainId: base.id });
    }
  }, [isConnected, chainId, switchChain]);

  async function scan() {
    const token = input.trim();
    if (!isAddress(token)) {
      setPhase({ kind: "error", message: "Enter a valid 0x contract address." });
      return;
    }
    if (!isConnected || !address) {
      setPhase({ kind: "error", message: "Connect your wallet first — the $0.005 scan is paid on Base." });
      return;
    }
    if (chainId !== base.id) {
      try {
        switchChain({ chainId: base.id });
      } catch {
        // wallet will prompt; user can retry scan after switching
      }
      setPhase({ kind: "error", message: "Switching to Base — hit scan again once your wallet confirms." });
      return;
    }
    try {
      const url = `${API_BASE}/v1/risk?token=${token}&chain=base`;
      const first = await fetch(url);
      if (first.ok) {
        setPhase({ kind: "report", report: (await first.json()) as RiskReport });
        return;
      }
      if (first.status !== 402) {
        const body = await first.text();
        throw new Error(`API error ${first.status}: ${body.slice(0, 160)}`);
      }
      // 402: pay $0.005 USDC directly to the pay-to address on Base.
      // The API verifies the Transfer event on-chain — no facilitator, no signature scheme.
      const challenge = parseChallenge(await first.json());
      setPhase({ kind: "paying" });

      const hash = await sendTransactionAsync({
        to: USDC_BASE as `0x${string}`,
        data: encodeFunctionData({
          abi: USDC_TRANSFER_ABI,
          functionName: "transfer",
          args: [challenge.payTo as `0x${string}`, BigInt(challenge.amount)],
        }),
        chainId: base.id,
      });
      setPhase({ kind: "paying", hash });

      // wait for the transfer to confirm, then redeem it for the report
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash, chainId: base.id });
      if (receipt.status !== "success") {
        throw new Error("USDC transfer failed on-chain. No scan charged.");
      }

      setPhase({ kind: "scanning" });
      const paid = await fetch(
        `${url}&txHash=${hash}`
      );
      if (!paid.ok) {
        const body = await paid.text();
        throw new Error(`Payment not verified (${paid.status}): ${body.slice(0, 200)}`);
      }
      setPhase({ kind: "report", report: (await paid.json()) as RiskReport });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/rejected|denied|user/i.test(msg)) {
        setPhase({ kind: "error", message: "Transaction rejected in wallet. No payment was made." });
      } else {
        setPhase({ kind: "error", message: msg });
      }
    }
  }

  const report = phase.kind === "report" ? phase.report : null;
  const gradeClass = report ? GRADE_COLORS[report.risk.grade] ?? GRADE_COLORS.C : "";
  const tokenAddr = report?.token.address ?? "";
  const verdictText =
    report == null
      ? ""
      : report.risk.grade === "A"
        ? "looks clean"
        : report.risk.grade === "B"
          ? "low risk"
          : report.risk.grade === "C"
            ? "moderate risk"
            : report.risk.grade === "D"
              ? "high risk"
              : "likely unsafe";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-5 py-10">
        {/* header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛡️</span>
            <span className="font-bold text-lg tracking-tight">rugshield</span>
          </div>
          {isConnected ? (
            <button
              onClick={() => disconnect()}
              className="text-xs font-mono bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1.5 hover:border-zinc-600"
            >
              {address?.slice(0, 6)}…{address?.slice(-4)}
            </button>
          ) : (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              disabled={connecting}
              className="text-sm font-semibold bg-blue-600 hover:bg-blue-500 rounded-full px-4 py-2 disabled:opacity-50"
            >
              {connecting ? "Connecting…" : "Connect wallet"}
            </button>
          )}
        </header>

        {/* hero */}
        <section className="mt-14 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight">
            Scan before you ape.
          </h1>
          <p className="mt-3 text-zinc-400 max-w-md mx-auto">
            Paste any token contract. Get a plain-English risk report —
            honeypots, mint traps, hidden owners — before your money finds out.
          </p>
        </section>

        {/* scanner */}
        <section className="mt-8 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="0x… token contract address on Base"
              spellCheck={false}
              className="flex-1 min-w-0 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 font-mono text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-600"
            />
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-semibold text-zinc-300 flex items-center">
              Base
            </div>
          </div>
          <button
            onClick={scan}
            disabled={phase.kind === "paying" || phase.kind === "scanning"}
            className="mt-3 w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-bold rounded-xl py-3"
          >
            {phase.kind === "paying"
              ? phase.hash
                ? "Payment sent — waiting for Base confirmation…"
                : "Confirm the $0.005 USDC payment in your wallet…"
              : phase.kind === "scanning"
                ? "Payment verified — scanning…"
                : "Deep scan — $0.005 USDC"}
          </button>
          <p className="mt-2 text-center text-xs text-zinc-500">
            One wallet confirmation sends $0.005 USDC on Base. No account. No subscription.
            The API verifies your payment on-chain before scanning.
          </p>
        </section>

        {/* status */}
        {phase.kind === "error" && (
          <div className="mt-5 border border-red-500/40 bg-red-500/10 text-red-300 rounded-xl px-4 py-3 text-sm">
            {phase.message}
          </div>
        )}

        {/* report */}
        {report && (
          <section className="mt-6 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className={`px-5 py-4 border-b ${gradeClass} border`}>
              <div className="flex items-center gap-4">
                <span className="text-5xl font-black">{report.risk.grade}</span>
                <div>
                  <div className="font-bold capitalize">{verdictText}</div>
                  <div className="text-sm opacity-80 font-mono">
                    {report.token.name ?? report.token.symbol ?? `${tokenAddr.slice(0, 10)}…${tokenAddr.slice(-8)}`}
                  </div>
                  <div className="text-xs opacity-60 font-mono">
                    {tokenAddr.slice(0, 10)}…{tokenAddr.slice(-8)}
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-3xl font-extrabold">{report.risk.score}</div>
                  <div className="text-xs opacity-70">/ 100</div>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-black/30 overflow-hidden">
                <div
                  className="h-full rounded-full bg-current"
                  style={{ width: `${report.risk.score}%` }}
                />
              </div>
            </div>

            <div className="px-5 py-4">
              <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                Why this grade
              </h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {report.risk.reasons.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-zinc-500">▸</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>

              {(report.market || report.contractSecurity) && (
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  {report.market && (
                    <div className="bg-zinc-900/60 rounded-xl p-3">
                      <div className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">
                        Market
                      </div>
                      {report.market.liquidityUsd != null && (
                        <div>Liquidity ${report.market.liquidityUsd.toLocaleString()}</div>
                      )}
                      {report.market.volume24h != null && (
                        <div>Vol 24h ${report.market.volume24h.toLocaleString()}</div>
                      )}
                      {report.market.chainId && <div className="capitalize">{report.market.chainId}</div>}
                    </div>
                  )}
                  {report.contractSecurity && (
                    <div className="bg-zinc-900/60 rounded-xl p-3">
                      <div className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">
                        Contract
                      </div>
                      <div>Honeypot: {report.contractSecurity.isHoneypot ? "⚠️ yes" : "no"}</div>
                      <div>Mintable: {report.contractSecurity.isMintable ? "⚠️ yes" : "no"}</div>
                      <div>Hidden owner: {report.contractSecurity.hiddenOwner ? "⚠️ yes" : "no"}</div>
                    </div>
                  )}
                </div>
              )}

              {report.payment?.txHash && (
                <a
                  href={`https://basescan.org/tx/${report.payment.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block text-xs font-mono text-blue-400 hover:underline"
                >
                  Payment settled on Base ↗
                </a>
              )}
            </div>
          </section>
        )}

        {/* footer */}
        <footer className="mt-12 text-center text-xs text-zinc-600 space-y-1">
          <p>
            Every scan pays $0.005 USDC on Base — verified on-chain, no accounts, no middlemen.
          </p>
          <p>
            Built for Colosseum Crypto World&apos;s Fair · Base track ·{" "}
            <a
              href="https://github.com/prayingperceptions/token-risk-api"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              risk engine (MIT)
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
