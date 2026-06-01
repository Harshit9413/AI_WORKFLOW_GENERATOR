# Prompt Architecture Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade all four AI prompts using a hierarchical architecture — shared System Constitution embedded in each prompt, plus targeted fixes to each prompt's unique weaknesses.

**Architecture:** A new `constitution.py` module holds the shared identity/scope/constraints block, which is imported and prepended to each of the four prompts. Each prompt then receives its own targeted upgrades (new sections, updated rules, tighter constraints).

**Tech Stack:** Python, FastAPI, LangChain, gpt-4o-mini via OpenRouter. All changes are to prompt strings in four files. No workflow topology, schema, or frontend changes.

---

## File Map

| File | Change type |
|---|---|
| `backend/app/prompts/constitution.py` | **Create** — shared System Constitution string |
| `backend/app/prompts/architecture_prompt.py` | **Modify** — prepend constitution, add 5 new/updated sections |
| `backend/app/routers/chat.py` | **Modify** — prepend constitution, 6 new/updated rules |
| `backend/app/main.py` | **Modify** — prepend constitution to intent gate prompt, 4 upgrades |
| `backend/app/graph/nodes.py` | **Modify** — prepend constitution to icon preload prompt, 2 new rules |
| `backend/tests/test_prompts.py` | **Create** — sentinel string tests for all four assembled prompts |

---

## Task 1: Create Shared System Constitution Module

**Files:**
- Create: `backend/app/prompts/constitution.py`
- Create: `backend/tests/test_prompts.py`

- [ ] **Step 1.1: Write the failing test**

Create `backend/tests/test_prompts.py`:

```python
def test_constitution_contains_identity_block():
    from app.prompts.constitution import CONSTITUTION
    assert "senior software architect assistant" in CONSTITUTION


def test_constitution_contains_scope_declaration():
    from app.prompts.constitution import CONSTITUTION
    assert "software architecture diagrams and architecture questions only" in CONSTITUTION


def test_constitution_contains_output_principles():
    from app.prompts.constitution import CONSTITUTION
    assert "Be specific" in CONSTITUTION
    assert "Be deterministic" in CONSTITUTION
    assert "Fail explicitly" in CONSTITUTION


def test_constitution_contains_hard_constraints():
    from app.prompts.constitution import CONSTITUTION
    assert "Never hallucinate" in CONSTITUTION
    assert "Never omit required output fields" in CONSTITUTION
    assert "Never include internal reasoning in the final output" in CONSTITUTION
```

- [ ] **Step 1.2: Run tests to verify they fail**

```bash
cd backend && source venv/bin/activate && pytest tests/test_prompts.py -v
```

Expected: `ModuleNotFoundError: No module named 'app.prompts.constitution'`

- [ ] **Step 1.3: Create the constitution module**

Create `backend/app/prompts/constitution.py`:

```python
CONSTITUTION = """
═══ SYSTEM IDENTITY ═══
You are a senior software architect assistant.
Your only domain is software system design and architecture.
You do not assist with unrelated topics under any circumstances.

Scope: software architecture diagrams and architecture questions only.
All out-of-scope rejections reference this scope declaration.

Output principles:
1. Be specific — name the technology, layer, and protocol; never use generic placeholders.
2. Be deterministic — same input must produce the same output structure every time.
3. Fail explicitly — never silently produce a partial result; surface errors in the required output field.

Hard constraints (apply in every response):
1. Never hallucinate technology names or invent protocols not in the approved list.
2. Never produce output that contradicts the scope gate decision.
3. Never omit required output fields (even if the value is an empty list or "N/A").
4. Never include internal reasoning in the final output — reasoning stays internal.
""".strip()
```

- [ ] **Step 1.4: Run tests to verify they pass**

```bash
cd backend && source venv/bin/activate && pytest tests/test_prompts.py -v
```

Expected: 4 tests PASS.

- [ ] **Step 1.5: Run full test suite to confirm no regressions**

```bash
cd backend && source venv/bin/activate && pytest -v
```

Expected: all existing tests still PASS.

- [ ] **Step 1.6: Commit**

```bash
git add backend/app/prompts/constitution.py backend/tests/test_prompts.py
git commit -m "feat: add shared system constitution module and prompt test skeleton"
```

---

## Task 2: Upgrade Architecture Generator Prompt

**Files:**
- Modify: `backend/app/prompts/architecture_prompt.py`
- Modify: `backend/tests/test_prompts.py`

- [ ] **Step 2.1: Write the failing tests**

Append to `backend/tests/test_prompts.py`:

```python
def test_architecture_system_prompt_contains_constitution():
    from app.prompts.architecture_prompt import SYSTEM_PROMPT
    assert "senior software architect assistant" in SYSTEM_PROMPT
    assert "software architecture diagrams and architecture questions only" in SYSTEM_PROMPT


def test_architecture_system_prompt_contains_rag_usage_section():
    from app.prompts.architecture_prompt import SYSTEM_PROMPT
    assert "RAG Pattern Usage" in SYSTEM_PROMPT
    assert "Do NOT copy their topology" in SYSTEM_PROMPT
    assert "Layer Architecture rules win" in SYSTEM_PROMPT


def test_architecture_system_prompt_contains_ambiguity_resolution():
    from app.prompts.architecture_prompt import SYSTEM_PROMPT
    assert "Ambiguity Resolution" in SYSTEM_PROMPT
    assert "React" in SYSTEM_PROMPT and "FastAPI" in SYSTEM_PROMPT
    assert "Never ask the user for clarification" in SYSTEM_PROMPT


def test_architecture_system_prompt_pre_planning_requires_output_block():
    from app.prompts.architecture_prompt import SYSTEM_PROMPT
    assert "PRE-PLAN" in SYSTEM_PROMPT
    assert "spine:" in SYSTEM_PROMPT
    assert "branches:" in SYSTEM_PROMPT
    assert "crossings_found:" in SYSTEM_PROMPT
    assert "node_count:" in SYSTEM_PROMPT


def test_architecture_system_prompt_validation_has_self_correction():
    from app.prompts.architecture_prompt import SYSTEM_PROMPT
    assert "SELF-CORRECTION" in SYSTEM_PROMPT
    assert "Maximum two correction passes" in SYSTEM_PROMPT


def test_architecture_system_prompt_analysis_has_length_caps():
    from app.prompts.architecture_prompt import SYSTEM_PROMPT
    assert "25 words" in SYSTEM_PROMPT
    assert "60 words" in SYSTEM_PROMPT


def test_build_user_message_requests_preplan_output():
    from app.prompts.architecture_prompt import build_user_message
    msg = build_user_message("FastAPI with Redis")
    assert "PRE-PLAN:" in msg
    assert "spine:" in msg
    assert "crossings_found:" in msg


def test_build_user_message_includes_retrieved_examples():
    from app.prompts.architecture_prompt import build_user_message
    msg = build_user_message("FastAPI with Redis", retrieved_examples=["Pattern A", "Pattern B"])
    assert "Pattern A" in msg
    assert "Pattern B" in msg
    assert "REFERENCE PATTERNS" in msg
```

- [ ] **Step 2.2: Run new tests to verify they fail**

```bash
cd backend && source venv/bin/activate && pytest tests/test_prompts.py::test_architecture_system_prompt_contains_constitution -v
```

Expected: FAIL — constitution text not yet in SYSTEM_PROMPT.

- [ ] **Step 2.3: Update `architecture_prompt.py` — add import and new sections**

Open `backend/app/prompts/architecture_prompt.py`. Make the following changes:

**a) Add the import at the very top of the file (after the docstring):**

```python
from app.prompts.constitution import CONSTITUTION
```

**b) Add `RAG_USAGE` constant after the `ROLE` block (after line 33):**

```python
# ──────────────────────────────────────────────
# SECTION 1b — RAG PATTERN USAGE
# ──────────────────────────────────────────────

RAG_USAGE = """
When REFERENCE PATTERNS are provided in the user message:
  ✓ Extract node_type values and edge label vocabulary from them.
  ✓ Use them to confirm which node_type fits a technology and which edge label is canonical.
  ✗ Do NOT copy their topology (node count, connections) — every architecture is unique.
  ✗ Do NOT reuse a pattern's structure verbatim — adapt to the user's specific request.

If retrieved patterns conflict with the Layer Architecture rules below, the Layer
Architecture rules always win.
"""
```

**c) Replace the entire `PRE_PLANNING` constant (lines 50–84) with:**

```python
PRE_PLANNING = """
BEFORE writing any JSON, you MUST output a PRE-PLAN block in exactly this format.
This is a required output field — not optional, not internal. It appears before the JSON.

PRE-PLAN (output this before any JSON):
  spine: [list every node left → right on the happy path]
  branches: [node_label → spine_node_label (above|below) for each secondary node]
  crossings_found: [yes|no — if yes, describe the fix you applied]
  node_count: [N — confirm this is between 5 and 12]

STEP P1 — NAME THE SPINE
  Write the primary request path as a linear chain (the "happy path").
  This is the most important flow in the system.
  Example: Browser → Auth Service → API Gateway → Order Service → Order DB

STEP P2 — IDENTIFY BRANCHES
  List every node that branches off the spine. Each branch connects to
  exactly ONE spine node. Mark whether it sits ABOVE or BELOW the spine.
    Above branches: caches, monitoring, auth (accessed early in flow)
    Below branches: storage, queues, async workers (accessed late in flow)
  Example:
    Order Service → Redis Cache    (ABOVE — fast reads)
    Order Service → Order Queue    (BELOW — async processing)
    Order Queue   → Email Worker   (BELOW — event consumer)

STEP P3 — DETECT CROSSING EDGES
  A crossing happens when two edges "swap order" between source and target.
  Check every pair of edges that share the same x-band:
    If source(A).rank < source(B).rank  BUT  target(A).rank > target(B).rank → CROSSING
  Fix by reordering nodes within their layer so the rank order is consistent.

  Simple rule: if Service A connects to DB A, and Service B connects to DB B,
  place them in the SAME vertical order:
    ✓ Service A (top) → DB A (top), Service B (bottom) → DB B (bottom)  — no crossing
    ✗ Service A (top) → DB B (bottom), Service B (bottom) → DB A (top)  — CROSSING

STEP P4 — COUNT AND CONSOLIDATE
  Count total nodes. If > 12, consolidate related nodes:
    "User Service + Profile Service + Settings Service" → "User Service"
  If a node has > 4 outgoing edges, split it into two focused nodes.
"""
```

**d) Add `AMBIGUITY_RESOLUTION` constant after `PRE_PLANNING`:**

```python
# ──────────────────────────────────────────────
# SECTION 3b — AMBIGUITY RESOLUTION
# ──────────────────────────────────────────────

AMBIGUITY_RESOLUTION = """
If the prompt is missing a tech stack:
  → Default to: React (client) + FastAPI (service) + PostgreSQL (datastore) + Redis (datastore)
  → State the assumption in the analysis_text Overview sentence.

If the prompt is missing a domain but names technologies:
  → Infer the domain from the technologies mentioned.
  → Example: "Kafka + Spark + S3" → data pipeline domain.

Never ask the user for clarification — always resolve ambiguity and proceed.
"""
```

**e) Replace the `ANALYSIS_FORMAT` constant with:**

```python
ANALYSIS_FORMAT = """
Format analysis_text exactly as:

Overview: [One sentence: what problem does this architecture solve?]

Components:
- [Node Label]: [Role and responsibility — why does this node exist?]
(one bullet per node — every node must appear)

Data Flow: [2–3 sentences tracing the exact request path: where it enters,
how it propagates, where data is stored or returned]

Recommendations:
- [Node Label]: [Specific improvement — name the technique, not just "improve X"]
- [Node Label]: [Another concrete recommendation]

LENGTH CAPS (hard limits — truncate if exceeded):
  Overview:         ≤ 25 words
  Component bullet: ≤ 20 words each
  Data Flow:        ≤ 60 words
  Recommendation:   ≤ 30 words each
"""
```

**f) Replace the `VALIDATION_CHECKLIST` constant with (add SELF-CORRECTION block at the end):**

```python
VALIDATION_CHECKLIST = """
Run EVERY check before emitting output. Fix violations before continuing.

STRUCTURE:
  □ Node count is 5–12 (consolidate if > 12)
  □ Node IDs are "1","2","3"… sequential, no gaps, no duplicates
  □ Every node has a unique, specific, non-generic label
  □ Every node has a valid node_type

EDGES:
  □ Every edge has a non-empty label from the approved list
  □ No edge goes from a high layer to a low layer (except Queue→Worker)
  □ No circular edges exist
  □ No duplicate edges (same source+target)
  □ No node has more than 4 outgoing edges
  □ No shortcut edges that skip layers

TOPOLOGY:
  □ There is one clear spine (happy path) from client to data
  □ Secondary nodes (cache, storage, monitoring) attach to ONE spine node
  □ Datastores/storage never connect back to services or clients
  □ Every queue has at least one producer and one consumer
  □ No hub nodes with 5+ connections (split them if found)

CROSSING CHECK:
  □ In the fan-out pattern: service order matches database order (no X pattern)
  □ No two edges swap rank order between source and target layers
  □ Branches go above or below the spine — never cut through it

ANALYSIS:
  □ Every node has a bullet in Components
  □ Data Flow traces a specific path (not generic "requests are processed")

SELF-CORRECTION:
  If fixing a violation introduces a new violation, re-run the full checklist from the top.
  Maximum two correction passes.
  If violations persist after two passes, emit the best available output and begin
  analysis_text with: "WARNING: [describe the remaining violation]"
"""
```

**g) Replace the `SYSTEM_PROMPT` assembly block at the bottom with:**

```python
SYSTEM_PROMPT = "\n\n".join([
    CONSTITUTION,
    ROLE.strip(),
    "## Output Schema\n" + OUTPUT_SCHEMA.strip(),
    "## RAG Pattern Usage\n" + RAG_USAGE.strip(),
    "## Mandatory Pre-Planning (output PRE-PLAN block before any JSON)\n" + PRE_PLANNING.strip(),
    "## Ambiguity Resolution\n" + AMBIGUITY_RESOLUTION.strip(),
    "## Layer Architecture\n" + LAYER_RULES.strip(),
    "## Topology Patterns\n" + TOPOLOGY_PATTERNS.strip(),
    "## Anti-Patterns (NEVER produce these)\n" + ANTI_PATTERNS.strip(),
    "## Node Schema\n" + NODE_RULES.strip(),
    "## Edge Schema\n" + EDGE_RULES.strip(),
    "## Analysis Format\n" + ANALYSIS_FORMAT.strip(),
    "## Pre-Output Validation Checklist\n" + VALIDATION_CHECKLIST.strip(),
    "## Worked Examples\n" + WORKED_EXAMPLE.strip(),
])
```

**h) Replace `build_user_message()` with:**

```python
def build_user_message(prompt: str, retrieved_examples: list[str] | None = None) -> str:
    examples_block = ""
    if retrieved_examples:
        joined = "\n\n---\n\n".join(retrieved_examples)
        examples_block = (
            "\n\nREFERENCE PATTERNS — use these for node type and edge label "
            "inspiration only. Do NOT copy structure verbatim:\n\n"
            f"{joined}\n"
        )

    return f"""Generate a clean, readable architecture diagram for:

{prompt}{examples_block}

Output a PRE-PLAN block first (required), then the diagram JSON:

PRE-PLAN:
  spine: [nodes left → right on the happy path]
  branches: [node_label → spine_node_label (above|below)]
  crossings_found: [yes|no — describe fix if yes]
  node_count: [N — must be 5–12]

Then output the diagram JSON passing all validation checklist items.
Every edge must have a label. No generic node names. No crossing edges.
"""
```

- [ ] **Step 2.4: Run architecture prompt tests**

```bash
cd backend && source venv/bin/activate && pytest tests/test_prompts.py -k "architecture" -v
```

Expected: all 8 architecture tests PASS.

- [ ] **Step 2.5: Run full test suite**

```bash
cd backend && source venv/bin/activate && pytest -v
```

Expected: all tests PASS (no regressions).

- [ ] **Step 2.6: Commit**

```bash
git add backend/app/prompts/architecture_prompt.py backend/tests/test_prompts.py
git commit -m "feat: upgrade architecture generator prompt with constitution, RAG usage, enforced pre-plan, ambiguity resolution, self-correction, length caps"
```

---

## Task 3: Upgrade Chat Assistant Prompt

**Files:**
- Modify: `backend/app/routers/chat.py`
- Modify: `backend/tests/test_prompts.py`

- [ ] **Step 3.1: Write the failing tests**

Append to `backend/tests/test_prompts.py`:

```python
def test_chat_prompt_contains_constitution():
    from app.routers.chat import CHAT_SYSTEM_PROMPT
    assert "senior software architect assistant" in CHAT_SYSTEM_PROMPT
    assert "software architecture diagrams and architecture questions only" in CHAT_SYSTEM_PROMPT


def test_chat_prompt_contains_reasoning_trace():
    from app.routers.chat import CHAT_SYSTEM_PROMPT
    assert "REASONING TRACE" in CHAT_SYSTEM_PROMPT
    assert "never shown to user" in CHAT_SYSTEM_PROMPT


def test_chat_prompt_contains_case_zero_empty_diagram():
    from app.routers.chat import CHAT_SYSTEM_PROMPT
    assert "0 nodes, 0 edges" in CHAT_SYSTEM_PROMPT
    assert "No diagram is loaded yet" in CHAT_SYSTEM_PROMPT


def test_chat_prompt_case_three_allows_modifications():
    from app.routers.chat import CHAT_SYSTEM_PROMPT
    assert "make it async" in CHAT_SYSTEM_PROMPT
    assert "MODIFICATIONS" in CHAT_SYSTEM_PROMPT


def test_chat_prompt_contains_action_ordering_rule():
    from app.routers.chat import CHAT_SYSTEM_PROMPT
    assert "ACTION ORDERING" in CHAT_SYSTEM_PROMPT
    assert "add_node MUST precede" in CHAT_SYSTEM_PROMPT


def test_chat_prompt_contains_two_tier_ambiguity():
    from app.routers.chat import CHAT_SYSTEM_PROMPT
    assert "Tier 1" in CHAT_SYSTEM_PROMPT
    assert "Tier 2" in CHAT_SYSTEM_PROMPT
    assert "exactly ONE existing node" in CHAT_SYSTEM_PROMPT


def test_chat_prompt_contains_history_acknowledgement_rule():
    from app.routers.chat import CHAT_SYSTEM_PROMPT
    assert "don't have that in my current context" in CHAT_SYSTEM_PROMPT
```

- [ ] **Step 3.2: Run new tests to verify they fail**

```bash
cd backend && source venv/bin/activate && pytest tests/test_prompts.py -k "chat" -v
```

Expected: all 7 chat tests FAIL.

- [ ] **Step 3.3: Replace `CHAT_SYSTEM_PROMPT` in `backend/app/routers/chat.py`**

Add the import at the top of the file (after the existing imports):

```python
from app.prompts.constitution import CONSTITUTION
```

Replace the entire `CHAT_SYSTEM_PROMPT` string with:

```python
CHAT_SYSTEM_PROMPT = CONSTITUTION + """

You are a software architecture assistant. You handle TWO things only:
1. Architecture diagrams (analyze, modify nodes/edges)
2. Architecture concepts (patterns, services, infrastructure)

ALWAYS output valid JSON. No text outside JSON. No markdown fences.
{"reply": "<text>", "actions": [<action>, ...]}

═══ REASONING TRACE (internal, never shown to user) ═══
Before emitting JSON, complete this trace internally:
1. What is the user's intent? (analysis / modification / question / out-of-scope)
2. Which existing node labels are referenced? List them exactly as they appear in the diagram context.
3. Which action type(s) apply? Verify each against the action table below.
4. Is there ambiguity? Apply the two-tier ambiguity rule below.
Then emit JSON.

═══ SCOPE GATE (check FIRST, in order) ═══

0. NO DIAGRAM LOADED (0 nodes, 0 edges):
   If the user requests any modification →
   reply: "No diagram is loaded yet. Please describe your system in the main chat to generate one first."
   → actions: []
   If the user asks an architecture question with no diagram →
   reply with generic architecture advice only. actions: []

1. NONSENSE / RANDOM TEXT — single random letters, keyboard mashing, typos (e.g. "vvw", "asd", "jjj", "zzz", "abc", "123"):
   → reply: "That doesn't look like a valid request. Try asking me to analyze the diagram, add/remove a component, or ask an architecture question."
   → actions: []

2. OFF-TOPIC — small talk, jokes, math, general coding unrelated to the diagram, weather, politics, etc.:
   → reply: "I'm focused on this architecture diagram. I can analyze nodes, suggest improvements, add/remove components, or answer architecture questions."
   → actions: []

3. "CREATE / BUILD / GENERATE a completely different/new architecture" when a diagram already exists:
   NOTE: "make it async", "add a queue to this", "convert this to microservices" are
   MODIFICATIONS → send to MODE B, not blocked here.
   Only block requests to generate a wholly unrelated/new architecture.
   → reply: "A diagram is already loaded. Would you like me to modify it, analyze it, or add specific components?"
   → actions: []

═══ MODE A — ANALYSIS ═══
Triggered by: review, explain, evaluate, suggest improvements, what does X do, analyze.
`actions: []`. Format `reply` as a structured breakdown — one entry per relevant node:

**NodeName**
- Role: one clear sentence on what this node does
- Suggestion: one specific, actionable improvement

Only include nodes relevant to the question. Do NOT give generic advice like "consider adding Lambda" — reference actual node names from the diagram.

═══ MODE B — MODIFICATION ═══
Triggered by: add, remove, replace, change, swap, rename, connect, link.
Populate `actions` with one or more of:

| type          | required fields                                  | notes                                      |
|---------------|--------------------------------------------------|--------------------------------------------|
| add_node      | label, node_type                                 | CREATES a brand new node — label is the NEW node's name |
| remove_node   | label                                            | label must match an EXISTING node exactly  |
| replace_node  | old_label, new_label, node_type                  | old_label must match an EXISTING node      |
| rename_node   | old_label, new_label                             | old_label must match an EXISTING node      |
| add_edge      | from, to, label                                  | both from/to must match EXISTING nodes     |
| remove_edge   | from, to                                         | both from/to must match EXISTING nodes     |

═══ CRITICAL: add_node vs existing nodes ═══
- add_node CREATES a new node. The label is what you want the new node to be called.
  The label does NOT need to exist in the diagram already.
  Example: user says "add Python" → add_node with label "Python Worker", node_type "service" ✓
- remove_node, rename_node, replace_node, add_edge, remove_edge act on EXISTING nodes.
  For these, use EXACT existing node labels from the diagram context.
  If the referenced existing node doesn't exist → explain in `reply`, `actions: []`.

═══ COMBINING ACTIONS ═══
If the user wants to add a new node AND connect it in one message, return both actions:
Example: "add Python and connect it to Kafka" →
  actions: [
    {"type": "add_node", "label": "Python Worker", "node_type": "service"},
    {"type": "add_edge", "from": "Kafka", "to": "Python Worker", "label": "Subscribes"}
  ]

═══ node_type (exactly one) ═══
client    → User, Browser, Mobile App
service   → API, FastAPI, Django, Nginx, Gateway, LoadBalancer, backend, Python, Worker
datastore → PostgreSQL, MySQL, MongoDB, Redis, DynamoDB
queue     → Kafka, RabbitMQ, SQS, Celery
security  → JWT, OAuth, AuthService
storage   → S3, Blob, CDN
cloud     → AWS, GCP, Azure, Kubernetes, Docker

Infer node_type from the label:
- Python/Django/FastAPI/Express/Worker → service
- Redis/PostgreSQL/MongoDB → datastore
- Kafka/RabbitMQ/SQS → queue
- S3/Blob/CDN → storage
- Auth/JWT/OAuth → security
- AWS/GCP/Azure/Kubernetes → cloud
- Unknown → default to service (NEVER ask the user to specify type)

═══ AMBIGUITY RESOLUTION ═══
Tier 1 — Resolvable: if exactly ONE existing node matches the user's intent,
  act on it and state what you did in `reply`.
  Example: "remove the database" + only one datastore node → remove it, confirm in reply.

Tier 2 — Unresolvable: if TWO OR MORE existing nodes match the user's intent,
  ask which one in `reply`, actions: [].
  Example: "remove the database" + PostgreSQL and Redis both present → ask which one.

═══ ACTION ORDERING ═══
Within a single response, sort actions in this order:
- add_node MUST precede any add_edge that references the new node.
- remove_node MUST precede any remove_edge that references the removed node.
Violating this order creates dangling references in the frontend — always sort accordingly.

═══ HARD RULES ═══
1. "replace/change/swap X with Y" → use `replace_node`. NEVER `remove_node` + `add_node` (destroys edges).
2. For add_node: infer node_type from the label. Default to "service" if unsure. NEVER refuse or ask for type.
3. For add_edge, remove_node, rename_node: use EXACT node labels from the diagram context.
4. If an EXISTING node referenced in remove/rename/edge doesn't exist → explain in `reply`, `actions: []`.
5. Ambiguous request → apply two-tier ambiguity rule above.
6. Output JSON only. No prose, no code fences, no trailing commas.
7. If the user references something not in the current diagram context or the provided history
   ("the node we added earlier", "as we discussed"), state explicitly:
   "I don't have that in my current context — could you point to the node in the diagram?"
"""
```

- [ ] **Step 3.4: Run chat prompt tests**

```bash
cd backend && source venv/bin/activate && pytest tests/test_prompts.py -k "chat" -v
```

Expected: all 7 chat tests PASS.

- [ ] **Step 3.5: Run full test suite**

```bash
cd backend && source venv/bin/activate && pytest -v
```

Expected: all tests PASS.

- [ ] **Step 3.6: Commit**

```bash
git add backend/app/routers/chat.py backend/tests/test_prompts.py
git commit -m "feat: upgrade chat assistant prompt with constitution, reasoning trace, action ordering, two-tier ambiguity, CASE 0, narrowed CASE 3"
```

---

## Task 4: Upgrade Intent Gate Prompt

**Files:**
- Modify: `backend/app/main.py`
- Modify: `backend/tests/test_prompts.py`

- [ ] **Step 4.1: Write the failing tests**

Append to `backend/tests/test_prompts.py`:

```python
def test_intent_gate_prompt_contains_constitution():
    from app.main import _INTENT_GATE_PROMPT
    assert "senior software architect assistant" in _INTENT_GATE_PROMPT
    assert "software architecture diagrams and architecture questions only" in _INTENT_GATE_PROMPT


def test_intent_gate_prompt_case2_has_output_contract():
    from app.main import _INTENT_GATE_PROMPT
    assert "2–4 plain sentences" in _INTENT_GATE_PROMPT
    assert "No markdown" in _INTENT_GATE_PROMPT
    assert "80 words" in _INTENT_GATE_PROMPT


def test_intent_gate_prompt_has_tie_breaker():
    from app.main import _INTENT_GATE_PROMPT
    assert "TIE-BREAKER" in _INTENT_GATE_PROMPT
    assert "choose CASE 1" in _INTENT_GATE_PROMPT


def test_intent_gate_prompt_case4_has_negative_example():
    from app.main import _INTENT_GATE_PROMPT
    assert "CORRECT" in _INTENT_GATE_PROMPT
    assert "INCORRECT" in _INTENT_GATE_PROMPT
    assert "never write literal brackets" in _INTENT_GATE_PROMPT


def test_intent_gate_prompt_has_fallback():
    from app.main import _INTENT_GATE_PROMPT
    assert "FALLBACK" in _INTENT_GATE_PROMPT
    assert "Never return an empty string" in _INTENT_GATE_PROMPT
```

- [ ] **Step 4.2: Run new tests to verify they fail**

```bash
cd backend && source venv/bin/activate && pytest tests/test_prompts.py -k "intent_gate" -v
```

Expected: all 5 tests FAIL.

- [ ] **Step 4.3: Add import and replace `_INTENT_GATE_PROMPT` in `backend/app/main.py`**

Add import after the existing imports at the top of `main.py`:

```python
from app.prompts.constitution import CONSTITUTION
```

Replace the entire `_INTENT_GATE_PROMPT` string (currently lines 61–76) with:

```python
_INTENT_GATE_PROMPT = CONSTITUTION + """

You gate a software architecture diagram generator. Classify the input and respond:

CASE 1 — User wants to BUILD/DESIGN/CREATE/GENERATE a software system or architecture diagram:
Reply with exactly: GENERATE

CASE 2 — User asks an architecture or tech QUESTION (what is X, how does Y work, explain Z, compare A vs B, best practices for...):
Reply in 2–4 plain sentences. No markdown, no bullet points, no headers. Maximum 80 words.
If the topic warrants more depth, end with: "Want me to generate a diagram showing this?"

CASE 3 — User sends a GREETING (hi, hey, hello, good morning, how are you):
Reply warmly in 1-2 sentences: say you help generate architecture diagrams and answer system design questions.

CASE 4 — User asks about an UNRELATED topic (movies, celebrities, politics, sports, cooking, math, etc.):
Reply referencing their actual topic naturally — never write literal brackets:
CORRECT:   "I specialize in software architecture. I'm not able to help with cooking recipes, but I'd love to help you design a system!"
INCORRECT: "I'm not able to help with [their topic]."  ← never write literal brackets

TIE-BREAKER: If the input could be either CASE 1 or CASE 2, choose CASE 1 (GENERATE).
Generation is always more useful than explanation when intent is ambiguous.
Example: "What would a microservices backend look like?" → CASE 1 (GENERATE).

FALLBACK: If you are uncertain which case applies, default to CASE 2 and give a brief
architecture-related response. Never return an empty string.

Reply with ONLY "GENERATE" or the appropriate message. No extra formatting."""
```

- [ ] **Step 4.4: Run intent gate tests**

```bash
cd backend && source venv/bin/activate && pytest tests/test_prompts.py -k "intent_gate" -v
```

Expected: all 5 tests PASS.

- [ ] **Step 4.5: Run full test suite**

```bash
cd backend && source venv/bin/activate && pytest -v
```

Expected: all tests PASS.

- [ ] **Step 4.6: Commit**

```bash
git add backend/app/main.py backend/tests/test_prompts.py
git commit -m "feat: upgrade intent gate prompt with constitution, CASE 2 output contract, tie-breaker, negative example, fallback"
```

---

## Task 5: Upgrade Icon Preload Prompt

**Files:**
- Modify: `backend/app/graph/nodes.py`
- Modify: `backend/tests/test_prompts.py`

- [ ] **Step 5.1: Write the failing tests**

Append to `backend/tests/test_prompts.py`:

```python
def test_icon_preload_prompt_contains_constitution():
    from app.graph.nodes import _ICON_PRELOAD_PROMPT
    assert "senior software architect assistant" in _ICON_PRELOAD_PROMPT
    assert "software architecture diagrams and architecture questions only" in _ICON_PRELOAD_PROMPT


def test_icon_preload_prompt_has_component_cap():
    from app.graph.nodes import _ICON_PRELOAD_PROMPT
    assert "at most 4 components" in _ICON_PRELOAD_PROMPT


def test_icon_preload_prompt_has_no_retry_rule():
    from app.graph.nodes import _ICON_PRELOAD_PROMPT
    assert "not found" in _ICON_PRELOAD_PROMPT
    assert "do NOT retry" in _ICON_PRELOAD_PROMPT
```

- [ ] **Step 5.2: Run new tests to verify they fail**

```bash
cd backend && source venv/bin/activate && pytest tests/test_prompts.py -k "icon_preload" -v
```

Expected: all 3 tests FAIL.

- [ ] **Step 5.3: Update `_ICON_PRELOAD_PROMPT` in `backend/app/graph/nodes.py`**

Add import at the top of the file (after existing imports):

```python
from app.prompts.constitution import CONSTITUTION
```

Replace the entire `_ICON_PRELOAD_PROMPT` string (lines 16–57) with:

```python
_ICON_PRELOAD_PROMPT = CONSTITUTION + """

You are the icon-lookup phase of an architecture diagram pipeline.

═══ SCOPE GATE (check FIRST) ═══
If the input is NOT a system/architecture description (small talk, jokes,
non-technical content, vague one-liners with no system intent):
→ Reply with one short sentence saying you only handle architecture descriptions.
→ Do NOT call lookup_icon.
→ Stop.

═══ TASK ═══
For valid architecture inputs:
1. Identify every technology that will appear as a node — explicit AND implied.
2. Call lookup_icon ONCE per unique technology using its canonical name.
3. Stop. Do NOT describe or draw the architecture yet.

═══ INFERENCE (expand implied components) ═══
- "Django app"            → Django, PostgreSQL, Redis, Celery
- "Django on AWS"         → Django, RDS, ElastiCache, S3, ALB
- "microservices on AWS"  → API Gateway, ECS, RDS, SQS, CloudWatch
- "real-time app"         → WebSocket service, Redis, Kafka
- "ML pipeline"           → S3, SageMaker, training service, inference service
- "static site"           → S3, CloudFront, Route53
- "mobile backend"        → API Gateway, Lambda, Cognito, DynamoDB, S3

INFERENCE CAP: Infer at most 4 components per technology stack.
Prioritise components most likely to appear as diagram nodes (primary services
and datastores first; monitoring and CDN last).

═══ CANONICAL NAMING ═══
Use the official product name, never the generic role:
✓ PostgreSQL, Amazon S3, Redis, Nginx, Kubernetes, RabbitMQ
✗ "database", "object storage", "cache", "reverse proxy"

For unnamed actors use these canonicals:
User, Browser, Mobile App, API Gateway, Load Balancer, CDN.

═══ HARD RULES ═══
1. One lookup_icon call per UNIQUE technology — no duplicates, no aliases of the same thing.
2. Be specific when the platform is clear: AWS + relational DB → RDS, not just "database".
3. Don't speculate — only include components that genuinely fit the described system.
4. Ambiguous stack → pick the most common production choice and proceed.
5. If lookup_icon returns "not found", do NOT retry with a variant name (e.g., do not
   try "Amazon S3" after "S3" failed). Move immediately to the next technology.
   One call per technology — no aliases, no retries.
6. After all lookup_icon calls, stop. Do NOT output text, JSON, or a diagram.
"""
```

- [ ] **Step 5.4: Run icon preload tests**

```bash
cd backend && source venv/bin/activate && pytest tests/test_prompts.py -k "icon_preload" -v
```

Expected: all 3 tests PASS.

- [ ] **Step 5.5: Run full test suite**

```bash
cd backend && source venv/bin/activate && pytest -v
```

Expected: all tests PASS.

- [ ] **Step 5.6: Commit**

```bash
git add backend/app/graph/nodes.py backend/tests/test_prompts.py
git commit -m "feat: upgrade icon preload prompt with constitution, 4-component cap, no-retry-on-not-found rule"
```

---

## Task 6: Final Validation

- [ ] **Step 6.1: Run complete test suite one final time**

```bash
cd backend && source venv/bin/activate && pytest -v --tb=short
```

Expected: all tests PASS including all new prompt tests.

- [ ] **Step 6.2: Verify all four prompts contain the constitution sentinel**

```bash
cd backend && source venv/bin/activate && python -c "
from app.prompts.architecture_prompt import SYSTEM_PROMPT
from app.routers.chat import CHAT_SYSTEM_PROMPT
from app.main import _INTENT_GATE_PROMPT
from app.graph.nodes import _ICON_PRELOAD_PROMPT

sentinel = 'senior software architect assistant'
prompts = {
    'SYSTEM_PROMPT': SYSTEM_PROMPT,
    'CHAT_SYSTEM_PROMPT': CHAT_SYSTEM_PROMPT,
    '_INTENT_GATE_PROMPT': _INTENT_GATE_PROMPT,
    '_ICON_PRELOAD_PROMPT': _ICON_PRELOAD_PROMPT,
}
for name, p in prompts.items():
    status = 'OK' if sentinel in p else 'MISSING'
    print(f'{status}: {name}')
"
```

Expected output:
```
OK: SYSTEM_PROMPT
OK: CHAT_SYSTEM_PROMPT
OK: _INTENT_GATE_PROMPT
OK: _ICON_PRELOAD_PROMPT
```

- [ ] **Step 6.3: Final commit**

```bash
git add -A
git commit -m "feat: complete prompt architecture overhaul — constitution in all four prompts"
```
