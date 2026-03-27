import { prisma } from "@/lib/prisma";

// ── Types ──────────────────────────────────────────────────────

export type EnablerImportRow = {
  enablerType: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  dotNumber: string;
  relationship: string;
  effectiveDate?: string;
  source: string;
};

// ── Normalization helpers ──────────────────────────────────────

function normalizeName(name: string): string {
  return name.toUpperCase().trim().replace(/\s+/g, " ");
}

function normalizePhone(phone: string | undefined): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, "");
  return digits.length > 0 ? digits : undefined;
}

function normalizeAddress(address: string | undefined): string | undefined {
  if (!address) return undefined;
  return address.toUpperCase().trim().replace(/\s+/g, " ");
}

// ── Bulk import ────────────────────────────────────────────────

export async function importEnablers(
  rows: EnablerImportRow[]
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      if (!row.name || !row.dotNumber || !row.enablerType) {
        skipped++;
        errors.push(
          `Skipped row: missing required field (name=${row.name}, dot=${row.dotNumber}, type=${row.enablerType})`
        );
        continue;
      }

      const nameNorm = normalizeName(row.name);
      const phoneNorm = normalizePhone(row.phone);
      const addressNorm = normalizeAddress(row.address);

      // Upsert enabler by nameNormalized + enablerType
      let enabler = await prisma.enabler.findFirst({
        where: {
          nameNormalized: nameNorm,
          enablerType: row.enablerType,
        },
      });

      if (enabler) {
        enabler = await prisma.enabler.update({
          where: { id: enabler.id },
          data: {
            address: row.address?.trim() ?? undefined,
            addressNormalized: addressNorm ?? undefined,
            city: row.city?.trim() ?? undefined,
            state: row.state?.trim() ?? undefined,
            zip: row.zip?.trim() ?? undefined,
            phone: row.phone?.trim() ?? undefined,
            phoneNormalized: phoneNorm ?? undefined,
            lastSeenAt: new Date(),
          },
        });
      } else {
        enabler = await prisma.enabler.create({
          data: {
            enablerType: row.enablerType,
            name: row.name.trim(),
            nameNormalized: nameNorm,
            address: row.address?.trim() ?? null,
            addressNormalized: addressNorm ?? null,
            city: row.city?.trim() ?? null,
            state: row.state?.trim() ?? null,
            zip: row.zip?.trim() ?? null,
            phone: row.phone?.trim() ?? null,
            phoneNormalized: phoneNorm ?? null,
            firstSeenAt: new Date(),
            lastSeenAt: new Date(),
          },
        });
      }

      // Upsert carrier link (unique on enabler + dot + relationship)
      const effectiveDate = row.effectiveDate
        ? new Date(row.effectiveDate)
        : null;

      await prisma.enablerCarrierLink.upsert({
        where: {
          enablerId_dotNumber_relationship: {
            enablerId: enabler.id,
            dotNumber: row.dotNumber,
            relationship: row.relationship,
          },
        },
        create: {
          enablerId: enabler.id,
          dotNumber: row.dotNumber,
          relationship: row.relationship,
          effectiveDate,
          source: row.source,
          isCurrent: true,
        },
        update: {
          effectiveDate: effectiveDate ?? undefined,
          source: row.source,
          isCurrent: true,
        },
      });

      // Update firstSeenAt if this link is older
      if (effectiveDate) {
        await prisma.enabler.update({
          where: { id: enabler.id },
          data: {
            firstSeenAt:
              !enabler.firstSeenAt || effectiveDate < enabler.firstSeenAt
                ? effectiveDate
                : enabler.firstSeenAt,
            lastSeenAt:
              !enabler.lastSeenAt || effectiveDate > enabler.lastSeenAt
                ? effectiveDate
                : enabler.lastSeenAt,
          },
        });
      }

      imported++;
    } catch (err: any) {
      errors.push(
        `Error importing ${row.name} (DOT ${row.dotNumber}): ${err.message}`
      );
      skipped++;
    }
  }

  return { imported, skipped, errors };
}

// ── Bootstrap from existing CarrierAgent records ───────────────

const AGENT_TYPE_MAP: Record<string, string> = {
  PROCESS_AGENT: "PROCESS_AGENT",
  INSURANCE: "INSURANCE_AGENT",
  INSURANCE_AGENT: "INSURANCE_AGENT",
  BOC3: "PROCESS_AGENT",
  LEGAL: "LEGAL_REPRESENTATIVE",
  LEGAL_REP: "LEGAL_REPRESENTATIVE",
};

function mapAgentType(agentType: string): string {
  return AGENT_TYPE_MAP[agentType.toUpperCase()] ?? agentType.toUpperCase();
}

export async function importFromCarrierAgents(): Promise<{
  processed: number;
  enablersCreated: number;
}> {
  let processed = 0;
  let enablersCreated = 0;

  // Read all carrier agents in batches
  const batchSize = 500;
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const agents = await prisma.carrierAgent.findMany({
      take: batchSize,
      skip,
      orderBy: { id: "asc" },
    });

    if (agents.length === 0) {
      hasMore = false;
      break;
    }

    for (const agent of agents) {
      const enablerType = mapAgentType(agent.agentType);
      const nameNorm = normalizeName(agent.agentName);
      const addressNorm = normalizeAddress(agent.agentAddress ?? undefined);

      // Upsert enabler
      const existing = await prisma.enabler.findFirst({
        where: {
          nameNormalized: nameNorm,
          enablerType,
        },
      });

      let enablerId: string;

      if (existing) {
        enablerId = existing.id;
        // Update lastSeenAt
        await prisma.enabler.update({
          where: { id: existing.id },
          data: {
            lastSeenAt: agent.effectiveDate ?? new Date(),
            address: existing.address ?? agent.agentAddress ?? null,
            addressNormalized: existing.addressNormalized ?? addressNorm ?? null,
          },
        });
      } else {
        const created = await prisma.enabler.create({
          data: {
            enablerType,
            name: agent.agentName.trim(),
            nameNormalized: nameNorm,
            address: agent.agentAddress ?? null,
            addressNormalized: addressNorm ?? null,
            firstSeenAt: agent.effectiveDate ?? new Date(),
            lastSeenAt: agent.effectiveDate ?? new Date(),
          },
        });
        enablerId = created.id;
        enablersCreated++;
      }

      // Upsert carrier link
      const dotStr = String(agent.dotNumber);
      const relationship = enablerType;

      await prisma.enablerCarrierLink.upsert({
        where: {
          enablerId_dotNumber_relationship: {
            enablerId,
            dotNumber: dotStr,
            relationship,
          },
        },
        create: {
          enablerId,
          dotNumber: dotStr,
          relationship,
          effectiveDate: agent.effectiveDate ?? null,
          source: agent.source,
          isCurrent: true,
        },
        update: {
          effectiveDate: agent.effectiveDate ?? undefined,
          source: agent.source,
        },
      });

      processed++;
    }

    skip += batchSize;
  }

  return { processed, enablersCreated };
}
