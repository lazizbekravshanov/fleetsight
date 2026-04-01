"use client";

import { useAlertStream } from "@/lib/use-alert-stream";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-500/30",
  high: "bg-orange-50 text-orange-700 ring-1 ring-orange-600/20 dark:bg-orange-950 dark:text-orange-300 dark:ring-orange-500/30",
  medium: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-500/30",
  low: "bg-surface-0 text-ink-soft ring-1 ring-border dark:bg-surface-1 dark:text-ink-muted dark:ring-border",
};

export function AlertsSection() {
  const { alerts, unreadCount, connected, markRead, markAllRead } = useAlertStream();

  if (alerts.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-soft dark:text-ink-soft">
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
            className="text-xs text-accent hover:text-accent dark:text-accent dark:hover:text-accent"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`rounded-xl border bg-surface-1 px-4 py-3 shadow-sm transition dark:bg-surface-0 ${
              alert.read
                ? "border-border opacity-70 dark:border-border"
                : "border-border dark:border-border"
            }`}
          >
            <div className="flex items-start gap-3">
              {!alert.read && (
                <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-accent-soft0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.low}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                  <span className="text-xs text-ink-muted dark:text-ink-muted">
                    {new Date(alert.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <a
                  href={`/?dot=${alert.dotNumber}`}
                  className="mt-1 block text-sm font-medium text-ink hover:text-accent dark:text-ink dark:hover:text-accent"
                >
                  {alert.title}
                </a>
                <p className="mt-0.5 text-xs text-ink-soft dark:text-ink-muted">{alert.detail}</p>
              </div>
              {!alert.read && (
                <button
                  onClick={() => markRead(alert.id)}
                  className="flex-shrink-0 rounded-lg p-1 text-ink-muted hover:bg-surface-2 hover:text-ink-soft dark:text-ink-soft dark:hover:bg-surface-1 dark:hover:text-ink-soft"
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
