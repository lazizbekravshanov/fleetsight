"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type TeamMember = { id: string; email: string; role: string };
type Team = {
  id: string;
  name: string;
  slug: string;
  role: string;
  memberCount: number;
  members: TeamMember[];
  watchlistCount: number;
  notesCount: number;
};

export function TeamsManager() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviteTeamId, setInviteTeamId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [error, setError] = useState("");

  const fetchTeams = useCallback(async () => {
    const r = await fetch("/api/teams");
    if (r.ok) {
      const data = await r.json();
      setTeams(data.teams);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") fetchTeams();
  }, [status, router, fetchTeams]);

  async function createTeam() {
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    const r = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (r.ok) {
      setNewName("");
      setShowCreate(false);
      fetchTeams();
    } else {
      const data = await r.json();
      setError(data.error || "Failed to create team");
    }
    setCreating(false);
  }

  async function inviteMember() {
    if (!inviteTeamId || !inviteEmail.trim()) return;
    setError("");
    const r = await fetch(`/api/teams/${inviteTeamId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    if (r.ok) {
      setInviteEmail("");
      setInviteTeamId(null);
      fetchTeams();
    } else {
      const data = await r.json();
      setError(data.error || "Failed to invite member");
    }
  }

  async function removeMember(teamId: string, userId: string) {
    await fetch(`/api/teams/${teamId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    fetchTeams();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-surface-0 dark:bg-[#09090b]">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <div className="h-6 w-48 animate-pulse rounded bg-surface-3 dark:bg-surface-1 mx-auto" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-0 dark:bg-[#09090b] text-ink dark:text-ink">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/" className="text-xs text-accent dark:text-accent hover:underline">
              &larr; Search
            </Link>
            <h1 className="mt-1 text-2xl font-semibold">Teams</h1>
            <p className="text-sm text-ink-soft dark:text-ink-muted">
              Collaborate on carrier intelligence with your team
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition"
          >
            Create Team
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-rose-50 dark:bg-rose-950 px-4 py-2 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Create Team Modal */}
        {showCreate && (
          <div className="mb-6 rounded-xl border border-border dark:border-border bg-surface-1 dark:bg-surface-0 p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Create a new team</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Team name"
                className="flex-1 rounded-lg border border-border dark:border-border bg-surface-1 dark:bg-surface-1 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                onKeyDown={(e) => e.key === "Enter" && createTeam()}
              />
              <button
                onClick={createTeam}
                disabled={creating || !newName.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition"
              >
                {creating ? "Creating..." : "Create"}
              </button>
              <button
                onClick={() => { setShowCreate(false); setNewName(""); }}
                className="rounded-lg border border-border dark:border-border px-3 py-2 text-sm hover:bg-surface-0 dark:hover:bg-surface-1 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Teams List */}
        {teams.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border dark:border-border p-12 text-center">
            <p className="text-ink-soft dark:text-ink-muted text-sm">
              No teams yet. Create one to start collaborating.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="rounded-xl border border-border dark:border-border bg-surface-1 dark:bg-surface-0 p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold">{team.name}</h3>
                    <div className="mt-1 flex items-center gap-3 text-xs text-ink-soft dark:text-ink-muted">
                      <span>{team.memberCount} members</span>
                      <span>{team.watchlistCount} carriers watched</span>
                      <span>{team.notesCount} notes</span>
                      <span className="rounded bg-accent-soft dark:bg-accent-soft px-1.5 py-0.5 text-accent dark:text-accent font-medium">
                        {team.role}
                      </span>
                    </div>
                  </div>
                  {team.role === "admin" && (
                    <button
                      onClick={() => setInviteTeamId(inviteTeamId === team.id ? null : team.id)}
                      className="text-xs text-accent dark:text-accent hover:underline"
                    >
                      + Invite
                    </button>
                  )}
                </div>

                {/* Invite Form */}
                {inviteTeamId === team.id && (
                  <div className="mt-4 flex gap-2 border-t border-border dark:border-border pt-4">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="Email address"
                      className="flex-1 rounded-lg border border-border dark:border-border bg-surface-1 dark:bg-surface-1 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="rounded-lg border border-border dark:border-border bg-surface-1 dark:bg-surface-1 px-2 py-1.5 text-sm"
                    >
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      onClick={inviteMember}
                      className="rounded-lg bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-hover transition"
                    >
                      Invite
                    </button>
                  </div>
                )}

                {/* Members List */}
                <div className="mt-3 space-y-1">
                  {team.members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-xs">
                      <span className="text-ink-soft dark:text-ink-muted">
                        {m.email}
                        <span className="ml-1.5 text-ink-muted dark:text-ink-soft">({m.role})</span>
                      </span>
                      {team.role === "admin" && m.id !== session?.user?.id && (
                        <button
                          onClick={() => removeMember(team.id, m.id)}
                          className="text-rose-500 hover:text-rose-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
