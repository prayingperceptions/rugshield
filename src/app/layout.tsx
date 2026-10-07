import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = "https://rugshield.vercel.app";

export const metadata: Metadata = {
  title: "rugshield — scan before you ape",
  description:
    "Paste any token contract. Get a plain-English risk report — honeypots, mint traps, hidden owners. $0.005 USDC per deep scan on Base via x402.",
  openGraph: {
    title: "rugshield — scan before you ape",
    description: "Token risk reports for humans and agents. $0.005/scan on Base.",
    type: "website",
    url: APP_URL,
  },
  other: {
    "fc:miniapp": JSON.stringify({
      version: "1",
      imageUrl: `${APP_URL}/og.png`,
      button: { title: "Scan a token", action: { type: "launch_miniapp", url: APP_URL } },
    }),
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
