import type { SocrataCrash } from "@/lib/socrata";
import { decodeVehicleConfig } from "@/lib/fmcsa-codes";
import { Stat } from "../shared";

export function CrashesTab({ crashes }: { crashes: SocrataCrash[] }) {
  if (crashes.length === 0) {
    return (
      <p className="py-12 text-center text-base text-slate-500 tracking-wide">
        No crash records found.
      </p>
    );
  }

  const totalFatalities = crashes.reduce(
    (s, c) => s + (parseInt(c.fatalities ?? "0", 10) || 0),
    0
  );
  const totalInjuries = crashes.reduce(
    (s, c) => s + (parseInt(c.injuries ?? "0", 10) || 0),
    0
  );
  const totalTowAway = crashes.reduce(
    (s, c) => s + (parseInt(c.tow_away ?? "0", 10) || 0),
    0
  );

  return (
    <div>
      {/* Summary stats */}
      <div className="mb-4 flex flex-wrap gap-4">
        <Stat label="Total Crashes" value={crashes.length} />
        <Stat label="Fatalities" value={totalFatalities} warn />
        <Stat
          label="Injuries"
          value={totalInjuries}
          warn={totalInjuries > 0}
        />
        <Stat label="Tow-Aways" value={totalTowAway} />
      </div>

      {/* Table */}
      <div className="max-h-[32rem] overflow-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="sticky top-0 bg-slate-900">
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="px-3 py-2">Date</th>
              <th className="hidden px-3 py-2 sm:table-cell">Report #</th>
              <th className="px-3 py-2">State</th>
              <th className="hidden px-3 py-2 sm:table-cell">City</th>
              <th className="hidden px-3 py-2 md:table-cell">Vehicle</th>
              <th className="px-3 py-2 text-right">Fatal</th>
              <th className="px-3 py-2 text-right">Injuries</th>
              <th className="px-3 py-2 text-right">Tow</th>
              <th className="hidden px-3 py-2 text-center lg:table-cell">
                Fed Rec.
              </th>
            </tr>
          </thead>
          <tbody>
            {crashes.map((cr, i) => (
              <tr
                key={cr.crash_id ?? i}
                className="border-b border-slate-800/50 transition hover:bg-slate-800/30 even:bg-slate-900/30"
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  {cr.report_date
                    ? new Date(cr.report_date).toLocaleDateString()
                    : "\u2014"}
                  {cr.report_time && (
                    <span className="ml-1 text-slate-600">
                      {cr.report_time}
                    </span>
                  )}
                </td>
                <td className="hidden px-3 py-2 sm:table-cell text-slate-500">
                  {cr.report_number ?? "\u2014"}
                </td>
                <td className="px-3 py-2">{cr.report_state ?? "\u2014"}</td>
                <td className="hidden px-3 py-2 sm:table-cell">
                  {cr.city ?? "\u2014"}
                </td>
                <td
                  className="hidden px-3 py-2 md:table-cell text-slate-400"
                  title={
                    cr.vehicle_configuration_id
                      ? decodeVehicleConfig(cr.vehicle_configuration_id)
                      : undefined
                  }
                >
                  {cr.truck_bus_ind === "TRUCK"
                    ? "Truck"
                    : cr.truck_bus_ind === "BUS"
                      ? "Bus"
                      : cr.truck_bus_ind ?? "\u2014"}
                  {cr.vehicle_configuration_id && (
                    <span className="ml-1 text-slate-600">
                      ({decodeVehicleConfig(cr.vehicle_configuration_id)})
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {parseInt(cr.fatalities ?? "0", 10) > 0 ? (
                    <span className="text-rose-400">{cr.fatalities}</span>
                  ) : (
                    "0"
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {parseInt(cr.injuries ?? "0", 10) > 0 ? (
                    <span className="text-amber-400">{cr.injuries}</span>
                  ) : (
                    "0"
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {cr.tow_away ?? "0"}
                </td>
                <td className="hidden px-3 py-2 text-center lg:table-cell">
                  {cr.federal_recordable === "Y" ? (
                    <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-300">
                      Yes
                    </span>
                  ) : cr.federal_recordable === "N" ? (
                    <span className="text-slate-600">No</span>
                  ) : (
                    <span className="text-slate-600">{"\u2014"}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
