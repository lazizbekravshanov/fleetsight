const GRADE_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: "#059669", text: "#ffffff" },
  B: { bg: "#0891b2", text: "#ffffff" },
  C: { bg: "#d97706", text: "#ffffff" },
  D: { bg: "#ea580c", text: "#ffffff" },
  F: { bg: "#dc2626", text: "#ffffff" },
};

export function generateBadgeSvg(
  grade: string,
  score: number,
  legalName: string
): string {
  const colors = GRADE_COLORS[grade] ?? GRADE_COLORS.C;
  const truncatedName =
    legalName.length > 30 ? legalName.slice(0, 27) + "..." : legalName;

  const labelWidth = 80;
  const gradeWidth = 50;
  const scoreWidth = 50;
  const totalWidth = labelWidth + gradeWidth + scoreWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="FleetSight: Grade ${grade} Score ${score}">
  <title>${truncatedName} — Grade ${grade}, Score ${score}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${gradeWidth}" height="20" fill="${colors.bg}"/>
    <rect x="${labelWidth + gradeWidth}" width="${scoreWidth}" height="20" fill="#333"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">FleetSight</text>
    <text x="${labelWidth / 2}" y="14">FleetSight</text>
    <text x="${labelWidth + gradeWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${grade}</text>
    <text x="${labelWidth + gradeWidth / 2}" y="14" fill="${colors.text}">${grade}</text>
    <text x="${labelWidth + gradeWidth + scoreWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${score}</text>
    <text x="${labelWidth + gradeWidth + scoreWidth / 2}" y="14">${score}</text>
  </g>
</svg>`;
}
