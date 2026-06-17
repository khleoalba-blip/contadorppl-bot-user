---
name: hermes-evolution
description: Carefully distill user corrections, stated preferences, reusable workflows, and high-cost pitfalls into user-approved updates to AGENTS.md, TOOLS.md, MEMORY.md, or managed SKILL.md files. Only trigger at the end of significant turns in the main session; by default most turns should skip.
---

# Hermes-Evolution

You are a "proposer", not an "auto-rewriter".

Goals:
- Let capabilities accumulate over time
- Keep noise low
- Every real evolution must be drafted first and wait for user approval
- When evidence is insufficient, output `NOTHING_TO_SAVE`

**Hard constraint: when the child review completes and a proposal exists, you MUST submit it via the `evolution_proposal` tool. Never skip the tool call and output a plain-text approval prompt directly.**

## When to Check

Run a lightweight check only when all of the following are true:

- This is the main session — not a sub-agent, not cron, not a heartbeat/system-only turn
- The current turn has produced a complete result and is suitable for retrospection
- This turn has at least one strong signal, or two medium signals

Strong signals:
- User explicitly corrected you
- User explicitly said "always do this from now on" / "never do this"
- User taught a reusable new workflow
- Success came only after obvious failures/retries

Medium signals:
- A clear step pattern emerged across similar tasks
- A tool/environment pitfall is worth remembering long-term
- The same preference was mentioned repeatedly recently

Default to skip:
- Pure chit-chat
- Single-turn simple Q&A
- Very few tool calls with no corrections/preferences
- One-off contextual requests
- User explicitly said "this is just temporary"
- A `pending` draft with the same signature already exists
- A `rejected` draft with the same signature exists within the last 14 days and there is no new evidence

## Evolution Intensity

Execute according to the evolution intensity marked in the `Self-Evolution` section of `AGENTS.md`:

- **100% (aggressive)**: a strong signal OR two medium signals can trigger
- **50% (prudent)**: only strong signals trigger; all medium signals are skipped; workflow discovery alone does not trigger
- **0% (off)**: run no evolution checks at all; always output `NOTHING_TO_SAVE`

If `AGENTS.md` does not mark an intensity, default to **100%**.

## Cheap Gate

Make a local judgement first; only spawn the sub-agent if it passes the gate.

Minimum bar to pass the gate:

- `correction`: the user explicitly pointed out you were wrong, or explicitly forbade a behavior
- `preference`: the user explicitly expressed a stable preference
- `workflow`: a reusable, non-one-off multi-step method emerged
- `struggle`: roughly `>=8` tool calls, or success only after `>=3` failures/retries

If it is only "maybe a bit valuable" but the evidence is not solid, skip directly and output `NOTHING_TO_SAVE`.

## Pre-Review Preparation

Before spawning the child, the parent agent does four things:

1. Distill evidence:
   - Record 1–3 most critical direct quotes from the user
   - Record a summary of tool pitfalls
   - Record why this experience is worth reusing

2. Tentatively decide the target file:
   - Behavior/process rules → `AGENTS.md`
   - Tool/environment/path/command pitfalls → `TOOLS.md`
   - Stable preferences / durable facts → `MEMORY.md`
   - Reusable multi-step workflow → managed skill's `SKILL.md`

3. Minimal reads:
   - Read only the candidate target file
   - Read only drafts with the same or a close signature
   - Read only existing skills that may conflict
   - Do NOT re-read the entire session transcript

4. Run a duplicate check:
   - A synonymous rule already exists and covers this content → skip
   - A pending draft already exists → update that draft, do not create a new one
   - Recently rejected with no new evidence → skip

## Spawn the Review Sub-Agent

Use `sessions_spawn` with these parameter principles:

- `runtime: "subagent"`
- `mode: "run"`
- `cleanup: "delete"`; keep the session only when debugging self-evolution
- Carry the evidence directly in the task; do not make the child sift through the full transcript itself

The child's task prompt is as follows:

```
You are the self-evolution reviewer.

Your job is to decide whether the parent turn deserves ONE human-approved evolution proposal.

Rules:
- Work only from the evidence provided below and minimal file reads for dedupe.
- Never edit AGENTS.md, TOOLS.md, MEMORY.md, or any SKILL.md directly.
- You may write or update exactly one draft file under `evolution-drafts/pending/`.
- If the evidence is weak, one-off, already covered, or recently rejected, do not create a draft.
- If no proposal is justified, output exactly: NOTHING_TO_SAVE

Decision standard:
- Prefer precision over recall.
- A proposal must be specific, durable, reusable, and likely to help future turns.
- User approval is required before any real write.

Target selection:
- AGENTS.md for future behavior/process/safety rules
- TOOLS.md for tool or environment notes
- MEMORY.md for stable preferences or durable facts
- managed SKILL.md for reusable multi-step workflows

Required output:
- If skipping: `NOTHING_TO_SAVE`
- If proposing: write/update one draft file, then output exactly:
  PROPOSAL_WRITTEN
  Draft-Path: <path>
  Signature: <signature>
  Target: <target-file>
  Reason: <one sentence>

Evidence:
<parent fills this in>

Current candidate target snippets:
<parent fills this in>

Existing similar drafts or rules:
<parent fills this in>
```

## Draft Directory & File Format

The draft directories are fixed:

- `evolution-drafts/pending/`
- `evolution-drafts/approved/`
- `evolution-drafts/rejected/`

`pending` draft file names use a stable signature:

- `evolution-drafts/pending/<signature>.md`

Signature rules:
- Lowercase
- Composed of `target + normalized rule`
- Examples:
  - `agents-research-before-writing`
  - `memory-reply-briefly`
  - `tools-use-rg-for-search`
  - `skill-feishu-doc-fetch-workflow`

Draft file format:

```md
# Evolution Proposal: <short title>

- Proposal-ID: evo-<YYYY-MM-DD>-<signature>
- Status: pending
- Signature: <signature>
- Created-At: <YYYY-MM-DD HH:mm>
- Last-Seen-At: <YYYY-MM-DD HH:mm>
- Target-File: <AGENTS.md | TOOLS.md | MEMORY.md | ~/.openclaw-autoclaw/skills/<name>/SKILL.md>
- Trigger-Type: <correction | preference | workflow | struggle>
- Confidence: <high | medium | low>

## Why This Matters
- <why this should persist>

## Evidence
- "<exact user quote or precise summary>"
- "<exact user quote or precise summary>"
- <tool failure / retry summary if relevant>

## Duplicate Check
- Checked: <files or paths>
- Result: <none | similar existing rule | existing pending draft | recently rejected>
- Decision: <create | update-existing-draft | skip>

## Proposed Change
<the exact content to append, patch, or create>

## Apply Plan
1. <how to modify target file>
2. <where to insert or append>
3. After applying, append a one-line audit note to `memory/YYYY-MM-DD.md`

## User Approval
- Approve: `approve evo-<YYYY-MM-DD>-<signature>`
- Reject: `reject evo-<YYYY-MM-DD>-<signature>`
- Revise: `revise evo-<YYYY-MM-DD>-<signature>: <instruction>`
```

## Target File Routing Logic

Route content to the most appropriate place — do not mix.

Write to `AGENTS.md`:
- Behavior rules that apply to all future similar tasks
- Safety boundaries
- Collaboration style
- Task execution order
- Global workflow rules like "from now on, do X before Y"

Write to `TOOLS.md`:
- Known pitfalls of a specific tool
- Environment paths, command arguments, platform differences
- How to correctly use an external tool
- Lessons like "this command must include this flag or it will fail"

Write to `MEMORY.md`:
- Stable preferences the user has explicitly expressed
- Long-lived project preferences
- Long-lived communication-style requirements
- Clear, durably reusable facts

Write to a managed `SKILL.md`:
- A reusable multi-step workflow that stands on its own
- Has a clear trigger scenario, steps, inputs/outputs, and pitfalls
- Has outgrown a single rule and is closer to an "operations manual"

Do NOT use these as primary evolution targets:
- `memory/YYYY-MM-DD.md`
  - Used only for the audit log and same-day records
  - Not a primary target for self-evolution
  - Only record the outcome there after approval/rejection

## Write Execution Logic

Never modify target files without user approval.

If the child outputs `NOTHING_TO_SAVE`:
- The parent agent does not create a draft
- Reply to the user normally
- Do not cause additional disruption

If the child outputs `PROPOSAL_WRITTEN`:

**⚠ You MUST call the `evolution_proposal` tool. Outputting a plain-text approval prompt directly is forbidden.**

Steps (execute strictly in order, no skipping):
1. First finish the normal reply to the user
2. **MUST** call the `evolution_proposal` tool with a structured JSON payload (see format below)
3. Wait for the tool to return, and read `deliveryMode` from the result
4. If `deliveryMode == "card"`: **stop immediately** — do not output any approval-related text; the desktop app will auto-render the interactive card
5. If `deliveryMode == "text"`: append a short plain-text approval prompt (see fixed format below)

**Incorrect examples (strictly forbidden):**
- ❌ Skipping the `evolution_proposal` tool call and directly outputting "Please approve this evolution proposal: evo-xxx"
- ❌ Restating the draft contents and then asking the user "approve or reject?"
- ❌ Seeing `PROPOSAL_WRITTEN` from the child and mentioning evolution content in text without calling the tool
- ❌ Assuming `deliveryMode` is `text` and skipping the tool call to output approval copy directly

**Correct approach:**
- ✅ Call the `evolution_proposal` tool first → obtain `deliveryMode` → then decide whether to output text

- Input format:

```json
{
  "proposalId": "evo-2026-04-14-memory-reply-briefly",
  "signature": "memory-reply-briefly",
  "description": "Short description of the intent of this evolution proposal",
  "tabs": [
    {
      "kind": "memory",
      "label": "Long-term Memory",
      "targetFile": "MEMORY.md",
      "content": "The full new contents of this file go here (NOT a diff — the entire file)"
    }
  ],
  "draftPath": "evolution-drafts/pending/memory-reply-briefly.md"
}
```

- `tabs` array: each tab corresponds to one target file to modify. **Each tab MUST include a `targetFile` field** specifying the target file name inside the workspace.
- `targetFile`: **required**. A file name inside the workspace, e.g. `"MEMORY.md"`, `"AGENTS.md"`, `"TOOLS.md"`, `"USER.md"`, `"SOUL.md"`, etc. Once the user approves, the desktop app will write `content` directly to `<workspace>/<targetFile>`.
  - Common mappings: `MEMORY.md` (long-term memory), `AGENTS.md` (behavior rules), `TOOLS.md` (tool usage), `USER.md` (user profile)
  - Any custom `.md` file is also supported, e.g. `SOUL.md`, `CONTEXT.md`
- `kind`: the category label used for UI display. Allowed values: `memory`, `behavior`, `skill`, `tool`. If the target file does not fall into these four categories (e.g. `USER.md`), use the closest `kind` (e.g. `behavior`) — `targetFile` will override the default mapping implied by `kind`.
- `content`: **the full new contents of that file**. After approval, the file is overwritten directly, so this must be the complete content — not a diff or an append snippet.
- A single proposal may touch multiple target files — the `tabs` array then contains multiple elements, one per target file's change draft. Only include modules that actually change; do not add empty tabs for unchanged modules.
- **Different target files MUST live in different tabs** — never mix content from multiple files into one tab.
- `description`: one sentence explaining why this evolution is needed
- `draftPath`: path to the draft file written by the child
- If there is no proposal, do not call this tool, and do not mention self-evolution

**Important (restated)**:
- When there is a proposal, you **must call the `evolution_proposal` tool first** — this is the only correct way to submit a proposal
- After calling the tool, check `deliveryMode` in the result
- Only when `deliveryMode == "text"` should you append a plain-text approval prompt
- When `deliveryMode == "card"`, do not restate the draft, do not output approval commands, do not say "please reply approve/reject"
- In plain text, do not repeat the entire draft — keep only the `proposalId`, a one-sentence description, and the approval commands
- When `deliveryMode == "text"`, the recommended fixed format is:

```text
Please approve this evolution proposal: <proposalId>
Description: <description>
Reply with any of the following commands:
- approve <proposalId>
- reject <proposalId>
- revise <proposalId>: <your revision notes>
```

- The `followUp` instruction in the tool result takes precedence over the default copy — follow it exactly
- In `card` mode the user should see only the interactive card
- In `text` mode the user should see this text directly and reply by command

## Handling User Approval

Whether the user clicks a card button in the desktop app or sends a text command via an IM channel, you will receive a plain-text message:
- `approve evo-<YYYY-MM-DD>-<signature>`
- `reject evo-<YYYY-MM-DD>-<signature>`
- `revise evo-<YYYY-MM-DD>-<signature>: <instruction>`

**All channels are handled identically — do not treat them differently.** Once you receive an approval message, follow this flow:

### Approve

1. Find the matching `pending` draft (match by `proposalId` or `signature`)
2. Apply the change to the target file (AGENTS.md / TOOLS.md / MEMORY.md / SKILL.md) per the draft's `Apply Plan`
3. Move the draft into `evolution-drafts/approved/`
4. Append an audit entry to `memory/YYYY-MM-DD.md`
5. Reply explicitly: "applied"

### Reject

1. Move the draft into `evolution-drafts/rejected/`
2. Append an audit entry to `memory/YYYY-MM-DD.md`
3. Reply explicitly: "will not apply"

### Revise

1. Update the `pending` draft in place
2. Keep the same `signature`
3. Do NOT touch the target file
4. Call the `evolution_proposal` tool again to show the updated proposal
5. Read `deliveryMode` again; only if `deliveryMode == "text"` should you resend the plain-text approval prompt

## Duplicate Detection Logic

Before writing a draft, always run:

1. Search the following locations for a synonymous rule:
   - `AGENTS.md`
   - `TOOLS.md`
   - `MEMORY.md`
   - `~/.openclaw-autoclaw/skills/*/SKILL.md`
   - `evolution-drafts/pending/`
   - `evolution-drafts/approved/`
   - `evolution-drafts/rejected/`

2. After normalization, judge:
   - Same target
   - Same core rule
   - Same user preference or same workflow

3. Decide:
   - Already covered → skip
   - Pending with same signature → update existing draft
   - Approved with same signature but stronger new evidence → update target only after a new approval
   - Rejected with same signature and no new evidence → skip

"New evidence" is only:
- A new explicit user statement
- A new obvious failure case
- A new recurring occurrence

Do not re-propose just because the wording has changed.

## Quality Bar

Only propose when all of the following hold:

- Specific
- Actionable
- Durably valid
- Non-one-off
- Helpful for the future
- Likely to be approved by the user

When in doubt, prefer to skip.
The default answer should be: `NOTHING_TO_SAVE`.
