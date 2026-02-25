import { prisma } from "@/lib/prisma";

export async function grantCredits(
  userId: string,
  amount: number,
  type: string,
  reference?: string
) {
  return prisma.$transaction(async (tx) => {
    const balance = await tx.creditBalance.upsert({
      where: { userId },
      create: { userId, credits: amount },
      update: { credits: { increment: amount } },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        amount,
        type,
        balanceAfter: balance.credits,
        reference: reference ?? null,
      },
    });

    return balance.credits;
  });
}

export async function deductCredit(
  userId: string,
  type: string,
  reference?: string
): Promise<{ success: boolean; remaining: number }> {
  return prisma.$transaction(async (tx) => {
    // Atomic: only deduct if credits >= 1 (row-level lock prevents races)
    const result = await tx.creditBalance.updateMany({
      where: { userId, credits: { gte: 1 } },
      data: { credits: { decrement: 1 } },
    });

    if (result.count === 0) {
      const current = await tx.creditBalance.findUnique({ where: { userId } });
      return { success: false, remaining: current?.credits ?? 0 };
    }

    const updated = await tx.creditBalance.findUniqueOrThrow({ where: { userId } });

    await tx.creditTransaction.create({
      data: {
        userId,
        amount: -1,
        type,
        balanceAfter: updated.credits,
        reference: reference ?? null,
      },
    });

    return { success: true, remaining: updated.credits };
  });
}

export async function getCreditBalance(userId: string): Promise<number> {
  const balance = await prisma.creditBalance.findUnique({ where: { userId } });
  return balance?.credits ?? 0;
}
