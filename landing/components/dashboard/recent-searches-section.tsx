import type { SearchHistory } from "@prisma/client";

export function RecentSearchesSection({ history }: { history: SearchHistory[] }) {
  if (history.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-ink-soft">Recent Lookups</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {history.map((item) => (
          <a
            key={item.id}
            href={`/?dot=${item.dotNumber}`}
            className="flex items-center justify-between rounded-xl border border-border bg-surface-1 px-4 py-3 shadow-sm hover:border-accent/30 hover:shadow-md transition-all"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{item.legalName}</p>
              <p className="text-[11px] text-ink-muted tabular-nums">USDOT {item.dotNumber}</p>
            </div>
            <span className="ml-3 flex-shrink-0 text-[10px] text-ink-muted">
              {new Date(item.searchedAt).toLocaleDateString()}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
