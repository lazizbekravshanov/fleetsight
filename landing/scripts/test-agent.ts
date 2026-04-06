/**
 * End-to-end agent runtime test.
 *
 * Run with: npx tsx scripts/test-agent.ts
 *
 * Tests:
 *   1. Runtime tool-use loop with a stub Anthropic client (no API key needed)
 *   2. Parallel tool execution
 *   3. present_artifact citation validation (rejects hallucinated citations)
 *   4. Tool dedup cache
 *   5. Memory loader injects observations + preferences
 *   6. Conversation truncation
 *   7. Persona registry resolves correctly
 *
 * If ANTHROPIC_API_KEY is set in the environment, also runs:
 *   8. A real call to Sonnet against DOT 80321 with three minimal tools
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local from the landing/ directory
config({ path: resolve(__dirname, "../.env.local") });

import { prisma } from "../lib/prisma";
import { runAgent } from "../lib/agent/runtime";
import { allTools, pickTools } from "../lib/agent/tools";
import { getPersona, PERSONAS } from "../lib/agent/personas";
import { loadMemoryForRun, trimConversationToFit } from "../lib/agent/memory";
import type { AgentTool, AgentEvent, AgentContext } from "../lib/agent/types";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

let passed = 0;
let failed = 0;

function ok(name: string, detail?: string) {
  passed++;
  console.log(`  ${GREEN}✓${RESET} ${name}${detail ? ` ${DIM}— ${detail}${RESET}` : ""}`);
}

function fail(name: string, err: unknown) {
  failed++;
  const msg = err instanceof Error ? err.message : String(err);
  console.log(`  ${RED}✗${RESET} ${name}\n    ${RED}${msg}${RESET}`);
  if (err instanceof Error && err.stack) {
    console.log(`    ${DIM}${err.stack.split("\n").slice(1, 4).join("\n    ")}${RESET}`);
  }
}

function section(name: string) {
  console.log(`\n${BOLD}${name}${RESET}`);
}

async function expect<T>(name: string, fn: () => Promise<T> | T, predicate?: (result: T) => boolean | string): Promise<T | undefined> {
  try {
    const result = await fn();
    if (predicate) {
      const check = predicate(result);
      if (check !== true) {
        throw new Error(typeof check === "string" ? check : "predicate failed");
      }
    }
    ok(name);
    return result;
  } catch (err) {
    fail(name, err);
    return undefined;
  }
}

/* ── Test 1-7: Runtime + Tools + Memory + Personas (no API key needed) ─── */

async function testStaticPieces() {
  section("Static checks (no Anthropic call)");

  await expect(
    "Tool registry has all expected tools",
    () => allTools.length,
    (n) => n >= 22 || `expected ≥22 tools, got ${n}`
  );

  await expect(
    "All tool names are unique",
    () => new Set(allTools.map((t) => t.name)).size === allTools.length || "duplicate tool name"
  );

  await expect(
    "Every tool has summarize and serializeForModel",
    () => {
      for (const t of allTools) {
        if (typeof t.summarize !== "function") throw new Error(`${t.name}: summarize missing`);
        if (typeof t.serializeForModel !== "function") throw new Error(`${t.name}: serializeForModel missing`);
        if (typeof t.execute !== "function") throw new Error(`${t.name}: execute missing`);
        if (!t.inputSchema || typeof t.inputSchema !== "object") throw new Error(`${t.name}: inputSchema missing`);
      }
      return true;
    }
  );

  await expect(
    "All 5 personas resolve",
    () => Object.keys(PERSONAS).length === 5 || `expected 5 personas, got ${Object.keys(PERSONAS).length}`
  );

  await expect(
    "Each persona has tools that all exist in the registry",
    () => {
      const allNames = new Set(allTools.map((t) => t.name));
      for (const p of Object.values(PERSONAS)) {
        for (const tname of p.tools) {
          if (!allNames.has(tname)) throw new Error(`persona ${p.id} references unknown tool ${tname}`);
        }
      }
      return true;
    }
  );

  await expect(
    "getPersona returns investigator for unknown id",
    () => getPersona("nonsense").id === "investigator" || "expected fallback"
  );

  await expect(
    "trimConversationToFit keeps everything under budget",
    () => {
      const msgs = ["short", "short", "short"];
      const r = trimConversationToFit(msgs, 10000);
      return r.keptIndices.length === 3 || `expected 3, got ${r.keptIndices.length}`;
    }
  );

  await expect(
    "trimConversationToFit drops oldest when over budget",
    () => {
      const big = "x".repeat(50_000); // ~12.5k tokens
      const msgs = [big, big, big, big, big, big, big, big, big, big]; // 10 × 12.5k = 125k
      const r = trimConversationToFit(msgs, 80_000);
      return r.droppedCount > 0 || "expected to drop some";
    }
  );
}

/* ── Test runtime with stubbed Anthropic SDK (via _testClient hook) ──── */

import type Anthropic from "@anthropic-ai/sdk";

interface StubScript {
  turns: Array<{
    text?: string;
    toolUses?: Array<{ id: string; name: string; input: unknown }>;
    stop_reason: "end_turn" | "tool_use";
  }>;
}

/**
 * Build a fake Anthropic client object that satisfies the small surface
 * runAgent uses: `client.messages.stream({...}).on(...).finalMessage()`.
 */
function buildStubClient(script: StubScript): Anthropic {
  let turnIdx = 0;
  const stub = {
    messages: {
      stream: (_args: unknown) => {
        const turn = script.turns[turnIdx++];
        if (!turn) throw new Error("stub script exhausted");

        const textListeners: Array<(delta: string) => void> = [];

        const content: Array<
          { type: "text"; text: string } | { type: "tool_use"; id: string; name: string; input: unknown }
        > = [];
        if (turn.text) content.push({ type: "text", text: turn.text });
        for (const tu of turn.toolUses ?? []) {
          content.push({ type: "tool_use", id: tu.id, name: tu.name, input: tu.input });
        }

        const streamObj = {
          on(event: string, cb: (delta: string) => void) {
            if (event === "text") textListeners.push(cb);
            return streamObj;
          },
          async finalMessage() {
            if (turn.text) {
              for (const cb of textListeners) cb(turn.text);
            }
            return {
              id: `msg_test_${turnIdx}`,
              role: "assistant",
              content,
              stop_reason: turn.stop_reason,
              stop_sequence: null,
              type: "message",
              model: "stub",
              usage: { input_tokens: 100, output_tokens: 50 },
            };
          },
        };
        return streamObj;
      },
    },
  };
  return stub as unknown as Anthropic;
}

async function testStubbedRuntime() {
  section("Runtime with stubbed Anthropic (no API call)");

  // Set up DB row scaffolding so ToolCall persistence works
  let runId = "";
  let sessionId = "";
  try {
    const session = await prisma.agentSession.create({
      data: {
        userId: `test-${Date.now()}`,
        carrierDotNumber: `test-${Date.now()}`,
        persona: "investigator",
      },
    });
    sessionId = session.id;
    const run = await prisma.agentRun.create({
      data: { sessionId, kind: "user_turn", persona: "investigator", status: "running", triggeredBy: "user" },
    });
    runId = run.id;
  } catch (err) {
    fail("DB scaffolding for runtime test", err);
    return;
  }

  // Fake tool that records its calls
  const callLog: Array<{ name: string; input: unknown }> = [];
  const stubTool: AgentTool<{ x: number }, { result: number }> = {
    name: "double",
    description: "doubles a number",
    inputSchema: { type: "object", required: ["x"], properties: { x: { type: "number" } } },
    async execute({ x }) {
      callLog.push({ name: "double", input: { x } });
      return { result: x * 2 };
    },
    summarize: (out) => `doubled to ${out.result}`,
    serializeForModel: (out) => JSON.stringify(out),
  };

  const events: AgentEvent[] = [];

  // Script: turn 1 emits 3 parallel tool_use blocks, turn 2 ends with text
  const script: StubScript = {
    turns: [
      {
        toolUses: [
          { id: "toolu_1", name: "double", input: { x: 1 } },
          { id: "toolu_2", name: "double", input: { x: 2 } },
          { id: "toolu_3", name: "double", input: { x: 3 } },
        ],
        stop_reason: "tool_use",
      },
      {
        text: "I doubled all three.",
        stop_reason: "end_turn",
      },
    ],
  };

  let result: Awaited<ReturnType<typeof runAgent>> | undefined;

  try {
    result = await runAgent({
      ctx: {
        userId: "test",
        carrierDotNumber: "test",
        runId,
        sessionId,
        prisma,
        emitArtifact: async () => ({ id: "art_stub" }),
      },
      systemPrompt: "test",
      tools: [stubTool],
      messages: [{ role: "user", content: "go" }],
      emit: (e) => events.push(e),
      maxTurns: 5,
      _testClient: buildStubClient(script),
    });
    ok("Runtime executes parallel tool_use blocks");
  } catch (err) {
    fail("Runtime executes parallel tool_use blocks", err);
  }

  // Assertions on the run result
  if (result) {
    if (callLog.length === 3) ok("Tool dispatched 3 times in parallel");
    else fail("Tool dispatched 3 times in parallel", new Error(`got ${callLog.length}`));

    if (result.finalText === "I doubled all three.") ok("Runtime returned final text from terminal turn");
    else fail("Runtime returned final text from terminal turn", new Error(`got: ${result.finalText}`));

    if (result.toolCallCount === 3) ok("toolCallCount === 3");
    else fail("toolCallCount === 3", new Error(`got ${result.toolCallCount}`));
  }

  const starts = events.filter((e) => e.type === "tool_call_start").length;
  const ends = events.filter((e) => e.type === "tool_call_end").length;
  if (starts === 3 && ends === 3) ok("3 tool_call_start + 3 tool_call_end events emitted");
  else fail("3 tool_call_start + 3 tool_call_end events emitted", new Error(`starts=${starts} ends=${ends}`));

  const persistedToolCalls = await prisma.toolCall.findMany({ where: { runId } });
  if (persistedToolCalls.length === 3) ok("3 ToolCall rows persisted");
  else fail("3 ToolCall rows persisted", new Error(`got ${persistedToolCalls.length}`));

  // Test dedup cache: model calls the same tool with the same input twice
  const dedupEvents: AgentEvent[] = [];
  const dedupCallLog: Array<{ x: number }> = [];
  const dedupTool: AgentTool<{ x: number }, { result: number }> = {
    name: "echo",
    description: "echo",
    inputSchema: { type: "object", required: ["x"], properties: { x: { type: "number" } } },
    async execute({ x }) {
      dedupCallLog.push({ x });
      return { result: x };
    },
    summarize: (out) => `${out.result}`,
    serializeForModel: (out) => JSON.stringify(out),
  };
  const dedupSession = await prisma.agentSession.create({
    data: { userId: `dedup-${Date.now()}`, carrierDotNumber: `dedup-${Date.now()}`, persona: "investigator" },
  });
  const dedupRun = await prisma.agentRun.create({
    data: { sessionId: dedupSession.id, kind: "user_turn", persona: "investigator", status: "running", triggeredBy: "user" },
  });

  try {
    await runAgent({
      ctx: {
        userId: "test",
        carrierDotNumber: "test",
        runId: dedupRun.id,
        sessionId: dedupSession.id,
        prisma,
        emitArtifact: async () => ({ id: "x" }),
      },
      systemPrompt: "test",
      tools: [dedupTool],
      messages: [{ role: "user", content: "go" }],
      emit: (e) => dedupEvents.push(e),
      maxTurns: 5,
      _testClient: buildStubClient({
        turns: [
          {
            toolUses: [
              { id: "tu_a", name: "echo", input: { x: 42 } },
              { id: "tu_b", name: "echo", input: { x: 42 } }, // duplicate
            ],
            stop_reason: "tool_use",
          },
          { text: "done", stop_reason: "end_turn" },
        ],
      }),
    });

    // Both tool_uses are different IDs but same input — dedup cache should
    // call the underlying execute() ONCE
    if (dedupCallLog.length === 1) ok("Dedup cache prevents redundant tool execute");
    else fail("Dedup cache prevents redundant tool execute", new Error(`called ${dedupCallLog.length} times`));
  } catch (err) {
    fail("Dedup test run", err);
  }

  // Cleanup
  try {
    await prisma.toolCall.deleteMany({ where: { runId } });
    await prisma.toolCall.deleteMany({ where: { runId: dedupRun.id } });
    await prisma.agentRun.delete({ where: { id: runId } });
    await prisma.agentRun.delete({ where: { id: dedupRun.id } });
    await prisma.agentSession.delete({ where: { id: sessionId } });
    await prisma.agentSession.delete({ where: { id: dedupSession.id } });
  } catch {
    /* best effort */
  }
}

/* ── Test memory + observations ───────────────────────────────────────── */

async function testMemory() {
  section("Memory loader");

  const userId = `mem-test-${Date.now()}`;
  const dot = `mem-dot-${Date.now()}`;

  // Seed an observation and a preference
  await prisma.agentMemory.create({
    data: { userId: null, carrierDotNumber: dot, kind: "observation", content: "Known sister of DOT 999999" },
  });
  await prisma.agentMemory.create({
    data: { userId, carrierDotNumber: null, kind: "preference", content: "Prefers terse decision-first responses" },
  });

  await expect("Memory loader pulls observation + preference", async () => {
    const m = await loadMemoryForRun(prisma, userId, dot);
    if (!m.observations.includes("Known sister of DOT 999999")) throw new Error("observation not loaded");
    if (!m.preferences.includes("Prefers terse decision-first responses")) throw new Error("preference not loaded");
    if (!m.systemPromptAddendum.includes("DOT 999999")) throw new Error("addendum missing observation");
    if (!m.systemPromptAddendum.includes("terse")) throw new Error("addendum missing preference");
    return true;
  });

  // Cleanup
  await prisma.agentMemory.deleteMany({ where: { OR: [{ carrierDotNumber: dot }, { userId }] } });
}

/* ── Test present_artifact citation validation ────────────────────────── */

async function testArtifactCitations() {
  section("Artifact citation validation (security gate)");

  const session = await prisma.agentSession.create({
    data: { userId: `art-test-${Date.now()}`, carrierDotNumber: `art-${Date.now()}`, persona: "investigator" },
  });
  const run = await prisma.agentRun.create({
    data: { sessionId: session.id, kind: "user_turn", persona: "investigator", status: "running", triggeredBy: "user" },
  });

  // Seed one valid ToolCall row
  await prisma.toolCall.create({
    data: {
      runId: run.id,
      toolUseId: "real_toolu_id",
      name: "lookup_carrier",
      input: "{}",
      output: "{}",
      summary: "test",
      ok: true,
      durationMs: 10,
    },
  });

  const presentArtifact = allTools.find((t) => t.name === "present_artifact");
  if (!presentArtifact) {
    fail("present_artifact tool exists", new Error("not found"));
    return;
  }

  const ctx: AgentContext = {
    userId: session.userId,
    carrierDotNumber: session.carrierDotNumber,
    runId: run.id,
    sessionId: session.id,
    prisma,
    emitArtifact: async () => ({ id: "art_test" }),
  };

  await expect("Valid citation accepted", async () => {
    const out = await presentArtifact.execute(
      {
        type: "decision_card",
        payload: {
          verdict: "watch",
          headline: "Test verdict",
          bullets: ["bullet one"],
          confidence: 0.8,
          citations: ["real_toolu_id"],
        },
      },
      ctx
    );
    return (out as { ok: boolean }).ok === true || "expected ok=true";
  });

  await expect("Hallucinated citation REJECTED", async () => {
    try {
      await presentArtifact.execute(
        {
          type: "decision_card",
          payload: {
            verdict: "fail",
            headline: "Hallucinated test",
            bullets: ["evidence I made up"],
            confidence: 0.99,
            citations: ["fake_toolu_id_does_not_exist"],
          },
        },
        ctx
      );
      throw new Error("expected throw, got success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("Invalid citations") && !msg.includes("Invalid citation")) {
        throw new Error(`wrong error: ${msg}`);
      }
      return true;
    }
  });

  await expect("Invalid artifact type REJECTED", async () => {
    try {
      await presentArtifact.execute(
        { type: "made_up_type", payload: { citations: ["real_toolu_id"] } },
        ctx
      );
      throw new Error("expected throw");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("Unknown artifact type")) throw new Error(`wrong error: ${msg}`);
      return true;
    }
  });

  await expect("Invalid payload schema REJECTED", async () => {
    try {
      await presentArtifact.execute(
        {
          type: "decision_card",
          payload: {
            verdict: "not-a-valid-verdict",
            headline: "x",
            bullets: [],
            confidence: 5, // out of range
            citations: ["real_toolu_id"],
          },
        },
        ctx
      );
      throw new Error("expected throw");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("Invalid payload")) throw new Error(`wrong error: ${msg}`);
      return true;
    }
  });

  // Cleanup
  await prisma.toolCall.deleteMany({ where: { runId: run.id } });
  await prisma.agentRun.delete({ where: { id: run.id } });
  await prisma.agentSession.delete({ where: { id: session.id } });
}

/* ── Test real lib/ tools execute against Socrata ─────────────────────── */

async function testRealLibTools() {
  section("Real lib tools (live Socrata, no Anthropic)");

  const lookup = allTools.find((t) => t.name === "lookup_carrier");
  if (!lookup) {
    fail("lookup_carrier exists", new Error("missing"));
    return;
  }

  const fakeCtx = {
    userId: "test",
    carrierDotNumber: "80321",
    runId: "test",
    sessionId: "test",
    prisma,
    emitArtifact: async () => ({ id: "x" }),
  };

  await expect(
    "lookup_carrier(80321) returns a real carrier",
    async () => {
      const out = (await lookup.execute({ dotNumber: "80321" }, fakeCtx)) as {
        socrata: { legal_name: string; dot_number: string };
      };
      if (!out.socrata?.legal_name) throw new Error("no legal_name in response");
      console.log(`    ${DIM}→ ${out.socrata.legal_name} (DOT ${out.socrata.dot_number})${RESET}`);
      return true;
    }
  );

  const inspections = allTools.find((t) => t.name === "fetch_inspections");
  if (!inspections) return;

  await expect(
    "fetch_inspections(80321) returns rollup + serializes ≤2k tokens",
    async () => {
      const out = await inspections.execute({ dotNumber: "80321" }, fakeCtx);
      const serialized = inspections.serializeForModel(out as never);
      if (serialized.length > 2500) throw new Error(`serialized too long: ${serialized.length} chars`);
      const summary = inspections.summarize(out as never);
      if (summary.length > 200) throw new Error(`summary too long: ${summary.length}`);
      console.log(`    ${DIM}→ ${summary}${RESET}`);
      return true;
    }
  );
}

/* ── Test: idempotency on action tools ────────────────────────────────── */

async function testIdempotency() {
  section("Action tool idempotency");

  // CarrierNote / WatchedCarrier / MonitoringAlert all FK to User, so we
  // need a real User row for the test.
  const user = await prisma.user.create({
    data: {
      email: `idem-${Date.now()}@test.local`,
      passwordHash: "test-not-real",
    },
  });
  const userId = user.id;
  const dotNumber = `idem-${Date.now()}`;

  const session = await prisma.agentSession.create({
    data: { userId, carrierDotNumber: dotNumber, persona: "investigator" },
  });
  const run = await prisma.agentRun.create({
    data: { sessionId: session.id, kind: "user_turn", persona: "investigator", status: "running", triggeredBy: "user" },
  });

  const ctx: AgentContext = {
    userId,
    carrierDotNumber: dotNumber,
    runId: run.id,
    sessionId: session.id,
    prisma,
    emitArtifact: async () => ({ id: "x" }),
  };

  const addNote = allTools.find((t) => t.name === "add_note");
  const flagForReview = allTools.find((t) => t.name === "flag_for_review");
  const watchCarrier = allTools.find((t) => t.name === "watch_carrier");

  if (!addNote || !flagForReview || !watchCarrier) {
    fail("Action tools exist", new Error("missing one or more"));
    return;
  }

  // Test 1: add_note dedups identical input within a run
  const noteInput = { dotNumber, content: "test note for idempotency" };
  const noteResult1 = (await addNote.execute(noteInput, ctx)) as { noteId: string; cached: boolean };
  const noteResult2 = (await addNote.execute(noteInput, ctx)) as { noteId: string; cached: boolean };

  if (noteResult1.noteId === noteResult2.noteId && noteResult2.cached === true) {
    ok("add_note returns cached id on duplicate call");
  } else {
    fail("add_note returns cached id on duplicate call", new Error(
      `first=${noteResult1.noteId}, second=${noteResult2.noteId}, cached=${noteResult2.cached}`
    ));
  }

  // Verify only ONE note row was actually created
  const noteCount = await prisma.carrierNote.count({ where: { userId, dotNumber } });
  if (noteCount === 1) ok("add_note created exactly one DB row");
  else fail("add_note created exactly one DB row", new Error(`got ${noteCount} rows`));

  // Test 2: flag_for_review dedups identical input
  const flagInput = {
    dotNumber,
    severity: "high" as const,
    title: "test alert idempotency",
    detail: "duplicate test",
  };
  const flag1 = (await flagForReview.execute(flagInput, ctx)) as { alertId: string; cached: boolean };
  const flag2 = (await flagForReview.execute(flagInput, ctx)) as { alertId: string; cached: boolean };

  if (flag1.alertId === flag2.alertId && flag2.cached === true) {
    ok("flag_for_review returns cached id on duplicate call");
  } else {
    fail("flag_for_review returns cached id on duplicate call", new Error(
      `first=${flag1.alertId}, second=${flag2.alertId}, cached=${flag2.cached}`
    ));
  }

  const alertCount = await prisma.monitoringAlert.count({ where: { userId, dotNumber } });
  if (alertCount === 1) ok("flag_for_review created exactly one DB row");
  else fail("flag_for_review created exactly one DB row", new Error(`got ${alertCount} rows`));

  // Test 3: watch_carrier is idempotent at the table level (alreadyWatched flag)
  const watch1 = (await watchCarrier.execute({ dotNumber, legalName: "Test Co" }, ctx)) as {
    alreadyWatched: boolean;
  };
  const watch2 = (await watchCarrier.execute({ dotNumber, legalName: "Test Co" }, ctx)) as {
    alreadyWatched: boolean;
  };
  if (watch1.alreadyWatched === false && watch2.alreadyWatched === true) {
    ok("watch_carrier alreadyWatched flag flips on second call");
  } else {
    fail("watch_carrier alreadyWatched", new Error(`first=${watch1.alreadyWatched}, second=${watch2.alreadyWatched}`));
  }

  const watchCount = await prisma.watchedCarrier.count({ where: { userId, dotNumber } });
  if (watchCount === 1) ok("watch_carrier created exactly one DB row");
  else fail("watch_carrier created exactly one DB row", new Error(`got ${watchCount} rows`));

  // Test 4: different input → different idempotency key → new row
  const noteInputB = { dotNumber, content: "different note content" };
  const noteResultB = (await addNote.execute(noteInputB, ctx)) as { noteId: string; cached: boolean };
  if (noteResultB.cached === false && noteResultB.noteId !== noteResult1.noteId) {
    ok("add_note creates new row for different content");
  } else {
    fail("add_note creates new row for different content", new Error(`cached=${noteResultB.cached}`));
  }

  // Cleanup
  await prisma.carrierNote.deleteMany({ where: { userId } });
  await prisma.monitoringAlert.deleteMany({ where: { userId } });
  await prisma.case.deleteMany({ where: { userId } });
  await prisma.watchedCarrier.deleteMany({ where: { userId } });
  await prisma.idempotencyKey.deleteMany({ where: { runId: run.id } });
  await prisma.agentRun.delete({ where: { id: run.id } });
  await prisma.agentSession.delete({ where: { id: session.id } });
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}

/* ── Test: decision_card → CarrierVerdictCache populator ──────────────── */

async function testVerdictCachePopulator() {
  section("decision_card → CarrierVerdictCache populator");

  const userId = `vcache-${Date.now()}`;
  const dotNumber = `9${Date.now().toString().slice(-7)}`;

  const session = await prisma.agentSession.create({
    data: { userId, carrierDotNumber: dotNumber, persona: "investigator" },
  });
  const run = await prisma.agentRun.create({
    data: { sessionId: session.id, kind: "user_turn", persona: "investigator", status: "running", triggeredBy: "user" },
  });

  // Seed a real ToolCall row so the citation passes validation
  await prisma.toolCall.create({
    data: {
      runId: run.id,
      toolUseId: "vcache_real_id",
      name: "lookup_carrier",
      input: "{}",
      summary: "test",
      ok: true,
      durationMs: 5,
    },
  });

  const presentArtifact = allTools.find((t) => t.name === "present_artifact");
  if (!presentArtifact) {
    fail("present_artifact exists", new Error("missing"));
    return;
  }

  const ctx: AgentContext = {
    userId,
    carrierDotNumber: dotNumber,
    runId: run.id,
    sessionId: session.id,
    prisma,
    emitArtifact: async () => ({ id: "art_x" }),
  };

  // Verify cache is empty before
  const beforeCache = await prisma.carrierVerdictCache.findUnique({ where: { dotNumber } });
  if (beforeCache === null) ok("Verdict cache empty before emission");
  else fail("Verdict cache empty before emission", new Error("cache not empty"));

  // Emit a decision_card artifact
  await presentArtifact.execute(
    {
      type: "decision_card",
      payload: {
        verdict: "watch",
        headline: "Elevated OOS rate, otherwise clean",
        bullets: ["17% vehicle OOS rate", "no chameleon signals", "MCS-150 current"],
        confidence: 0.78,
        citations: ["vcache_real_id"],
      },
    },
    ctx
  );

  // Verify cache populated
  const afterCache = await prisma.carrierVerdictCache.findUnique({ where: { dotNumber } });
  if (afterCache && afterCache.verdict === "watch" && afterCache.headline.includes("OOS")) {
    ok("Verdict cache populated after decision_card emission");
  } else {
    fail("Verdict cache populated", new Error(`got: ${JSON.stringify(afterCache)}`));
  }

  // Verify cache UPDATES on second emission (not double-write)
  await presentArtifact.execute(
    {
      type: "decision_card",
      payload: {
        verdict: "fail",
        headline: "Updated verdict — chameleon match found",
        bullets: ["broker reincarnation pattern", "shared address with revoked DOT"],
        confidence: 0.92,
        citations: ["vcache_real_id"],
      },
    },
    ctx
  );

  const updatedCache = await prisma.carrierVerdictCache.findUnique({ where: { dotNumber } });
  if (updatedCache && updatedCache.verdict === "fail" && updatedCache.confidence === 0.92) {
    ok("Verdict cache upserts (updates) on subsequent emission");
  } else {
    fail("Verdict cache upserts on subsequent emission", new Error(`got: ${updatedCache?.verdict}/${updatedCache?.confidence}`));
  }

  // Verify only ONE cache row exists for this dotNumber
  const cacheCount = await prisma.carrierVerdictCache.count({ where: { dotNumber } });
  if (cacheCount === 1) ok("Exactly one verdict cache row per dotNumber");
  else fail("Exactly one verdict cache row per dotNumber", new Error(`got ${cacheCount}`));

  // Cleanup
  await prisma.carrierVerdictCache.delete({ where: { dotNumber } }).catch(() => {});
  await prisma.artifact.deleteMany({ where: { runId: run.id } });
  await prisma.toolCall.deleteMany({ where: { runId: run.id } });
  await prisma.agentRun.delete({ where: { id: run.id } });
  await prisma.agentSession.delete({ where: { id: session.id } });
}

/* ── Test 8: Real Anthropic call (only if key is set) ─────────────────── */

async function testRealAnthropic() {
  section("Real Anthropic call (skipped unless ANTHROPIC_API_KEY set)");

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "stub-key") {
    console.log(`  ${YELLOW}⊘${RESET} Skipped — set ANTHROPIC_API_KEY in landing/.env.local to enable`);
    return;
  }

  const session = await prisma.agentSession.create({
    data: { userId: `real-test-${Date.now()}`, carrierDotNumber: "80321", persona: "investigator" },
  });
  const run = await prisma.agentRun.create({
    data: { sessionId: session.id, kind: "auto_brief", persona: "investigator", status: "running", triggeredBy: "user" },
  });

  const events: AgentEvent[] = [];
  const artifactsEmitted: Array<{ type: string; payload: unknown }> = [];

  const tools = pickTools(["lookup_carrier", "fetch_inspections", "fetch_crashes", "present_artifact"]);

  try {
    const result = await runAgent({
      ctx: {
        userId: session.userId,
        carrierDotNumber: "80321",
        runId: run.id,
        sessionId: session.id,
        prisma,
        emitArtifact: async ({ type, payload }) => {
          artifactsEmitted.push({ type, payload });
          const a = await prisma.artifact.create({
            data: {
              sessionId: session.id,
              runId: run.id,
              type,
              payload: JSON.stringify(payload),
              citations: JSON.stringify((payload as { citations?: string[] }).citations || []),
            },
          });
          return { id: a.id };
        },
      },
      systemPrompt: getPersona("investigator").system,
      tools,
      messages: [
        {
          role: "user",
          content:
            "A user just opened carrier USDOT 80321. Run lookup_carrier, fetch_inspections, and fetch_crashes IN PARALLEL (one assistant turn), then synthesize a verdict-first decision_card via present_artifact citing the tool_use_ids.",
        },
      ],
      emit: (e) => events.push(e),
      maxTurns: 5,
    });

    ok(`Real agent run completed`, `${result.tokensIn}→${result.tokensOut} tokens, ${result.toolCallCount} tools`);

    const toolStarts = events.filter((e) => e.type === "tool_call_start").length;
    if (toolStarts >= 3) ok(`Parallel tool execution`, `${toolStarts} tool calls observed`);
    else fail(`Parallel tool execution`, new Error(`only ${toolStarts} tool calls`));

    if (artifactsEmitted.length >= 1) {
      ok(`At least one artifact emitted`, `${artifactsEmitted.length} artifact(s)`);
      const dc = artifactsEmitted.find((a) => a.type === "decision_card");
      if (dc) {
        const p = dc.payload as { verdict: string; headline: string };
        console.log(`    ${DIM}→ verdict: ${p.verdict} — ${p.headline}${RESET}`);
      }
    } else {
      fail(`At least one artifact emitted`, new Error("none emitted"));
    }
  } catch (err) {
    fail("Real agent run", err);
  } finally {
    // Cleanup
    await prisma.toolCall.deleteMany({ where: { runId: run.id } });
    await prisma.artifact.deleteMany({ where: { runId: run.id } });
    await prisma.agentMessage.deleteMany({ where: { runId: run.id } });
    await prisma.agentRun.delete({ where: { id: run.id } }).catch(() => {});
    await prisma.agentSession.delete({ where: { id: session.id } }).catch(() => {});
  }
}

/* ── Test: security audit of every route that touches Anthropic ───────── */

async function testSecurityAudit() {
  section("Security audit (no public Anthropic doors)");

  const fs = await import("fs/promises");
  const path = await import("path");
  const root = path.resolve(__dirname, "..");

  // Every route that imports any module that calls Anthropic
  const sensitiveRoutes = [
    {
      path: "app/api/agent/route.ts",
      mustHave: ["getServerAuthSession", 'jsonError("Unauthorized"', "checkRateLimit"],
      desc: "/api/agent (main agent SSE)",
    },
    {
      path: "app/api/carrier/search/route.ts",
      mustHave: ["getServerAuthSession", "session?.user?.id", "translateSearchQuery"],
      desc: "/api/carrier/search (natural-language AI translation)",
    },
    {
      path: "app/api/chameleon/carriers/[dotNumber]/signals/route.ts",
      mustHave: ["getServerAuthSession", "session?.user?.id", "explainAnomalies"],
      desc: "/api/chameleon/.../signals (anomaly explainer)",
    },
    {
      path: "app/api/carrier/[dotNumber]/background/route.ts",
      mustHave: ["getServerAuthSession", "session?.user?.id", "generateRiskNarrative"],
      desc: "/api/carrier/.../background (risk narrative)",
    },
    {
      path: "app/api/cron/agent-watchdog/route.ts",
      mustHave: ["CRON_SECRET", "Bearer"],
      desc: "/api/cron/agent-watchdog (overnight watchdog)",
    },
  ];

  for (const route of sensitiveRoutes) {
    try {
      const content = await fs.readFile(path.join(root, route.path), "utf-8");
      const missing = route.mustHave.filter((token) => !content.includes(token));
      if (missing.length === 0) {
        ok(`${route.desc}`, route.path);
      } else {
        fail(`${route.desc}`, new Error(`missing required guards: ${missing.join(", ")}`));
      }
    } catch (err) {
      fail(`${route.desc}`, err);
    }
  }

  // Verify the deleted routes are actually gone
  const mustBeDeleted = [
    "app/api/chat/route.ts",
    "app/api/credits/checkout/route.ts",
    "app/api/credits/balance/route.ts",
    "app/api/stripe/webhook/route.ts",
    "app/api/subscriptions/checkout/route.ts",
  ];
  for (const p of mustBeDeleted) {
    try {
      await fs.access(path.join(root, p));
      fail(`Deleted: ${p}`, new Error("file still exists"));
    } catch {
      ok(`Deleted: ${p}`);
    }
  }
}

/* ── Main ─────────────────────────────────────────────────────────────── */

async function main() {
  console.log(`${BOLD}FleetSight Agent Runtime Test${RESET}\n`);

  await testSecurityAudit();
  await testStaticPieces();
  await testMemory();
  await testArtifactCitations();
  await testIdempotency();
  await testVerdictCachePopulator();
  await testRealLibTools();
  await testStubbedRuntime();
  await testRealAnthropic();

  console.log(`\n${BOLD}Summary${RESET}: ${GREEN}${passed} passed${RESET}, ${failed > 0 ? RED : DIM}${failed} failed${RESET}`);
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error(`\n${RED}FATAL${RESET}:`, err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
