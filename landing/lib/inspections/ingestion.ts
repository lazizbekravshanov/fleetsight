import { prisma } from "@/lib/prisma";
import { socrataFetch } from "@/lib/socrata";
import { categorizeViolation } from "@/lib/inspections/violation-codes";

// Socrata violation dataset
const VIOLATION_RESOURCE = "svh4-vk4w";

export type SocrataViolation = {
  inspection_id?: string;
  dot_number?: string;
  insp_date?: string;
  insp_level_id?: string;
  report_state?: string;
  location_desc?: string;
  insp_facility?: string;
  basic?: string;
  viol_code?: string;
  viol_description?: string;
  oos?: string;
  severity_weight?: string;
  unit_vin?: string;
  cdl_no?: string;
  cdl_st?: string;
  time_weight?: string;
};

// Normalize VIN: uppercase, strip non-alphanumeric, 17 chars
function cleanVin(raw?: string): string | null {
  if (!raw) return null;
  const clean = raw.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  return clean.length === 17 ? clean : null;
}

// Build CDL key: STATE:NUMBER normalized
function buildCdlKey(cdlNo?: string, cdlSt?: string): string | null {
  if (!cdlNo || !cdlSt) return null;
  const num = cdlNo.trim().toUpperCase();
  const st = cdlSt.trim().toUpperCase();
  if (!num || !st) return null;
  return `${st}:${num}`;
}

// Normalize violation code from Socrata format to standard format
// Socrata uses formats like "396.3A1" -> "396.3(a)(1)"
function normalizeViolCode(raw?: string): string | null {
  if (!raw) return null;
  return raw.trim();
}

export async function fetchViolationsByDot(
  dotNumber: number,
  limit = 500
): Promise<SocrataViolation[]> {
  return socrataFetch<SocrataViolation>(VIOLATION_RESOURCE, {
    $where: `dot_number='${dotNumber}'`,
    $order: "insp_date DESC",
    $limit: String(limit),
  });
}

/**
 * Fetch violation records from Socrata for a carrier and upsert them
 * into the InspectionViolation table. Uses the @@unique([inspectionId, violationCode])
 * constraint for deduplication.
 */
export async function ingestViolationsForCarrier(
  dotNumber: number
): Promise<{ ingested: number; skipped: number }> {
  const violations = await fetchViolationsByDot(dotNumber);
  const result = await ingestViolationsFromJson(violations);
  return { ingested: result.ingested, skipped: result.skipped };
}

/**
 * Ingest pre-fetched violation records (e.g. from bulk CSV import) into
 * InspectionViolation. Processes in batches of 100 and uses createMany
 * with skipDuplicates for SQLite compatibility.
 */
export async function ingestViolationsFromJson(
  violations: SocrataViolation[]
): Promise<{ ingested: number; skipped: number; errors: string[] }> {
  let ingested = 0;
  let skipped = 0;
  const errors: string[] = [];

  const BATCH_SIZE = 100;

  for (let i = 0; i < violations.length; i += BATCH_SIZE) {
    const batch = violations.slice(i, i + BATCH_SIZE);
    const records: {
      inspectionId: string;
      dotNumber: number;
      vinClean: string | null;
      cdlKey: string | null;
      inspectionDate: Date;
      inspectionLevel: number | null;
      inspectionState: string | null;
      inspectionFacility: string | null;
      violationCode: string;
      violationGroup: string | null;
      violationDescription: string | null;
      oosViolation: boolean;
      violationSeverity: string | null;
      source: string;
    }[] = [];

    for (const v of batch) {
      try {
        const inspectionId = v.inspection_id?.trim();
        const violationCode = normalizeViolCode(v.viol_code);

        if (!inspectionId || !violationCode) {
          skipped++;
          continue;
        }

        const dotNum = v.dot_number ? parseInt(v.dot_number, 10) : null;
        if (!dotNum || isNaN(dotNum)) {
          skipped++;
          continue;
        }

        const inspDate = v.insp_date ? new Date(v.insp_date) : null;
        if (!inspDate || isNaN(inspDate.getTime())) {
          skipped++;
          continue;
        }

        const inspLevel = v.insp_level_id
          ? parseInt(v.insp_level_id, 10)
          : null;

        const violationGroup = categorizeViolation(violationCode);

        records.push({
          inspectionId,
          dotNumber: dotNum,
          vinClean: cleanVin(v.unit_vin),
          cdlKey: buildCdlKey(v.cdl_no, v.cdl_st),
          inspectionDate: inspDate,
          inspectionLevel:
            inspLevel !== null && !isNaN(inspLevel) ? inspLevel : null,
          inspectionState: v.report_state?.trim() || null,
          inspectionFacility:
            v.insp_facility?.trim() || v.location_desc?.trim() || null,
          violationCode,
          violationGroup: violationGroup || v.basic?.trim() || null,
          violationDescription: v.viol_description?.trim() || null,
          oosViolation: v.oos?.toUpperCase() === "Y",
          violationSeverity: v.severity_weight?.trim() || null,
          source: "MCMIS",
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Unknown parsing error";
        errors.push(
          `Row inspection_id=${v.inspection_id} viol_code=${v.viol_code}: ${msg}`
        );
        skipped++;
      }
    }

    if (records.length === 0) continue;

    try {
      // Process individually to handle unique constraint violations gracefully
      for (const record of records) {
        try {
          await prisma.inspectionViolation.upsert({
            where: {
              inspectionId_violationCode: {
                inspectionId: record.inspectionId,
                violationCode: record.violationCode,
              },
            },
            create: record,
            update: {},
          });
          ingested++;
        } catch {
          skipped++;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown DB error";
      errors.push(`Batch starting at index ${i}: ${msg}`);
      skipped += records.length;
    }
  }

  return { ingested, skipped, errors };
}
