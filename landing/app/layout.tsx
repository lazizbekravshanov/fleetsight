import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const fontSans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap"
});

export const metadata: Metadata = {
  title: "FleetSight | AI Verification Platform for U.S. Transportation",
  description:
    "AI-powered carrier verification and risk intelligence across USDOT, FMCSA, authority status, crash trends, and affiliation risk.",
  metadataBase: new URL("https://fleetsight.local"),
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
    <html lang="en" className="scroll-smooth">
      <body className={`${fontSans.variable} ${fontMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}

