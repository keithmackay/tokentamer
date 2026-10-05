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
  const result = scan(projectDir, ...args);
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
