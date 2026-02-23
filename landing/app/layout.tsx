import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={`${inter.className} bg-white text-gray-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}
