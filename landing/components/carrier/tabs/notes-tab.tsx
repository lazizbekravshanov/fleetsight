"use client";

import { useState, useEffect } from "react";

type Note = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export function NotesTab({ dotNumber }: { dotNumber: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    fetch(`/api/carrier/${dotNumber}/notes`)
      .then((r) => (r.ok ? r.json() : { notes: [] }))
      .then((d) => setNotes(d.notes ?? []))
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, [dotNumber]);

  async function addNote() {
    if (!draft.trim() || saving) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/carrier/${dotNumber}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft.trim() }),
      });
      if (r.ok) {
        const { note } = await r.json();
        setNotes((prev) => [note, ...prev]);
        setDraft("");
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(noteId: string) {
    if (!editContent.trim()) return;
    const r = await fetch(`/api/carrier/${dotNumber}/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent.trim() }),
    });
    if (r.ok) {
      const { note } = await r.json();
      setNotes((prev) => prev.map((n) => (n.id === noteId ? note : n)));
      setEditingId(null);
    }
  }

  async function deleteNote(noteId: string) {
    const r = await fetch(`/api/carrier/${dotNumber}/notes/${noteId}`, {
      method: "DELETE",
    });
    if (r.ok || r.status === 204) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    }
  }

  return (
    <div className="space-y-4">
      {/* Compose */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
          Add a note
        </label>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote();
          }}
          placeholder="Internal notes, red flags, broker decisions…"
          rows={3}
          className="w-full resize-none rounded-lg border border-[var(--border)] p-3 text-sm text-[var(--ink)] placeholder-gray-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-[var(--ink-muted)]">{draft.length}/5000 · ⌘Enter to save</span>
          <button
            onClick={addNote}
            disabled={!draft.trim() || saving}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save note"}
          </button>
        </div>
      </div>

      {/* Notes list */}
      {loading ? (
        <div className="text-sm text-[var(--ink-muted)]">Loading notes…</div>
      ) : notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-8 text-center">
          <p className="text-sm text-[var(--ink-soft)]">No notes yet.</p>
          <p className="mt-1 text-xs text-[var(--ink-muted)]">Notes are private to your account.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm"
            >
              {editingId === note.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-lg border border-[var(--border)] p-3 text-sm text-[var(--ink)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(note.id)}
                      className="rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-white hover:bg-accent-hover"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--ink-soft)] hover:bg-[var(--surface-2)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap text-sm text-[var(--ink)]">{note.content}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <time className="text-xs text-[var(--ink-muted)]">
                      {new Date(note.createdAt).toLocaleString()}
                      {note.updatedAt !== note.createdAt && " · edited"}
                    </time>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingId(note.id);
                          setEditContent(note.content);
                        }}
                        className="text-xs text-[var(--ink-muted)] hover:text-accent"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="text-xs text-[var(--ink-muted)] hover:text-rose-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
