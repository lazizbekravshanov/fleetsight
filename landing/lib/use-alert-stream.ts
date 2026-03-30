"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type Alert = {
  id: string;
  dotNumber: string;
  legalName: string;
  alertType: string;
  severity: string;
  title: string;
  detail: string;
  read: boolean;
  createdAt: string;
};

export function useAlertStream() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/alerts/stream");
    esRef.current = es;

    es.addEventListener("init", (e) => {
      const data = JSON.parse(e.data);
      setAlerts(data.alerts);
      setUnreadCount(data.unreadCount);
      setConnected(true);
    });

    es.addEventListener("alert", (e) => {
      const alert = JSON.parse(e.data) as Alert;
      setAlerts((prev) => [alert, ...prev].slice(0, 50));
    });

    es.addEventListener("unread", (e) => {
      const data = JSON.parse(e.data);
      setUnreadCount(data.count);
    });

    es.addEventListener("ping", () => {
      setConnected(true);
    });

    es.addEventListener("error", () => {
      setConnected(false);
    });

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);

  const markRead = useCallback(async (alertId: string) => {
    const r = await fetch(`/api/alerts/${alertId}`, { method: "PATCH" });
    if (r.ok) {
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, read: true } : a)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const r = await fetch("/api/alerts/mark-all-read", { method: "POST" });
    if (r.ok) {
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
      setUnreadCount(0);
    }
  }, []);

  return { alerts, unreadCount, connected, markRead, markAllRead };
}
