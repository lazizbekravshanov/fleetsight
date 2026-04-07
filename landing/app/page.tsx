import type { Metadata } from "next";
import { Suspense } from "react";
import { CarrierLookup } from "@/components/carrier";

export const metadata: Metadata = {
  title: "FleetSight | FMCSA Carrier Intelligence Search",
  description:
    "Search 4.4M FMCSA-registered carriers. Deep safety, inspection, crash, insurance, and chameleon-detection intelligence on every carrier — free, no signup.",
};

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <Suspense>
      <CarrierLookup />
    </Suspense>
  );
}
