"use client";

import { useState, useRef } from "react";

export function RosterImport({
  rosterId,
  onImported,
}: {
  rosterId: string;
  onImported?: (result: { parsed: number; added: number; total: number }) => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ parsed: number; added: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImport() {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const r = await fetch(`/api/roster/${rosterId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await r.json();
      if (r.ok) {
        setResult({ parsed: data.parsed, added: data.added });
        setText("");
        onImported?.(data);
      } else {
        setError(data.error ?? "Import failed");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setText(reader.result);
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-gray-700">
        Import DOT Numbers
      </h3>
      <p className="mb-3 text-xs text-gray-400">
        Paste DOT numbers (one per line or comma-separated) or upload a CSV file.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"1234567\n2345678\n3456789\n\nor comma-separated: 1234567, 2345678, 3456789"}
        rows={6}
        className="w-full resize-none rounded-lg border border-gray-200 p-3 font-mono text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Upload File
          </button>
          {text && (
            <span className="text-xs text-gray-400">
              {text.split(/[\n,]+/).filter((s) => /^\s*\d{1,10}\s*$/.test(s)).length} DOT numbers detected
            </span>
          )}
        </div>
        <button
          onClick={handleImport}
          disabled={!text.trim() || loading}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
        >
          {loading ? "Importing..." : "Import"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      {result && (
        <p className="mt-2 text-xs text-emerald-600">
          Imported {result.added} of {result.parsed} carriers.
        </p>
      )}
    </div>
  );
}
