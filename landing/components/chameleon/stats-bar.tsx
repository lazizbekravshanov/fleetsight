"use client";

type Stats = {
  carrierCount: number;
  clusterCount: number;
  highRiskCount: number;
  lastSync: { date: string; status: string } | null;
};

const STAT_CONFIG = [
  {
    key: "carriers",
    label: "Carriers Tracked",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 7h6M5 10h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    key: "clusters",
    label: "Chameleon Clusters",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="3.5" cy="4.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="12.5" cy="4.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="8" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M5 5.5L6.5 7M10 7l1.5-1.5M8 10.5V11.5" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    key: "highRisk",
    label: "High Risk",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 2L14 13H2L8 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M8 6.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="11" r="0.75" fill="currentColor" />
      </svg>
    ),
    color: "text-rose-400",
    bg: "bg-rose-500/10",
  },
  {
    key: "lastSync",
    label: "Last Sync",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
];

export function StatsBar({ stats }: { stats: Stats }) {
  const values = [
    stats.carrierCount,
    stats.clusterCount,
    stats.highRiskCount,
    stats.lastSync ? new Date(stats.lastSync.date).toLocaleDateString() : "—",
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {STAT_CONFIG.map((cfg, i) => (
        <div
          key={cfg.key}
          className="card-elevated rounded-2xl p-4 transition-all duration-200 hover:translate-y-[-1px] hover:shadow-card-md"
        >
          <div className="flex items-center gap-2.5">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${cfg.bg} ${cfg.color}`}>
              {cfg.icon}
            </div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
              {cfg.label}
            </p>
          </div>
          <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-white">
            {typeof values[i] === "number"
              ? (values[i] as number).toLocaleString()
              : values[i]}
          </p>
        </div>
      ))}
    </div>
  );
}
