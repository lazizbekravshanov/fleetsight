import type { SearchHistory } from "@prisma/client";

export function RecentSearchesSection({ history }: { history: SearchHistory[] }) {
  if (history.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-gray-700">Recent Lookups</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {history.map((item) => (
          <a
            key={item.id}
            href={`/?dot=${item.dotNumber}`}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{item.legalName}</p>
              <p className="text-[11px] text-gray-400 tabular-nums">USDOT {item.dotNumber}</p>
            </div>
            <span className="ml-3 flex-shrink-0 text-[10px] text-gray-300">
              {new Date(item.searchedAt).toLocaleDateString()}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
