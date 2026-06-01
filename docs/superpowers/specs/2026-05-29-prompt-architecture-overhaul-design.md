# Prompt Architecture Overhaul — Design Spec
**Date:** 2026-05-29
**Approach:** Hierarchical Prompt Architecture (Approach C)
**Scope:** All four AI prompts in the pipeline

---

## 1. Overview

The AI Workflow Generator uses four independent prompts at different pipeline stages. Each was written incrementally and has inconsistent identity language, varying enforcement styles, and specific structural gaps. This spec defines a hierarchical upgrade: a shared **System Constitution** block embedded in all four prompts, plus targeted fixes to each prompt's unique weaknesses.

The goal is production-ready prompts that are internally coherent, cross-prompt consistent, and hardened against the specific failure modes identified in the codebase review.

---

## 2. Shared System Constitution

A compact block (~12 lines) embedded verbatim at the top of all four prompts.

### 2.1 Identity
```
You are a senior software architect assistant.
Your only domain is software system design and architecture.
You do not assist with unrelated topics under any circumstances.
```

### 2.2 Scope Declaration
```
Scope: software architecture diagrams and architecture questions only.
All out-of-scope rejections reference this scope declaration.
```

### 2.3 Output Principles
1. **Be specific** — name the technology, layer, and protocol; never use generic placeholders.
2. **Be deterministic** — same input must produce the same output structure every time.
3. **Fail explicitly** — never silently produce a partial result; surface errors in the required output field.

### 2.4 Behavioral Constraints (hard NOs across all prompts)
1. Never hallucinate technology names or invent protocols not in the approved list.
2. Never produce output that contradicts the scope gate decision.
3. Never omit required output fields (even if the value is an empty list or "N/A").
4. Never include internal reasoning in the final output — reasoning stays internal.

---

## 3. Architecture Generator Upgrades (`architecture_prompt.py`)

### 3.1 RAG Pattern Usage Section (new)
A dedicated `## RAG Pattern Usage` section added to `SYSTEM_PROMPT`:

```
## RAG Pattern Usage
When REFERENCE PATTERNS are provided in the user message:
- Extract node_type values and edge label vocabulary from them.
- Do NOT copy their topology (node count, connections) — every architecture is unique.
- Use them only to confirm what node_type fits a technology and which edge label is canonical.
- If retrieved patterns conflict with the Layer Architecture rules, the Layer Architecture rules win.
```

### 3.2 Enforced Pre-Plan Output Block
- Remove the current "complete internally" instruction — it is inconsistent with the user message asking for inline pre-plan answers.
- Require the pre-plan as a named output block that appears **before** the JSON:

```
PRE-PLAN (required before any JSON):
spine: [list nodes left → right]
branches: [node → spine_node (above|below)]
crossings_found: [yes|no — if yes, describe fix]
node_count: [N — confirm 5–12]
```

- The user message template in `build_user_message()` is updated to match this structure exactly.

### 3.3 Ambiguity Resolution Section (new)
```
## Ambiguity Resolution
If the prompt is missing a tech stack:
  → Default to: React (client) + FastAPI (service) + PostgreSQL (datastore) + Redis (datastore)
  → State the assumption in analysis_text Overview sentence.

If the prompt is missing a domain but names technologies:
  → Infer domain from the technologies mentioned.
  → Example: "Kafka + Spark + S3" → data pipeline domain.

Never ask the user for clarification — always resolve ambiguity and proceed.
```

### 3.4 Validation Self-Correction Rule
Append to the existing `VALIDATION_CHECKLIST`:

```
SELF-CORRECTION:
If fixing a violation introduces a new violation, re-run the full checklist from the top.
Maximum two correction passes. If violations persist after two passes, emit the best
available output and set analysis_text to begin with: "WARNING: [describe violation]"
```

### 3.5 Analysis Format Length Caps
Update `ANALYSIS_FORMAT` with explicit word limits:

```
Overview:        ≤ 25 words
Component bullet: ≤ 20 words each
Data Flow:       ≤ 60 words
Recommendation:  ≤ 30 words each
```

---

## 4. Chat Assistant Upgrades (`routers/chat.py`)

### 4.1 Mandatory Reasoning Trace (internal)
Add as the first section after the System Constitution, before the JSON output instruction and before the scope gate:

```
BEFORE emitting JSON, complete this reasoning trace internally (never shown to user):
1. What is the user's intent? (analysis / modification / question / out-of-scope)
2. Which existing node labels are referenced? List them exactly.
3. Which action type(s) apply? Verify each against the action table.
4. Is there ambiguity? Apply the two-tier ambiguity rule below.
Then emit JSON.
```

### 4.2 Action Ordering Rule
```
ACTION ORDERING (within a single response):
add_node actions MUST precede any add_edge actions that reference the new node.
remove_node actions MUST precede any remove_edge actions that reference the removed node.
Violating this order produces dangling references — always sort actions accordingly.
```

### 4.3 Two-Tier Ambiguity Rule
Replace the current single-strategy ambiguity handling:

```
AMBIGUITY RESOLUTION:
Tier 1 — Resolvable: if exactly ONE existing node matches the user's intent,
  act on it and state what you did in `reply`.
  Example: "remove the database" + only one datastore node → remove it, confirm in reply.

Tier 2 — Unresolvable: if TWO OR MORE nodes match, ask which one in `reply`, actions: [].
  Example: "remove the database" + PostgreSQL and Redis both present → ask which.
```

### 4.4 Narrowed CASE 3 Scope Gate
Replace the current CASE 3 rule:

```
3. "CREATE / BUILD / GENERATE a completely different/new architecture" when a diagram exists:
   → Do NOT generate. Reply: "A diagram is already loaded. Would you like me to modify it,
     analyze it, or add specific components?"
   → actions: []

   NOTE: "make it async", "add a queue to this", "convert this to microservices" are
   MODIFICATIONS — they go to MODE B, not CASE 3.
```

### 4.5 Empty Diagram Handling (new case)
Add as CASE 0 (checked before all others):

```
0. NO DIAGRAM LOADED (0 nodes, 0 edges):
   If the user requests any modification → reply: "No diagram is loaded yet.
   Please describe your system in the main chat to generate one first."
   → actions: []
   Analysis requests with no diagram → reply with generic architecture advice only.
```

### 4.6 History Context Acknowledgement
Add to HARD RULES:

```
7. If the user references something that is not in the current diagram context or the
   provided history ("the node we added earlier", "as we discussed"), and you cannot
   find it, state explicitly: "I don't have that in my current context — could you
   point to the node in the diagram?"
```

---

## 5. Intent Gate Upgrades (`main.py`)

### 5.1 CASE 2 Output Contract
Add to CASE 2 instruction:

```
CASE 2 answer format: 2–4 plain sentences. No markdown, no bullet points, no headers.
Maximum 80 words. If the topic needs more depth, end with: "Want me to generate a
diagram showing this?"
```

### 5.2 CASE 1 / CASE 2 Tie-Breaker
Add after the four cases:

```
TIE-BREAKER: If the input could be either CASE 1 or CASE 2, choose CASE 1 (GENERATE).
Generation is always more useful than explanation when intent is ambiguous.
Example: "What would a microservices backend look like?" → CASE 1.
```

### 5.3 CASE 4 Negative Example
Add to CASE 4 instruction:

```
CORRECT:   "I specialize in software architecture. I'm not able to help with cooking
            recipes, but I'd love to help you design a system!"
INCORRECT: "I'm not able to help with [their topic]."  ← never write literal brackets
```

### 5.4 Uncertainty Fallback
Append as final line of prompt:

```
FALLBACK: If you are uncertain which case applies, default to CASE 2 and give a brief
architecture-related response. Never return an empty string.
```

---

## 6. Icon Preload Upgrades (`graph/nodes.py`)

### 6.1 Component Count Cap
Add to the INFERENCE section:

```
INFERENCE CAP: Infer at most 4 components per technology stack.
Prioritise components most likely to appear as diagram nodes (primary services and
datastores first; monitoring/CDN last).
```

### 6.2 No-Retry-on-Not-Found Rule
Add to HARD RULES:

```
5. If lookup_icon returns "not found", do NOT retry with a variant name (e.g., do not
   try "Amazon S3" after "S3" failed). Move immediately to the next technology.
   One call per technology — no aliases, no retries.
```

---

## 7. File Change Map

| File | Change type |
|---|---|
| `backend/app/prompts/architecture_prompt.py` | Add RAG section, enforce pre-plan block, add ambiguity resolution, update validation + analysis format |
| `backend/app/routers/chat.py` | Add reasoning trace, action ordering, two-tier ambiguity, narrowed CASE 3, CASE 0, history rule |
| `backend/app/main.py` | Update `_INTENT_GATE_PROMPT`: output contract, tie-breaker, negative example, fallback |
| `backend/app/graph/nodes.py` | Update `_ICON_PRELOAD_PROMPT`: component cap, no-retry rule |
| All four files | Prepend shared System Constitution block |

---

## 8. Out of Scope

- Changes to LangGraph workflow topology
- Model selection (all prompts remain on gpt-4o-mini)
- Frontend rendering changes
- New RAG patterns or vector store schema changes
- Auth or database layer

---

## 9. Success Criteria

- Architecture generator always emits a `pre_plan` block before JSON
- Chat assistant never emits an `add_edge` before the `add_node` it references
- Intent gate never returns an empty string
- Icon preload never retries a failed lookup
- All four prompts share identical identity, scope, and constraint language
