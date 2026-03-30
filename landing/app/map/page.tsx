import { FleetMap } from "@/components/map/fleet-map";

export const metadata = {
  title: "Fleet Map | FleetSight",
  description: "Live map view of carrier locations and crash data across the US.",
};

export default function MapPage() {
  return (
    <div className="h-screen w-full">
      <FleetMap />
    </div>
  );
}
