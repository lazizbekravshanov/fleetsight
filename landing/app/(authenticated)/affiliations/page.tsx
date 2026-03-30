import { AffiliationsExplorer } from "@/components/affiliations/affiliations-explorer";

export default function AffiliationsPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
          Carriers linked by shared vehicle VINs — a signal for common ownership, chameleon activity, or equipment sharing.
        </p>
      </div>
      <AffiliationsExplorer />
    </div>
  );
}
