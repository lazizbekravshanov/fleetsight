"use client";

export type MonthlyViolationData = {
  month: string;
  violations: number;
  oosViolations: number;
};

export function ViolationSparkline({
  monthlyData,
}: {
  monthlyData: MonthlyViolationData[];
}) {
  if (!monthlyData || monthlyData.length === 0) return null;

  const W = 160;
  const H = 32;
  const padX = 4;
  const padY = 4;

  const maxVal = Math.max(...monthlyData.map((d) => d.violations), 1);
  const stepX =
    monthlyData.length > 1
      ? (W - padX * 2) / (monthlyData.length - 1)
      : 0;

  function toPoints(accessor: (d: MonthlyViolationData) => number): string {
    return monthlyData
      .map((d, i) => {
        const x = padX + i * stepX;
        const y = H - padY - ((accessor(d) / maxVal) * (H - padY * 2));
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  function toAreaPath(accessor: (d: MonthlyViolationData) => number): string {
    const points = monthlyData.map((d, i) => {
      const x = padX + i * stepX;
      const y = H - padY - ((accessor(d) / maxVal) * (H - padY * 2));
      return { x, y };
    });
    if (points.length === 0) return "";
    const baseline = H - padY;
    let path = `M ${points[0].x.toFixed(1)} ${baseline}`;
    for (const p of points) {
      path += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }
    path += ` L ${points[points.length - 1].x.toFixed(1)} ${baseline} Z`;
    return path;
  }

  const totalPoints = toPoints((d) => d.violations);
  const oosPoints = toPoints((d) => d.oosViolations);
  const totalArea = toAreaPath((d) => d.violations);
  const oosArea = toAreaPath((d) => d.oosViolations);

  const lastMonth = monthlyData[monthlyData.length - 1];
  const lastX = padX + (monthlyData.length - 1) * stepX;
  const lastYTotal =
    H - padY - ((lastMonth.violations / maxVal) * (H - padY * 2));
  const lastYOos =
    H - padY - ((lastMonth.oosViolations / maxVal) * (H - padY * 2));

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full max-w-[160px] h-auto"
      role="img"
      aria-label="Violation trend sparkline"
    >
      {/* Area fills */}
      <path d={totalArea} fill="#9ca3af" fillOpacity={0.08} />
      <path d={oosArea} fill="#f43f5e" fillOpacity={0.08} />

      {/* Lines */}
      <polyline
        points={totalPoints}
        fill="none"
        stroke="#9ca3af"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polyline
        points={oosPoints}
        fill="none"
        stroke="#f43f5e"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Data point dots */}
      {monthlyData.map((d, i) => {
        const x = padX + i * stepX;
        const yTotal = H - padY - ((d.violations / maxVal) * (H - padY * 2));
        const yOos =
          H - padY - ((d.oosViolations / maxVal) * (H - padY * 2));
        const label = `${d.month}: ${d.violations} violations, ${d.oosViolations} OOS`;
        return (
          <g key={d.month}>
            <title>{label}</title>
            <circle cx={x} cy={yTotal} r="1.5" fill="#9ca3af" />
            <circle cx={x} cy={yOos} r="1.5" fill="#f43f5e" />
          </g>
        );
      })}

      {/* End labels */}
      <text
        x={lastX + 2}
        y={lastYTotal - 2}
        fontSize="7"
        fill="#6b7280"
        textAnchor="start"
        dominantBaseline="auto"
      >
        {lastMonth.violations}
      </text>
      {lastMonth.oosViolations > 0 && (
        <text
          x={lastX + 2}
          y={lastYOos + 8}
          fontSize="7"
          fill="#f43f5e"
          textAnchor="start"
          dominantBaseline="auto"
        >
          {lastMonth.oosViolations}
        </text>
      )}
    </svg>
  );
}
