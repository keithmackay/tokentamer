#!/usr/bin/env node
// Scans a project's Claude Code transcript JSONL files and emits one JSON
// object per session (newline-delimited) combining user prompts, tool/MCP
// usage, model switches, and skill invocations — the raw material for a
// token-efficiency review. NDJSON output means a caller can page through or
// grep by session instead of loading one giant blob into context.
//
// Usage: node scan-transcripts.js <projectDir> [--full] [--session <id>]
//   projectDir must be an absolute path — the transcript directory is derived
//   from it, and a mismatched/ambient cwd will silently look in the wrong
//   place. Without --full, prompt content is truncated to 400 chars per turn.
//   --session <id> restricts output to a single session (matches the JSONL
//   filename, i.e. the sessionId).

import fs from "fs";
import path from "path";
import os from "os";

function getProjectTranscriptDir(projectDir) {
  const encoded = projectDir.replace(/[/.]/g, "-");
  return path.join(os.homedir(), ".claude", "projects", encoded);
}

function stripSystemTags(content) {
  return content
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "")
    .replace(/<command-message>[\s\S]*?<\/command-message>/g, "")
    .replace(/<command-name>[\s\S]*?<\/command-name>/g, "");
}

const rawProjectDir = process.argv[2] && !process.argv[2].startsWith("--")
  ? process.argv[2]
  : null;
const full = process.argv.includes("--full");
const sessionFilterIdx = process.argv.indexOf("--session");
const sessionFilter = sessionFilterIdx !== -1 ? process.argv[sessionFilterIdx + 1] : null;

if (!rawProjectDir) {
  console.error("Usage: node scan-transcripts.js <absoluteProjectDir> [--full] [--session <id>]");
  console.error("projectDir must be an absolute path — it is NOT inferred from cwd.");
  process.exit(1);
}
if (!path.isAbsolute(rawProjectDir)) {
  console.error(`projectDir must be an absolute path, got: ${rawProjectDir}`);
  process.exit(1);
}
const projectDir = rawProjectDir;

const transcriptDir = getProjectTranscriptDir(projectDir);
if (!fs.existsSync(transcriptDir)) {
  console.error(`No Claude Code transcripts found for ${projectDir} (looked in ${transcriptDir})`);
  process.exit(1);
}

let jsonlFiles = fs.readdirSync(transcriptDir).filter(f => f.endsWith(".jsonl"));
if (sessionFilter) {
  jsonlFiles = jsonlFiles.filter(f => f === `${sessionFilter}.jsonl`);
}
if (jsonlFiles.length === 0) {
  console.error("No session transcripts found.");
  process.exit(1);
}

for (const file of jsonlFiles) {
  const sessionId = file.replace(/\.jsonl$/, "");
  const lines = fs.readFileSync(path.join(transcriptDir, file), "utf-8").split("\n").filter(l => l.trim());

  const session = {
    sessionId,
    turns: [],
    modelsUsed: {},
    toolCalls: {},
    mcpToolCalls: {},
    skillInvocations: [],
    firstTimestamp: null,
    lastTimestamp: null,
  };

  for (const line of lines) {
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }

    const ts = entry.timestamp;
    if (ts) {
      if (!session.firstTimestamp) session.firstTimestamp = ts;
      session.lastTimestamp = ts;
    }

    if (entry.type === "user" && entry.message && typeof entry.message.content === "string") {
      const cleaned = stripSystemTags(entry.message.content).trim();
      if (cleaned) {
        session.turns.push({
          role: "user",
          timestamp: ts,
          length: cleaned.length,
          content: full ? cleaned : cleaned.slice(0, 400),
        });
      }
    }

    if (entry.type === "assistant" && entry.message) {
      const model = entry.message.model;
      if (model) session.modelsUsed[model] = (session.modelsUsed[model] || 0) + 1;

      const content = entry.message.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === "tool_use") {
            const name = block.name || "unknown";
            session.toolCalls[name] = (session.toolCalls[name] || 0) + 1;
            if (name.startsWith("mcp__")) {
              if (!session.mcpToolCalls[name]) session.mcpToolCalls[name] = [];
              session.mcpToolCalls[name].push(ts);
            }
            if (name === "Skill" && block.input && block.input.skill) {
              session.skillInvocations.push({ skill: block.input.skill, timestamp: ts });
            }
          }
        }
      }
    }
  }

  if (session.turns.length > 0 || Object.keys(session.toolCalls).length > 0) {
    console.log(JSON.stringify(session, null, full ? 2 : 0));
  }
}
