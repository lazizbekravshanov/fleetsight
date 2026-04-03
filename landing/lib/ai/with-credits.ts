type GateResult = { allowed: true; userId: string; remaining: number };

export async function gateAiFeature(
  _featureType: string,
  _reference?: string
): Promise<GateResult> {
  // All AI features are free — no credit gating
  return { allowed: true, userId: "anonymous", remaining: Infinity };
}
