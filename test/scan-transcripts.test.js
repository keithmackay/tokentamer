// ABOUTME: Fixture-based tests for scripts/scan-transcripts.js — runs the real
// ABOUTME: script against a synthetic ~/.claude/projects tree via a temp HOME.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(here, "..", "scripts", "scan-transcripts.js");
const projectDir = "/Users/test/My Projects/my_app";
const sessionId = "fixture-session";

function makeHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "tokentamer-test-"));
  const dir = path.join(home, ".claude", "projects", "-Users-test-My-Projects-my-app");
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(path.join(here, "fixtures", "session.jsonl"), path.join(dir, `${sessionId}.jsonl`));

  const richDir = path.join(home, ".claude", "projects", "-Users-test-rich");
  fs.mkdirSync(richDir, { recursive: true });
  fs.copyFileSync(path.join(here, "fixtures", "rich.jsonl"), path.join(richDir, "rich-session.jsonl"));
  fs.cpSync(path.join(here, "fixtures", "rich-subagents"), path.join(richDir, "rich-session", "subagents"), { recursive: true });

  const realRoot = path.join(home, ".claude", "projects");
  const real = path.join(realRoot, "-Users-test-real");
  fs.mkdirSync(real, { recursive: true });
  fs.copyFileSync(path.join(here, "fixtures", "realistic.jsonl"), path.join(real, "realistic-session.jsonl"));
  fs.cpSync(path.join(here, "fixtures", "realistic-subagents"), path.join(real, "realistic-session", "subagents"), { recursive: true });
  for (const [dir, id] of [["-Users-test-real--worktrees-feat", "wt-feat"], ["-Users-test-real--claude-worktrees-x", "wt-x"], ["-Users-test-real-other", "decoy"]]) {
    fs.mkdirSync(path.join(realRoot, dir), { recursive: true });
    fs.copyFileSync(path.join(here, "fixtures", "worktree.jsonl"), path.join(realRoot, dir, `${id}.jsonl`));
  }
  return home;
}

const home = makeHome();

function scan(...args) {
  return spawnSync(process.execPath, [script, ...args], {
    env: { ...process.env, HOME: home },
    encoding: "utf-8",
  });
}

function scanSession(...args) {
  return scanProject(projectDir, ...args);
}

function scanProject(dir, ...args) {
  const result = scan(dir, ...args);
  assert.equal(result.status, 0, result.stderr);
  const lines = result.stdout.trim().split("\n");
  assert.equal(lines.length, 1, "expected exactly one NDJSON line per session");
  return JSON.parse(lines[0]);
}

test("finds transcripts for paths with spaces and underscores", () => {
  assert.equal(scanSession().sessionId, sessionId);
});

test("keeps only human-typed turns", () => {
  const turns = scanSession().turns.map(t => t.content);
  assert.deepEqual(turns, ["fix the bug", "also check b.js"]);
});

test("records slash commands, Skill tool calls and injected skill bodies", () => {
  const s = scanSession();
  assert.deepEqual(s.skillInvocations.map(i => [i.skill, i.source]), [["improve-this", "slash"], ["plsfix", "tool"]]);
  assert.equal(s.skillLoads.length, 1);
  assert.equal(s.skillLoads[0].skill, "improve-this");
  assert.ok(s.skillLoads[0].length > 0);
});

test("sums token usage once per message id", () => {
  const s = scanSession();
  assert.deepEqual(s.tokens, { input: 11, cacheCreation: 100, cacheRead: 3000, output: 12 });
  assert.deepEqual(s.tokensByModel["claude-test"], s.tokens);
  assert.deepEqual(s.modelsUsed, { "claude-test": 2 });
});

test("counts tool calls and read targets", () => {
  const s = scanSession();
  assert.equal(s.toolCalls.Read, 2);
  assert.deepEqual(s.readTargets, { "Read:/p/a.js": 2, "WebFetch:https://example.com": 1 });
  assert.deepEqual(Object.keys(s.mcpToolCalls), ["mcp__srv__do"]);
});

test("--full keeps NDJSON and untruncated text", () => {
  const s = scanSession("--full", "--session", sessionId);
  assert.equal(s.turns.length, 2);
});

test("flags may precede the project dir", () => {
  const result = scan("--full", projectDir);
  assert.equal(result.status, 0, result.stderr);
});

test("rejects bad arguments", () => {
  assert.equal(scan(projectDir, "--session").status, 1);
  assert.equal(scan("relative/path").status, 1);
  assert.equal(scan().status, 1);
  assert.equal(scan(projectDir, "--bogus").status, 1);
});

test("attributes each turn to the model that answered it", () => {
  const s = scanProject("/Users/test/rich");
  assert.deepEqual(s.turns.map(t => [t.content, t.model]), [["first", "model-big"], ["second", "model-small"], ["third", null]]);
});

test("scans subagent transcripts with their meta sidecar", () => {
  const s = scanProject("/Users/test/rich");
  assert.deepEqual(s.subagents.map(a => [a.agentId, a.agentType, a.description, a.model, a.promptLength]), [
    ["abc", "explorer", "Explore the repo", "haiku", "do the thing brief".length],
    ["def", null, null, null, "tiny".length],
  ]);
  assert.deepEqual(s.subagents[0].tokens, { input: 4, cacheCreation: 0, cacheRead: 0, output: 40 });
  assert.deepEqual(s.subagents[0].readTargets, { "Read:/p/a.js": 1 });
  assert.deepEqual(s.subagentTokens, { input: 5, cacheCreation: 0, cacheRead: 0, output: 42 });
  assert.deepEqual(s.tokens, { input: 2, cacheCreation: 0, cacheRead: 0, output: 2 }, "main-thread tokens exclude subagents");
});

test("reports connected MCP tools per server and how many were used", () => {
  const s = scanProject("/Users/test/rich");
  assert.deepEqual(s.mcpToolUsage, { a: { available: 2, used: 1 } });
  assert.deepEqual(s.mcpServers, ["a server"]);
});

test("reports the always-loaded skill listing size", () => {
  const s = scanProject("/Users/test/rich");
  assert.deepEqual(s.skillListing, { count: 3, chars: "- a: one\n- b: two\n- c: three".length });
});

test("sessions without subagents or attachments get empty defaults", () => {
  const s = scanSession();
  assert.deepEqual(s.subagents, []);
  assert.deepEqual(s.mcpToolUsage, { srv: { available: 1, used: 1 } }, "called tools count even without a tool listing");
  assert.equal(s.skillListing, null);
});

function scanAll(dir, ...args) {
  const result = scan(dir, ...args);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim().split("\n").map(line => JSON.parse(line));
}

function realisticSession() {
  return scanAll("/Users/test/real").find(s => s.sessionId === "realistic-session");
}

test("drops compaction summaries, local-command output and interrupts from turns", () => {
  const s = realisticSession();
  assert.deepEqual(s.turns.map(t => t.content), ["/model sonnet", "hello there", "! ls", "after compaction"]);
  assert.equal(s.compactions.length, 1);
  assert.equal(s.compactions[0].timestamp, "2026-03-01T00:00:06.000Z");
  assert.ok(s.compactions[0].length > 50);
  assert.equal(s.interruptions, 2);
});

test("ignores <synthetic> placeholder replies for model attribution", () => {
  const s = realisticSession();
  assert.deepEqual(s.turns.map(t => t.model), ["model-real", "model-real", "model-real", "model-real"]);
  assert.deepEqual(s.modelsUsed, { "model-real": 2 });
  assert.deepEqual(Object.keys(s.tokensByModel), ["model-real"]);
});

test("counts subagent MCP calls and skills", () => {
  const s = realisticSession();
  assert.deepEqual(Object.keys(s.subagents[0].mcpToolCalls), ["mcp__srv__lookup"]);
  assert.deepEqual(s.subagents[0].skillInvocations.map(i => i.skill), ["plsfix"]);
  assert.deepEqual(s.mcpToolUsage, { srv: { available: 2, used: 1 } });
});

test("includes nested worktree sessions but not similarly named projects", () => {
  const sessions = scanAll("/Users/test/real");
  const byId = Object.fromEntries(sessions.map(s => [s.sessionId, s.worktree]));
  assert.deepEqual(byId, { "realistic-session": null, "wt-feat": "feat", "wt-x": "x" });
});
