export async function GET() {
  // All features are free — return unlimited enterprise plan
  return Response.json({
    active: true,
    tier: "enterprise",
    carrierCount: 0,
    carrierLimit: "unlimited",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  });
}
