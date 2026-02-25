#!/usr/bin/env node
/**
 * Downloads the OFAC SDN list CSV and extracts names/aliases into sdn-names.json.
 * Run: node landing/lib/background/sdn-update.mjs
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const SDN_URL = "https://www.treasury.gov/ofac/downloads/sdn.csv";
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, "sdn-names.json");

async function main() {
  console.log("Downloading SDN list...");
  const res = await fetch(SDN_URL);
  if (!res.ok) throw new Error(`Failed to download SDN: ${res.status}`);
  const text = await res.text();

  const names = new Set();
  for (const line of text.split("\n")) {
    // SDN CSV fields: ent_num, SDN_Name, SDN_Type, Program, Title, ...
    const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
    const sdnName = cols[1];
    if (sdnName && sdnName.length > 1 && sdnName !== "SDN_Name") {
      names.add(sdnName.toUpperCase());
    }
  }

  const sorted = [...names].sort();
  writeFileSync(OUTPUT, JSON.stringify(sorted, null, 0));
  console.log(`Wrote ${sorted.length} names to ${OUTPUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
