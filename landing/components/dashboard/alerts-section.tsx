"use client";

import { useAlertStream } from "@/lib/use-alert-stream";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-500/30",
  high: "bg-orange-50 text-orange-700 ring-1 ring-orange-600/20 dark:bg-orange-950 dark:text-orange-300 dark:ring-orange-500/30",
  medium: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-500/30",
  low: "bg-gray-50 text-gray-600 ring-1 ring-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700",
};

export function AlertsSection() {
  const { alerts, unreadCount, connected, markRead, markAllRead } = useAlertStream();

  if (alerts.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
          Alerts
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
          {connected && (
            <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" title="Live" />
          )}
        </h2>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`rounded-xl border bg-white px-4 py-3 shadow-sm transition dark:bg-zinc-900 ${
              alert.read
                ? "border-gray-200 opacity-70 dark:border-zinc-800"
                : "border-gray-200 dark:border-zinc-700"
            }`}
          >
            <div className="flex items-start gap-3">
              {!alert.read && (
                <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-indigo-500" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.low}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-zinc-500">
                    {new Date(alert.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <a
                  href={`/?dot=${alert.dotNumber}`}
                  className="mt-1 block text-sm font-medium text-gray-900 hover:text-indigo-600 dark:text-zinc-100 dark:hover:text-indigo-400"
                >
                  {alert.title}
                </a>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">{alert.detail}</p>
              </div>
              {!alert.read && (
                <button
                  onClick={() => markRead(alert.id)}
                  className="flex-shrink-0 rounded-lg p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-500 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                  title="Mark read"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M3 7l3 3 5-6" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
