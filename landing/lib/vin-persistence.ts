import { prisma } from "@/lib/prisma";
import { normalizeVin } from "@/lib/vin-utils";

type FleetUnit = {
  insp_unit_vehicle_id_number?: string;
  insp_unit_type_id?: string;
  insp_unit_make?: string;
  inspection_id?: string;
};

type DecodedVehicle = {
  vin: string;
  make: string;
  model: string;
  modelYear: string;
  bodyClass: string;
  vehicleType: string;
};

/**
 * Persist VINs from fleet unit data into Vehicle + CarrierVehicle tables.
 * Called as fire-and-forget when a carrier's fleet tab is viewed.
 * This builds the VIN database organically as users browse carriers.
 */
export async function persistFleetVins(
  dotNumber: number,
  units: FleetUnit[],
  decodedVehicles: DecodedVehicle[]
): Promise<number> {
  // Build decoded vehicle lookup
  const decodedMap = new Map<string, DecodedVehicle>();
  for (const dv of decodedVehicles) {
    if (dv.vin) decodedMap.set(dv.vin.toUpperCase(), dv);
  }

  let persisted = 0;

  // Collect unique VINs with their metadata
  const seen = new Set<string>();

  for (const unit of units) {
    const raw = unit.insp_unit_vehicle_id_number?.trim();
    if (!raw) continue;

    const vin = normalizeVin(raw);
    if (!vin || seen.has(vin)) continue;
    seen.add(vin);

    const decoded = decodedMap.get(vin);
    const unitType = mapUnitType(unit.insp_unit_type_id);

    try {
      // Upsert Vehicle with decoded info
      await prisma.vehicle.upsert({
        where: { vin },
        create: {
          vin,
          make: decoded?.make ?? unit.insp_unit_make ?? null,
          model: decoded?.model ?? null,
          modelYear: decoded?.modelYear ? parseInt(decoded.modelYear, 10) || null : null,
          bodyClass: decoded?.bodyClass ?? null,
          vehicleType: decoded?.vehicleType ?? unitType,
        },
        update: {
          make: decoded?.make ?? unit.insp_unit_make ?? undefined,
          model: decoded?.model ?? undefined,
          modelYear: decoded?.modelYear ? parseInt(decoded.modelYear, 10) || undefined : undefined,
          bodyClass: decoded?.bodyClass ?? undefined,
          vehicleType: decoded?.vehicleType ?? undefined,
        },
      });

      // Upsert CarrierVehicle link
      await prisma.carrierVehicle.upsert({
        where: { dotNumber_vin: { dotNumber, vin } },
        create: {
          dotNumber,
          vin,
          unitType,
          source: "socrata",
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          observationCount: 1,
        },
        update: {
          lastSeenAt: new Date(),
          observationCount: { increment: 1 },
        },
      });

      persisted++;
    } catch {
      // Skip on constraint violations or DB errors
    }
  }

  return persisted;
}

function mapUnitType(typeId?: string): string {
  if (!typeId) return "TRUCK";
  // FMCSA unit type codes
  switch (typeId) {
    case "1": return "TRUCK";
    case "2": return "TRAILER";
    case "3": return "TRUCK";  // Tractor
    case "4": return "BUS";
    case "5": return "IEP";    // Intermodal Equipment Provider
    default: return "TRUCK";
  }
}
