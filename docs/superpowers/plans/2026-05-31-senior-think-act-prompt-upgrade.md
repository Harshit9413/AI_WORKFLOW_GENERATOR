# Senior THINK→ACT Prompt Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a structured THINK→ACT reasoning layer to all four AI prompts so the model reasons like a senior developer — pattern recognition, intent inference, trade-off justification, and feasibility checking — before generating any output.

**Architecture:** Each prompt gets a new internal THINK block that runs before output. The THINK block is mandatory and internal (never shown to the user). The architecture generator gets a new `SENIOR_THINK` constant inserted into the SYSTEM_PROMPT assembly. The other three prompts get their existing reasoning/scope blocks upgraded in-place.

**Tech Stack:** Python, string constants in four existing prompt files. No schema changes, no new modules, no frontend changes.

---

## File Map

| File | Change |
|---|---|
| `backend/app/prompts/architecture_prompt.py` | Add `SENIOR_THINK` constant; insert into `SYSTEM_PROMPT` assembly before Ambiguity Resolution |
| `backend/app/routers/chat.py` | Replace REASONING TRACE block with richer THINK block including intent mapping and impact analysis |
| `backend/app/main.py` | Add THINK block with signal-word classification before CASE 1 in `_INTENT_GATE_PROMPT` |
| `backend/app/graph/nodes.py` | Add THINK block with stack classification and component priority before TASK section in `_ICON_PRELOAD_PROMPT` |
| `backend/tests/test_prompts.py` | Append 10 new sentinel-string tests |

---

## Task 1: Upgrade Architecture Generator Prompt

**Files:**
- Modify: `backend/app/prompts/architecture_prompt.py`
- Modify: `backend/tests/test_prompts.py`

- [ ] **Step 1.1: Write the failing tests**

Append to `backend/tests/test_prompts.py`:

```python
def test_architecture_think_block_has_pattern_classification():
    from app.prompts.architecture_prompt import SYSTEM_PROMPT
    assert "monolith" in SYSTEM_PROMPT
    assert "event-driven" in SYSTEM_PROMPT
    assert "CQRS" in SYSTEM_PROMPT
    assert "ML pipeline" in SYSTEM_PROMPT


def test_architecture_think_block_has_intent_gap_fill():
    from app.prompts.architecture_prompt import SYSTEM_PROMPT
    assert "Missing auth layer" in SYSTEM_PROMPT
    assert "Missing async work" in SYSTEM_PROMPT
    assert "SPOF" in SYSTEM_PROMPT


def test_architecture_think_block_has_tradeoff_justification():
    from app.prompts.architecture_prompt import SYSTEM_PROMPT
    assert "Trade-off justification" in SYSTEM_PROMPT
    assert "Redis over Memcached" in SYSTEM_PROMPT
```

- [ ] **Step 1.2: Run tests to verify they fail**

```bash
cd backend && source venv/bin/activate && pytest tests/test_prompts.py::test_architecture_think_block_has_pattern_classification tests/test_prompts.py::test_architecture_think_block_has_intent_gap_fill tests/test_prompts.py::test_architecture_think_block_has_tradeoff_justification -v
```

Expected: all 3 FAIL — strings not yet in SYSTEM_PROMPT.

- [ ] **Step 1.3: Add `SENIOR_THINK` constant to `architecture_prompt.py`**

Open `backend/app/prompts/architecture_prompt.py`. After the `RAG_USAGE` block (around line 50) and before the `OUTPUT_SCHEMA` block, add:

```python
# ──────────────────────────────────────────────
# SECTION 1c — SENIOR REASONING (THINK phase)
# ──────────────────────────────────────────────

SENIOR_THINK = """
Before writing any PRE-PLAN or JSON, complete this THINK trace internally.
This trace is NEVER shown to the user — it informs your output only.

Pattern:
  → Classify: monolith | microservices | event-driven | CQRS |
              lambda/serverless | ML pipeline | data warehouse |
              real-time | mobile backend | static site
  → If unclear: infer from tech stack mentioned. Default: monolith.

Domain:
  → Classify: e-commerce | fintech | social | developer-tooling |
              logistics | healthcare | media | generic SaaS
  → Domain determines which components are expected vs. surprising.

Intent gap-fill (resolve before PRE-PLAN):
  → Missing auth layer?       → add AuthService between client and API
  → Missing async work?       → add Queue + Worker if any "background" signal
  → Missing CDN?              → add if static assets or global users mentioned
  → Single DB for everything? → flag as SPOF risk in analysis_text Recommendations
  → No rate limiting?         → add API Gateway if high-traffic signal

Trade-off justification (one line per major component in your trace):
  → "Redis over Memcached: user mentioned pub/sub"
  → "Kafka over SQS: event replay requirement implied"
  → "RDS over DynamoDB: relational joins needed for e-commerce orders"
  Surface the winning justification in analysis_text Recommendations.

Feasibility pre-check:
  → SPOF: any single node with no redundancy carrying critical traffic?
  → Auth gap: any path from client to datastore without a security node?
  → Layer violation: any datastore connecting directly to client?
  → Scale ceiling: any service with 5+ inbound edges (split it)?
  Flag any issues found in analysis_text Recommendations.
"""
```

- [ ] **Step 1.4: Insert `SENIOR_THINK` into `SYSTEM_PROMPT` assembly**

Find the `SYSTEM_PROMPT` assembly block (line 527). Replace it with:

```python
SYSTEM_PROMPT = "\n\n".join([
    CONSTITUTION,
    ROLE.strip(),
    "## Output Schema\n" + OUTPUT_SCHEMA.strip(),
    "## RAG Pattern Usage\n" + RAG_USAGE.strip(),
    "## Senior Reasoning (THINK before PRE-PLAN)\n" + SENIOR_THINK.strip(),
    "## Ambiguity Resolution\n" + AMBIGUITY_RESOLUTION.strip(),
    "## Mandatory Pre-Planning (output PRE-PLAN block before any JSON)\n" + PRE_PLANNING.strip(),
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

- [ ] **Step 1.5: Run new tests to verify they pass**

```bash
cd backend && source venv/bin/activate && pytest tests/test_prompts.py::test_architecture_think_block_has_pattern_classification tests/test_prompts.py::test_architecture_think_block_has_intent_gap_fill tests/test_prompts.py::test_architecture_think_block_has_tradeoff_justification -v
```

Expected: all 3 PASS.

- [ ] **Step 1.6: Run full test suite**

```bash
cd backend && source venv/bin/activate && pytest -v
```

Expected: all tests PASS (no regressions).

- [ ] **Step 1.7: Commit**

```bash
git add backend/app/prompts/architecture_prompt.py backend/tests/test_prompts.py
git commit -m "feat: add senior THINK block to architecture generator prompt"
```

---

## Task 2: Upgrade Chat Assistant Prompt

**Files:**
- Modify: `backend/app/routers/chat.py`
- Modify: `backend/tests/test_prompts.py`

- [ ] **Step 2.1: Write the failing tests**

Append to `backend/tests/test_prompts.py`:

```python
def test_chat_think_block_has_intent_mapping():
    from app.routers.chat import CHAT_SYSTEM_PROMPT
    assert "make it faster" in CHAT_SYSTEM_PROMPT
    assert "make it async" in CHAT_SYSTEM_PROMPT
    assert "make it serverless" in CHAT_SYSTEM_PROMPT
    assert "scale this" in CHAT_SYSTEM_PROMPT


def test_chat_think_block_has_impact_analysis():
    from app.routers.chat import CHAT_SYSTEM_PROMPT
    assert "Impact" in CHAT_SYSTEM_PROMPT
    assert "dangling" in CHAT_SYSTEM_PROMPT


def test_chat_think_block_has_dependency_ordering():
    from app.routers.chat import CHAT_SYSTEM_PROMPT
    assert "Dependency order" in CHAT_SYSTEM_PROMPT
    assert "dangling reference" in CHAT_SYSTEM_PROMPT
```

- [ ] **Step 2.2: Run tests to verify they fail**

```bash
cd backend && source venv/bin/activate && pytest tests/test_prompts.py::test_chat_think_block_has_intent_mapping tests/test_prompts.py::test_chat_think_block_has_impact_analysis tests/test_prompts.py::test_chat_think_block_has_dependency_ordering -v
```

Expected: all 3 FAIL.

- [ ] **Step 2.3: Replace REASONING TRACE block in `chat.py`**

Open `backend/app/routers/chat.py`. Find the `═══ REASONING TRACE` block (currently after the opening JSON format line). Replace it entirely with:

```python
═══ THINK (internal, mandatory, never shown to user) ═══
Before emitting JSON, complete this trace internally:

Intent (map vague language to concrete operations):
  → "make it faster"     → add Redis cache between API and primary DB node
  → "make it async"      → add Queue + Worker node, remove sync edge between caller and callee
  → "simplify this"      → identify node with most edges, propose split or remove
  → "add monitoring"     → add Prometheus node connected to all service nodes
  → "add auth"           → add AuthService node between client and first service node
  → "make it serverless" → replace service nodes with Lambda, remove always-on infra nodes
  → "scale this"         → add Load Balancer before primary service, add replica DB node
  → Explicit verb (add/remove/replace/rename/connect): use MODE B directly.

Impact (what does this action break or improve?):
  → Adding a node between two connected nodes → the old direct edge becomes stale, remove it
  → Removing a hub node → all its edges become dangling, warn user
  → Renaming → downstream edges still use old label → must update with rename_node

Dependency order (does this action require a prerequisite?):
  → add_edge before add_node → dangling reference (fix: reorder, add_node first)
  → remove_edge after remove_node → already gone (skip the remove_edge)
  → replace_node → preserves edges (correct); remove+add → destroys edges (wrong)

Confidence (am I certain which existing node the user means?):
  → Certain (one match) → act, state decision in reply
  → Uncertain (2+ matches) → ask (Tier 2 ambiguity)
  → No match → explain what's missing, actions: []

Then emit JSON.
```

- [ ] **Step 2.4: Run new tests to verify they pass**

```bash
cd backend && source venv/bin/activate && pytest tests/test_prompts.py::test_chat_think_block_has_intent_mapping tests/test_prompts.py::test_chat_think_block_has_impact_analysis tests/test_prompts.py::test_chat_think_block_has_dependency_ordering -v
```

Expected: all 3 PASS.

- [ ] **Step 2.5: Run full test suite**

```bash
cd backend && source venv/bin/activate && pytest -v
```

Expected: all tests PASS.

- [ ] **Step 2.6: Commit**

```bash
git add backend/app/routers/chat.py backend/tests/test_prompts.py
git commit -m "feat: upgrade chat assistant THINK block with intent mapping and impact analysis"
```

---

## Task 3: Upgrade Intent Gate Prompt

**Files:**
- Modify: `backend/app/main.py`
- Modify: `backend/tests/test_prompts.py`

- [ ] **Step 3.1: Write the failing tests**

Append to `backend/tests/test_prompts.py`:

```python
def test_intent_gate_think_block_has_signal_words():
    from app.main import _INTENT_GATE_PROMPT
    assert "CASE 1 signal words" in _INTENT_GATE_PROMPT
    assert "CASE 2 signal words" in _INTENT_GATE_PROMPT


def test_intent_gate_think_block_has_ambiguity_examples():
    from app.main import _INTENT_GATE_PROMPT
    assert "What would" in _INTENT_GATE_PROMPT
    assert "How do I build" in _INTENT_GATE_PROMPT
```

- [ ] **Step 3.2: Run tests to verify they fail**

```bash
cd backend && source venv/bin/activate && pytest tests/test_prompts.py::test_intent_gate_think_block_has_signal_words tests/test_prompts.py::test_intent_gate_think_block_has_ambiguity_examples -v
```

Expected: both FAIL.

- [ ] **Step 3.3: Add THINK block to `_INTENT_GATE_PROMPT` in `main.py`**

Open `backend/app/main.py`. Find `_INTENT_GATE_PROMPT`. After the opening `CONSTITUTION + """` line and before `You gate a software architecture diagram generator`, insert:

```python
THINK (internal, before classification):

  CASE 1 signal words: build, design, create, generate, make me, I need,
                       show me, diagram, architect, system for, app that
  CASE 2 signal words: what is, how does, explain, difference between,
                       when to use, best practice, pros and cons
  CASE 3 signal words: hi, hello, hey, how are you, good morning
  → No signal words? → check if input contains a noun + verb describing
                       a system behaviour → CASE 1

  Ambiguity resolution:
    → "What would X look like?" → CASE 1 (implies diagram)
    → "How do I build X?" → CASE 1 (intent is to create)
    → "What is X?" alone → CASE 2 (pure knowledge question)
    → Tie → always CASE 1

```

The full `_INTENT_GATE_PROMPT` after the edit:

```python
_INTENT_GATE_PROMPT = CONSTITUTION + """

THINK (internal, before classification):

  CASE 1 signal words: build, design, create, generate, make me, I need,
                       show me, diagram, architect, system for, app that
  CASE 2 signal words: what is, how does, explain, difference between,
                       when to use, best practice, pros and cons
  CASE 3 signal words: hi, hello, hey, how are you, good morning
  → No signal words? → check if input contains a noun + verb describing
                       a system behaviour → CASE 1

  Ambiguity resolution:
    → "What would X look like?" → CASE 1 (implies diagram)
    → "How do I build X?" → CASE 1 (intent is to create)
    → "What is X?" alone → CASE 2 (pure knowledge question)
    → Tie → always CASE 1

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

- [ ] **Step 3.4: Run new tests to verify they pass**

```bash
cd backend && source venv/bin/activate && pytest tests/test_prompts.py::test_intent_gate_think_block_has_signal_words tests/test_prompts.py::test_intent_gate_think_block_has_ambiguity_examples -v
```

Expected: both PASS.

- [ ] **Step 3.5: Run full test suite**

```bash
cd backend && source venv/bin/activate && pytest -v
```

Expected: all tests PASS.

- [ ] **Step 3.6: Commit**

```bash
git add backend/app/main.py backend/tests/test_prompts.py
git commit -m "feat: upgrade intent gate prompt with senior THINK block and signal-word classification"
```

---

## Task 4: Upgrade Icon Preload Prompt

**Files:**
- Modify: `backend/app/graph/nodes.py`
- Modify: `backend/tests/test_prompts.py`

- [ ] **Step 4.1: Write the failing tests**

Append to `backend/tests/test_prompts.py`:

```python
def test_icon_preload_think_block_has_stack_classification():
    from app.graph.nodes import _ICON_PRELOAD_PROMPT
    assert "Stack classification" in _ICON_PRELOAD_PROMPT
    assert "Component priority" in _ICON_PRELOAD_PROMPT


def test_icon_preload_think_block_has_canonical_resolution():
    from app.graph.nodes import _ICON_PRELOAD_PROMPT
    assert "ElastiCache" in _ICON_PRELOAD_PROMPT
    assert "Unknown DB" in _ICON_PRELOAD_PROMPT
```

- [ ] **Step 4.2: Run tests to verify they fail**

```bash
cd backend && source venv/bin/activate && pytest tests/test_prompts.py::test_icon_preload_think_block_has_stack_classification tests/test_prompts.py::test_icon_preload_think_block_has_canonical_resolution -v
```

Expected: both FAIL.

- [ ] **Step 4.3: Add THINK block to `_ICON_PRELOAD_PROMPT` in `nodes.py`**

Open `backend/app/graph/nodes.py`. Find `_ICON_PRELOAD_PROMPT`. After `CONSTITUTION + """` and before the `═══ SCOPE GATE` section, insert:

```python
THINK (internal, before any lookup_icon calls):

  Stack classification:
    → Cloud provider: AWS | GCP | Azure | self-hosted | unknown
    → Pattern: web app | mobile backend | ML pipeline |
               data warehouse | real-time | microservices | monolith

  Component priority (infer in this order, stop at 4):
    1. Primary compute (the thing that handles requests)
    2. Primary datastore (where data lives)
    3. Message broker (if async signal present)
    4. Auth or CDN (if security/global signal present)
    → Skip monitoring, logging, CI/CD — too rarely a diagram node

  Canonical name resolution:
    → AWS cache   → ElastiCache (not "Redis on AWS")
    → GCP storage → Cloud Storage (not "GCS")
    → Unknown DB  → PostgreSQL (most common default)

```

The full `_ICON_PRELOAD_PROMPT` after the edit:

```python
_ICON_PRELOAD_PROMPT = CONSTITUTION + """

THINK (internal, before any lookup_icon calls):

  Stack classification:
    → Cloud provider: AWS | GCP | Azure | self-hosted | unknown
    → Pattern: web app | mobile backend | ML pipeline |
               data warehouse | real-time | microservices | monolith

  Component priority (infer in this order, stop at 4):
    1. Primary compute (the thing that handles requests)
    2. Primary datastore (where data lives)
    3. Message broker (if async signal present)
    4. Auth or CDN (if security/global signal present)
    → Skip monitoring, logging, CI/CD — too rarely a diagram node

  Canonical name resolution:
    → AWS cache   → ElastiCache (not "Redis on AWS")
    → GCP storage → Cloud Storage (not "GCS")
    → Unknown DB  → PostgreSQL (most common default)

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

- [ ] **Step 4.4: Run new tests to verify they pass**

```bash
cd backend && source venv/bin/activate && pytest tests/test_prompts.py::test_icon_preload_think_block_has_stack_classification tests/test_prompts.py::test_icon_preload_think_block_has_canonical_resolution -v
```

Expected: both PASS.

- [ ] **Step 4.5: Run full test suite**

```bash
cd backend && source venv/bin/activate && pytest -v
```

Expected: all tests PASS.

- [ ] **Step 4.6: Commit**

```bash
git add backend/app/graph/nodes.py backend/tests/test_prompts.py
git commit -m "feat: upgrade icon preload prompt with senior THINK block and stack classification"
```

---

## Task 5: Final Validation

- [ ] **Step 5.1: Run complete test suite**

```bash
cd backend && source venv/bin/activate && pytest -v --tb=short
```

Expected: all tests PASS including all 10 new THINK block tests.

- [ ] **Step 5.2: Verify THINK block present in all four prompts**

```bash
cd backend && source venv/bin/activate && python -c "
from app.prompts.architecture_prompt import SYSTEM_PROMPT
from app.routers.chat import CHAT_SYSTEM_PROMPT
from app.main import _INTENT_GATE_PROMPT
from app.graph.nodes import _ICON_PRELOAD_PROMPT

checks = {
    'SYSTEM_PROMPT / pattern classification': ('monolith' in SYSTEM_PROMPT and 'CQRS' in SYSTEM_PROMPT),
    'SYSTEM_PROMPT / gap-fill':               ('Missing auth layer' in SYSTEM_PROMPT),
    'SYSTEM_PROMPT / trade-off':              ('Redis over Memcached' in SYSTEM_PROMPT),
    'CHAT / intent mapping':                  ('make it faster' in CHAT_SYSTEM_PROMPT),
    'CHAT / impact analysis':                 ('dangling' in CHAT_SYSTEM_PROMPT),
    'INTENT_GATE / signal words':             ('CASE 1 signal words' in _INTENT_GATE_PROMPT),
    'ICON_PRELOAD / stack classification':    ('Stack classification' in _ICON_PRELOAD_PROMPT),
    'ICON_PRELOAD / component priority':      ('Component priority' in _ICON_PRELOAD_PROMPT),
}
for label, ok in checks.items():
    print(f'{'OK' if ok else 'MISSING'}: {label}')
"
```

Expected:
```
OK: SYSTEM_PROMPT / pattern classification
OK: SYSTEM_PROMPT / gap-fill
OK: SYSTEM_PROMPT / trade-off
OK: CHAT / intent mapping
OK: CHAT / impact analysis
OK: INTENT_GATE / signal words
OK: ICON_PRELOAD / stack classification
OK: ICON_PRELOAD / component priority
```

- [ ] **Step 5.3: Final commit**

```bash
git add -A
git commit -m "feat: complete senior THINK→ACT prompt upgrade across all four prompts"
```
