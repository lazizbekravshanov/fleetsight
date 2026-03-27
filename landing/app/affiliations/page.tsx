import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/auth";
import { AffiliationsExplorer } from "@/components/affiliations/affiliations-explorer";

export default async function AffiliationsPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
            FleetSight
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900">
            Carrier Affiliation Network
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Carriers linked by shared vehicle VINs — a signal for common ownership, chameleon activity, or equipment sharing.
          </p>
        </header>
        <AffiliationsExplorer />
      </div>
    </main>
  );
}
