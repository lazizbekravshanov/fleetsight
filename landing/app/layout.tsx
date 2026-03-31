import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#f5f3ee",
};

export const metadata: Metadata = {
  title: "FleetSight | AI Verification Platform for U.S. Transportation",
  description:
    "AI-powered carrier verification and risk intelligence across USDOT, FMCSA, authority status, crash trends, and affiliation risk.",
  metadataBase: new URL("https://fleetsight.local"),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FleetSight",
  },
  openGraph: {
    title: "FleetSight",
    description:
      "AI verification and risk intelligence for freight brokers, carriers, insurance providers, and safety teams.",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "FleetSight",
    description:
      "Verify carriers instantly using AI-powered USDOT and FMCSA intelligence."
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body className={`${inter.className} ${sourceSerif.variable} bg-[#f5f3ee] text-[#1a1917] antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
