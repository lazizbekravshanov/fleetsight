import { Suspense } from "react";
import { TeamsManager } from "@/components/teams/teams-manager";

export const metadata = {
  title: "FleetSight | Teams",
  description: "Manage your team workspaces and shared carrier intelligence.",
};

export default function TeamsPage() {
  return (
    <Suspense>
      <TeamsManager />
    </Suspense>
  );
}
