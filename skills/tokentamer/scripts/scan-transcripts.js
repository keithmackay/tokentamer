#!/usr/bin/env node
// Scans a project's Claude Code transcript JSONL files and emits one JSON
// object per session (newline-delimited) combining user prompts, token usage,
// tool/MCP usage, read targets, model switches, and skill loads — the raw
// material for a token-efficiency review. NDJSON output means a caller can
// page through or grep by session instead of loading one giant blob into
// context.
//
// Usage: node scan-transcripts.js <absoluteProjectDir> [--full] [--session <id>]
//   projectDir must be an absolute path — the transcript directory is derived
//   from it, and a mismatched/ambient cwd will silently look in the wrong
//   place. Without --full, prompt content is truncated to 400 chars per turn.
//   --session <id> restricts output to a single session (matches the JSONL
//   filename, i.e. the sessionId). Output is always one line per session.

import fs from "fs";
import path from "path";
import os from "os";

const USAGE = "Usage: node scan-transcripts.js <absoluteProjectDir> [--full] [--session <id>]";
const READ_TOOLS = new Set(["Read", "NotebookRead", "WebFetch"]);
const SKILL_BODY_PREFIX = /^Base directory for this skill:\s*(\S+)/;

// Claude Code names a project's transcript folder by replacing every
// non-alphanumeric character of its absolute path with "-".
function getProjectTranscriptDir(projectDir) {
  const encoded = projectDir.replace(/[^a-zA-Z0-9]/g, "-");
  return path.join(os.homedir(), ".claude", "projects", encoded);
}

function stripSystemTags(content) {
  return content
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "")
    .replace(/<command-message>[\s\S]*?<\/command-message>/g, "")
    .replace(/<command-name>[\s\S]*?<\/command-name>/g, "");
}

// Array.from() iterates by Unicode codepoint, unlike String.slice() which
// operates on UTF-16 code units and can split a surrogate pair in half.
function truncateSafely(str, maxChars) {
  const chars = Array.from(str);
  return chars.length <= maxChars ? str : chars.slice(0, maxChars).join("");
}

function userText(rawContent) {
  if (typeof rawContent === "string") return rawContent;
  if (Array.isArray(rawContent)) {
    return rawContent
      .filter(block => block.type === "text")
      .map(block => block.text || "")
      .join("\n");
  }
  return null;
}

function usageError(message) {
  if (message) console.error(message);
  console.error(USAGE);
  console.error("projectDir must be an absolute path — it is NOT inferred from cwd.");
  process.exit(1);
}

function parseArgs(argv) {
  const args = { projectDir: null, full: false, session: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--full") {
      args.full = true;
    } else if (arg === "--session") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) usageError("--session requires a session id.");
      args.session = value;
      i++;
    } else if (arg.startsWith("--")) {
      usageError(`Unknown flag: ${arg}`);
    } else if (!args.projectDir) {
      args.projectDir = arg;
    } else {
      usageError(`Unexpected argument: ${arg}`);
    }
  }
  if (!args.projectDir) usageError();
  if (!path.isAbsolute(args.projectDir)) {
    usageError(`projectDir must be an absolute path, got: ${args.projectDir}`);
  }
  return args;
}

function addUsage(totals, usage) {
  totals.input += usage.input_tokens || 0;
  totals.cacheCreation += usage.cache_creation_input_tokens || 0;
  totals.cacheRead += usage.cache_read_input_tokens || 0;
  totals.output += usage.output_tokens || 0;
}

const emptyTokens = () => ({ input: 0, cacheCreation: 0, cacheRead: 0, output: 0 });

const { projectDir, full, session: sessionFilter } = parseArgs(process.argv.slice(2));

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
    tokens: emptyTokens(),
    tokensByModel: {},
    modelsUsed: {},
    toolCalls: {},
    mcpToolCalls: {},
    readTargets: {},
    skillInvocations: [],
    skillLoads: [],
    firstTimestamp: null,
    lastTimestamp: null,
  };
  // Claude Code writes one assistant entry per content block, each repeating
  // the same message.id and usage — count each message once.
  const seenMessageIds = new Set();

  for (const line of lines) {
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }

    const ts = entry.timestamp;
    if (ts) {
      if (!session.firstTimestamp) session.firstTimestamp = ts;
      session.lastTimestamp = ts;
    }

    // Sidechain user entries are prompts from the main agent to a subagent,
    // not something the human typed.
    if (entry.type === "user" && entry.message && !entry.isSidechain) {
      const text = userText(entry.message.content);
      if (!text) continue;

      // Injected skill bodies arrive as meta user entries; record them as
      // skill loads (with their size) rather than as user prompts.
      if (entry.isMeta) {
        const match = text.match(SKILL_BODY_PREFIX);
        if (match) {
          session.skillLoads.push({ skill: path.basename(match[1]), timestamp: ts, length: text.length });
        }
        continue;
      }

      const command = text.match(/<command-name>\/?([^<\s]+)<\/command-name>/);
      if (command) {
        session.skillInvocations.push({ skill: command[1], timestamp: ts, source: "slash" });
      }

      const cleaned = stripSystemTags(text).trim();
      if (cleaned) {
        session.turns.push({
          role: "user",
          timestamp: ts,
          length: cleaned.length,
          content: full ? cleaned : truncateSafely(cleaned, 400),
        });
      }
    }

    if (entry.type === "assistant" && entry.message) {
      const message = entry.message;
      const isNewMessage = !message.id || !seenMessageIds.has(message.id);
      if (message.id) seenMessageIds.add(message.id);

      if (isNewMessage) {
        const model = message.model;
        if (model) session.modelsUsed[model] = (session.modelsUsed[model] || 0) + 1;
        if (message.usage) {
          addUsage(session.tokens, message.usage);
          if (model) {
            if (!session.tokensByModel[model]) session.tokensByModel[model] = emptyTokens();
            addUsage(session.tokensByModel[model], message.usage);
          }
        }
      }

      const content = message.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type !== "tool_use") continue;
          const name = block.name || "unknown";
          const input = block.input || {};
          session.toolCalls[name] = (session.toolCalls[name] || 0) + 1;
          if (name.startsWith("mcp__")) {
            if (!session.mcpToolCalls[name]) session.mcpToolCalls[name] = [];
            session.mcpToolCalls[name].push(ts);
          }
          if (name === "Skill" && input.skill) {
            session.skillInvocations.push({ skill: input.skill, timestamp: ts, source: "tool" });
          }
          const target = input.file_path || input.notebook_path || input.url;
          if (READ_TOOLS.has(name) && target) {
            const key = `${name}:${target}`;
            session.readTargets[key] = (session.readTargets[key] || 0) + 1;
          }
        }
      }
    }
  }

  if (session.turns.length > 0 || Object.keys(session.toolCalls).length > 0) {
    console.log(JSON.stringify(session));
  }
}
