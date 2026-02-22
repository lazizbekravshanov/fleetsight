export const CARSHIP_CODES: Record<string, string> = {
  A: "General Freight",
  B: "Household Goods",
  C: "Metal/Sheets/Coils",
  D: "Motor Vehicles",
  E: "Drivetrain",
  F: "Machinery & Large Objects",
  G: "Building Materials",
  H: "Commodities Dry Bulk",
  I: "Refrigerated Food",
  J: "Beverages",
  K: "Paper Products",
  L: "Utilities",
  M: "Farm Supplies",
  N: "Construction",
  O: "Water Well",
  P: "Intermodal Containers",
  Q: "Passengers",
  R: "Fresh Produce",
  S: "Grain/Feed/Hay",
  T: "Coal/Coke",
  U: "Livestock",
  V: "US Mail",
  W: "Chemicals",
  X: "Commodities Liquid Bulk",
  Y: "Oilfield Equipment",
  Z: "Logs/Poles/Beams/Lumber",
};

export const CARRIER_OPERATION_CODES: Record<string, string> = {
  A: "Interstate Auth For-Hire",
  B: "Interstate Exempt For-Hire",
  C: "Interstate Private (Property)",
  D: "Interstate Private (Passengers, Business)",
  E: "Interstate Private (Passengers, Non-Business)",
  X: "Intrastate Only (Hazmat)",
  Z: "Intrastate Only (Non-Hazmat)",
};

export const FLEETSIZE_CODES: Record<string, string> = {
  A: "1–5",
  B: "6–20",
  C: "21–100",
  D: "101–500",
  E: "501–1,000",
  F: "1,001+",
};

export const INSPECTION_LEVEL_CODES: Record<string, string> = {
  "1": "Full (NAS)",
  "2": "Walk-Around",
  "3": "Driver-Only",
  "4": "Special",
  "5": "Terminal",
  "6": "Enhanced NAS",
};

export const STATUS_CODES: Record<string, string> = {
  A: "Active",
  I: "Inactive",
  "NOT AUTH": "Not Authorized",
};

export function decodeCarship(carship: string | undefined | null): string[] {
  if (!carship) return [];
  return carship
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean)
    .map((code) => CARSHIP_CODES[code] ?? code);
}

export function decodeStatus(code: string | undefined | null): string {
  if (!code) return "Unknown";
  return STATUS_CODES[code] ?? code;
}

export function decodeOperation(code: string | undefined | null): string {
  if (!code) return "Unknown";
  return CARRIER_OPERATION_CODES[code] ?? code;
}

export function decodeFleetSize(code: string | undefined | null): string {
  if (!code) return "Unknown";
  return FLEETSIZE_CODES[code] ?? code;
}

export const VEHICLE_CONFIGURATION_CODES: Record<string, string> = {
  "1": "Passenger Car",
  "2": "Bus",
  "3": "Single-Unit Truck",
  "4": "Truck/Trailer",
  "5": "Tractor/Semi-Trailer",
  "6": "Tractor/Double",
  "7": "Tractor/Triple",
  "8": "Other",
  "97": "Unknown",
  "98": "Not Applicable",
  "99": "Unknown",
};

export const CARGO_BODY_TYPE_CODES: Record<string, string> = {
  "1": "Van/Enclosed Box",
  "2": "Cargo Tank",
  "3": "Flatbed",
  "4": "Dump",
  "5": "Concrete Mixer",
  "6": "Auto Transporter",
  "7": "Garbage/Refuse",
  "8": "Hopper (Grain/Chips)",
  "9": "Pole/Log",
  "10": "Intermodal Chassis",
  "11": "Livestock",
  "12": "Not Applicable",
  "13": "Other",
  "97": "Unknown",
  "98": "No Cargo Body",
  "99": "Unknown",
};

export function decodeInspectionLevel(level: string | number | undefined | null): string {
  if (level == null) return "Unknown";
  return INSPECTION_LEVEL_CODES[String(level)] ?? `Level ${level}`;
}

export function decodeVehicleConfig(code: string | undefined | null): string {
  if (!code) return "Unknown";
  return VEHICLE_CONFIGURATION_CODES[code] ?? `Config ${code}`;
}

export function decodeCargoBodyType(code: string | undefined | null): string {
  if (!code) return "Unknown";
  return CARGO_BODY_TYPE_CODES[code] ?? `Type ${code}`;
}

export function decodeClassdef(classdef: string | undefined | null): string[] {
  if (!classdef) return [];
  return classdef
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean);
}

export function isBroker(classdef: string | undefined | null): boolean {
  if (!classdef) return false;
  return classdef.toUpperCase().includes("BROKER");
}

export function entityTypeBadge(classdef: string | undefined | null): {
  label: string;
  color: "blue" | "purple" | "amber" | "slate";
} {
  if (!classdef) return { label: "Unknown", color: "slate" };
  const upper = classdef.toUpperCase();
  if (upper.includes("BROKER") && !upper.includes("AUTHORIZED FOR HIRE") && !upper.includes("EXEMPT FOR HIRE") && !upper.includes("PRIVATE"))
    return { label: "Broker", color: "purple" };
  if (upper.includes("BROKER"))
    return { label: "Carrier/Broker", color: "amber" };
  if (upper.includes("FREIGHT FORWARDER"))
    return { label: "Freight Forwarder", color: "blue" };
  return { label: "Carrier", color: "blue" };
}
