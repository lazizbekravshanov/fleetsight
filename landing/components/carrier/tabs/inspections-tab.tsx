import type { SocrataInspection } from "@/lib/socrata";
import { decodeInspectionLevel } from "@/lib/fmcsa-codes";
import { Stat } from "../shared";

export function InspectionsTab({
  inspections,
}: {
  inspections: SocrataInspection[];
}) {
  if (inspections.length === 0) {
    return (
      <p className="py-12 text-center text-base text-slate-500 tracking-wide">
        No inspection records found.
      </p>
    );
  }

  const totalViols = inspections.reduce(
    (s, i) => s + (parseInt(i.viol_total ?? "0", 10) || 0),
    0
  );
  const totalOos = inspections.reduce(
    (s, i) => s + (parseInt(i.oos_total ?? "0", 10) || 0),
    0
  );

  return (
    <div>
      {/* Summary stats */}
      <div className="mb-4 flex flex-wrap gap-4">
        <Stat label="Total Inspections" value={inspections.length} />
        <Stat label="Total Violations" value={totalViols} />
        <Stat label="Out of Service" value={totalOos} />
        <Stat
          label="OOS Rate"
          value={
            inspections.length > 0
              ? `${((totalOos / inspections.length) * 100).toFixed(1)}%`
              : "N/A"
          }
        />
      </div>

      {/* Table */}
      <div className="max-h-[32rem] overflow-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="sticky top-0 bg-slate-900">
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="px-3 py-2">Date</th>
              <th className="hidden px-3 py-2 sm:table-cell">Report #</th>
              <th className="px-3 py-2">State</th>
              <th className="px-3 py-2">Level</th>
              <th className="px-3 py-2 text-right">Violations</th>
              <th className="px-3 py-2 text-right">OOS</th>
              <th className="hidden px-3 py-2 text-center md:table-cell">
                Post-Acc
              </th>
              <th className="hidden px-3 py-2 text-right lg:table-cell">
                Weight (lbs)
              </th>
              <th className="hidden px-3 py-2 sm:table-cell">Location</th>
            </tr>
          </thead>
          <tbody>
            {inspections.map((insp, i) => (
              <tr
                key={insp.inspection_id ?? i}
                className="border-b border-slate-800/50 transition hover:bg-slate-800/30 even:bg-slate-900/30"
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  {insp.insp_date
                    ? new Date(insp.insp_date).toLocaleDateString()
                    : "\u2014"}
                </td>
                <td className="hidden px-3 py-2 sm:table-cell text-slate-500">
                  {insp.report_number ?? "\u2014"}
                </td>
                <td className="px-3 py-2">{insp.report_state ?? "\u2014"}</td>
                <td className="px-3 py-2">
                  {decodeInspectionLevel(insp.insp_level_id)}
                </td>
                <td className="px-3 py-2 text-right">
                  {insp.viol_total ?? "0"}
                </td>
                <td className="px-3 py-2 text-right">
                  {parseInt(insp.oos_total ?? "0", 10) > 0 ? (
                    <span className="text-rose-400">{insp.oos_total}</span>
                  ) : (
                    "0"
                  )}
                </td>
                <td className="hidden px-3 py-2 text-center md:table-cell">
                  {insp.post_acc_ind === "Y" ? (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">
                      Yes
                    </span>
                  ) : (
                    <span className="text-slate-600">{"\u2014"}</span>
                  )}
                </td>
                <td className="hidden px-3 py-2 text-right lg:table-cell text-slate-500">
                  {insp.gross_comb_veh_wt
                    ? parseInt(insp.gross_comb_veh_wt, 10).toLocaleString()
                    : "\u2014"}
                </td>
                <td
                  className="hidden px-3 py-2 sm:table-cell text-slate-500"
                  title={insp.insp_facility ?? undefined}
                >
                  {insp.location_desc ?? "\u2014"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
