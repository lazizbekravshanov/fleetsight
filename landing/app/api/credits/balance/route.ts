export async function GET() {
  // All features are free — return unlimited credits
  return Response.json({ credits: 999999 });
}
