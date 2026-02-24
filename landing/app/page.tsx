import type { Metadata } from "next";
import { Suspense } from "react";
import { CarrierLookup } from "@/components/carrier";

export const metadata: Metadata = {
  title: "FleetSight | FMCSA Carrier Lookup",
  description:
    "Search 4.4M FMCSA-registered carriers. View inspection history, crash records, and SAFER-like statistics — all from public datasets.",
};

export default function HomePage() {
  return (
    <Suspense>
      <CarrierLookup />
    </Suspense>
  );
}
