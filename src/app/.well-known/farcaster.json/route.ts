import { NextResponse } from "next/server";

const APP_URL = "https://rugshield.vercel.app";

export async function GET() {
  return NextResponse.json({
    accountAssociation: {
      // TODO: replace with a real signed association from the Farcaster client
      header: "",
      payload: "",
      signature: "",
    },
    miniapp: {
      version: "1",
      name: "rugshield",
      iconUrl: `${APP_URL}/icon.png`,
      homeUrl: APP_URL,
      imageUrl: `${APP_URL}/og.png`,
      buttonTitle: "Scan a token",
      splashImageUrl: `${APP_URL}/splash.png`,
      splashBackgroundColor: "#09090b",
      webhookUrl: `${APP_URL}/api/webhook`,
      description:
        "Scan any token contract for honeypots, mint traps, and hidden owners. $0.005 USDC per deep scan on Base via x402.",
      primaryCategory: "finance",
      tags: ["defi", "security", "base", "risk"],
    },
  });
}
