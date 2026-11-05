#!/usr/bin/env node
// Scans a project's Claude Code transcript JSONL files and emits one JSON
// object per session (newline-delimited) combining user prompts (each tagged
// with the model that answered it), token usage, tool/MCP usage, connected
// MCP tools, read targets, skill loads and listing size, and per-subagent
// stats from the session's subagent transcripts — the raw
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

function readJsonl(filePath) {
  const entries = [];
  for (const line of fs.readFileSync(filePath, "utf-8").split("\n")) {
    if (!line.trim()) continue;
    try { entries.push(JSON.parse(line)); } catch { /* skip malformed lines */ }
  }
  return entries;
}

function readMeta(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, "utf-8")); } catch { return {}; }
}

// Scans one transcript file. The main session file yields human turns; a
// subagent file (subagent: true) yields only the length of its brief, since
// its "user" entries are the parent agent's prompt and tool results.
function scanFile(filePath, { subagent = false } = {}) {
  const stats = {
    turns: [],
    promptLength: null,
    tokens: emptyTokens(),
    tokensByModel: {},
    modelsUsed: {},
    toolCalls: {},
    mcpToolCalls: {},
    readTargets: {},
    skillInvocations: [],
    skillLoads: [],
    toolsAvailable: new Set(),
    mcpServers: new Set(),
    skillListing: null,
    firstTimestamp: null,
    lastTimestamp: null,
  };
  // Claude Code writes one assistant entry per content block, each repeating
  // the same message.id and usage — count each message once.
  const seenMessageIds = new Set();
  // Turns still waiting for the model of the reply that answers them.
  let unanswered = [];

  for (const entry of readJsonl(filePath)) {
    const ts = entry.timestamp;
    if (ts) {
      if (!stats.firstTimestamp) stats.firstTimestamp = ts;
      stats.lastTimestamp = ts;
    }

    const attachment = entry.type === "attachment" && entry.attachment;
    if (attachment) {
      if (attachment.type === "deferred_tools_delta") {
        for (const name of attachment.addedNames || []) stats.toolsAvailable.add(name);
        for (const name of attachment.removedNames || []) stats.toolsAvailable.delete(name);
      } else if (attachment.type === "deferred_tools_record") {
        for (const tool of attachment.entries || []) if (tool && tool.name) stats.toolsAvailable.add(tool.name);
      } else if (attachment.type === "mcp_instructions_delta") {
        for (const name of attachment.addedNames || []) stats.mcpServers.add(name);
      } else if (attachment.type === "skill_listing") {
        const chars = (attachment.content || "").length;
        if (!stats.skillListing || chars > stats.skillListing.chars) {
          stats.skillListing = { count: attachment.skillCount ?? null, chars };
        }
      }
      continue;
    }

    if (subagent && entry.type === "user" && entry.message && stats.promptLength === null) {
      const brief = userText(entry.message.content);
      if (brief) stats.promptLength = brief.length;
      continue;
    }

    // Sidechain user entries are prompts from the main agent to a subagent,
    // not something the human typed.
    if (!subagent && entry.type === "user" && entry.message && !entry.isSidechain) {
      const text = userText(entry.message.content);
      if (!text) continue;

      // Injected skill bodies arrive as meta user entries; record them as
      // skill loads (with their size) rather than as user prompts.
      if (entry.isMeta) {
        const match = text.match(SKILL_BODY_PREFIX);
        if (match) {
          stats.skillLoads.push({ skill: path.basename(match[1]), timestamp: ts, length: text.length });
        }
        continue;
      }

      const command = text.match(/<command-name>\/?([^<\s]+)<\/command-name>/);
      if (command) {
        stats.skillInvocations.push({ skill: command[1], timestamp: ts, source: "slash" });
      }

      const cleaned = stripSystemTags(text).trim();
      if (cleaned) {
        const turn = {
          role: "user",
          timestamp: ts,
          length: cleaned.length,
          model: null,
          content: full ? cleaned : truncateSafely(cleaned, 400),
        };
        stats.turns.push(turn);
        unanswered.push(turn);
      }
    }

    if (entry.type === "assistant" && entry.message) {
      const message = entry.message;
      const isNewMessage = !message.id || !seenMessageIds.has(message.id);
      if (message.id) seenMessageIds.add(message.id);

      if (isNewMessage) {
        const model = message.model;
        if (model) {
          stats.modelsUsed[model] = (stats.modelsUsed[model] || 0) + 1;
          for (const turn of unanswered) turn.model = model;
          unanswered = [];
        }
        if (message.usage) {
          addUsage(stats.tokens, message.usage);
          if (model) {
            if (!stats.tokensByModel[model]) stats.tokensByModel[model] = emptyTokens();
            addUsage(stats.tokensByModel[model], message.usage);
          }
        }
      }

      const content = message.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type !== "tool_use") continue;
          const name = block.name || "unknown";
          const input = block.input || {};
          stats.toolCalls[name] = (stats.toolCalls[name] || 0) + 1;
          if (name.startsWith("mcp__")) {
            if (!stats.mcpToolCalls[name]) stats.mcpToolCalls[name] = [];
            stats.mcpToolCalls[name].push(ts);
          }
          if (name === "Skill" && input.skill) {
            stats.skillInvocations.push({ skill: input.skill, timestamp: ts, source: "tool" });
          }
          const target = input.file_path || input.notebook_path || input.url;
          if (READ_TOOLS.has(name) && target) {
            const key = `${name}:${target}`;
            stats.readTargets[key] = (stats.readTargets[key] || 0) + 1;
          }
        }
      }
    }
  }
  return stats;
}

// Groups connected and called MCP tools by server ("mcp__<server>__<tool>")
// into { server: { available, used } } — a server with many tools and no
// calls is paying schema tokens for nothing.
function summarizeMcpUsage(toolsAvailable, mcpToolCalls) {
  const usage = {};
  const names = new Set([...toolsAvailable, ...Object.keys(mcpToolCalls)]);
  for (const name of names) {
    const match = name.match(/^mcp__(.+?)__/);
    if (!match) continue;
    const server = match[1];
    if (!usage[server]) usage[server] = { available: 0, used: 0 };
    usage[server].available++;
    if (mcpToolCalls[name]) usage[server].used++;
  }
  return usage;
}

// Subagent transcripts live beside the session file, in
// <sessionId>/subagents/agent-<id>.jsonl with an optional .meta.json sidecar.
function scanSubagents(sessionDir) {
  const dir = path.join(sessionDir, "subagents");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith(".jsonl"))
    .map(f => {
      const base = f.replace(/\.jsonl$/, "");
      const stats = scanFile(path.join(dir, f), { subagent: true });
      const meta = readMeta(path.join(dir, `${base}.meta.json`));
      return {
        agentId: base.replace(/^agent-/, ""),
        agentType: meta.agentType ?? null,
        description: meta.description ?? null,
        model: meta.model ?? null,
        promptLength: stats.promptLength,
        tokens: stats.tokens,
        tokensByModel: stats.tokensByModel,
        toolCalls: stats.toolCalls,
        readTargets: stats.readTargets,
        firstTimestamp: stats.firstTimestamp,
        lastTimestamp: stats.lastTimestamp,
      };
    })
    .sort((a, b) => String(a.firstTimestamp).localeCompare(String(b.firstTimestamp)));
}

for (const file of jsonlFiles) {
  const sessionId = file.replace(/\.jsonl$/, "");
  const stats = scanFile(path.join(transcriptDir, file));
  const subagents = scanSubagents(path.join(transcriptDir, sessionId));

  const subagentTokens = emptyTokens();
  for (const agent of subagents) {
    for (const key of Object.keys(subagentTokens)) subagentTokens[key] += agent.tokens[key];
  }
  const mcpToolUsage = summarizeMcpUsage(stats.toolsAvailable, stats.mcpToolCalls);

  const session = {
    sessionId,
    turns: stats.turns,
    tokens: stats.tokens,
    tokensByModel: stats.tokensByModel,
    subagentTokens,
    modelsUsed: stats.modelsUsed,
    toolCalls: stats.toolCalls,
    mcpToolCalls: stats.mcpToolCalls,
    mcpToolUsage,
    mcpServers: [...stats.mcpServers].sort(),
    readTargets: stats.readTargets,
    skillInvocations: stats.skillInvocations,
    skillLoads: stats.skillLoads,
    skillListing: stats.skillListing,
    subagents,
    firstTimestamp: stats.firstTimestamp,
    lastTimestamp: stats.lastTimestamp,
  };

  if (session.turns.length > 0 || Object.keys(session.toolCalls).length > 0) {
    console.log(JSON.stringify(session));
  }
}
