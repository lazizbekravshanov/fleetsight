import { CarrierCompare } from "@/components/compare/carrier-compare";

export const metadata = {
  title: "Compare Carriers | FleetSight",
  description: "Side-by-side comparison of up to 4 carriers by USDOT number.",
};

export default function ComparePage() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
          Compare safety, operations, and risk across multiple carriers
        </p>
      </div>
      <CarrierCompare />
    </div>
  );
}
