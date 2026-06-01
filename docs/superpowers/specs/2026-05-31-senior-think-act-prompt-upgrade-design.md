# Senior THINK→ACT Prompt Upgrade — Design Spec

**Goal:** Upgrade all four AI prompts with a two-phase THINK→ACT reasoning layer that forces the model to reason like a senior developer before generating output — pattern recognition, intent inference, trade-off justification, and feasibility checking.

**Approach:** Approach B — Two-Phase Reasoning Layer. Add a structured internal THINK block to each prompt. The THINK phase is mandatory, internal, and never shown to the user. The ACT phase uses the trace to generate output.

---

## Core Pattern

Every prompt gets this two-phase structure:

```
THINK (internal, mandatory, never shown to user):
  Run reasoning trace specific to each prompt's job.
  Surface any risks or decisions in the visible output (reply / analysis_text).

ACT:
  Generate output using the trace above.
  If THINK found risks → surface them in analysis_text Recommendations or reply.
```

Key constraint: the THINK phase is a structured internal monologue. It is not streamed, not included in JSON output, and not paraphrased back to the user. It exists solely to force the model to simulate the system before committing to output.

---

## Section 1 — Architecture Generator THINK Block

File: `backend/app/prompts/architecture_prompt.py`

Added before PRE-PLAN in the SYSTEM_PROMPT assembly.

```
THINK (internal, before any PRE-PLAN or JSON):

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
    → Missing auth layer?     → add AuthService between client and API
    → Missing async work?     → add Queue + Worker if any "background" signal
    → Missing CDN?            → add if static assets or global users mentioned
    → Single DB for everything? → flag as SPOF risk in analysis_text
    → No rate limiting?       → add API Gateway if high-traffic signal

  Trade-off justification (one line per major component):
    → "Redis over Memcached: user mentioned pub/sub"
    → "Kafka over SQS: event replay requirement implied"
    → "RDS over DynamoDB: relational joins needed for e-commerce orders"

  Feasibility pre-check:
    → SPOF: any single node with no redundancy carrying critical traffic?
    → Auth gap: any path from client to datastore without a security node?
    → Layer violation: any datastore connecting directly to client?
    → Scale ceiling: any service with 5+ inbound edges (split it)?
```

Trade-off justification lines and any SPOF/auth gaps surface in `analysis_text` Recommendations — the user sees senior-dev reasoning without seeing the raw trace.

---

## Section 2 — Chat Assistant THINK Block

File: `backend/app/routers/chat.py`

Replaces the existing REASONING TRACE block with a richer structured version.

```
THINK (internal, before JSON):

  Intent (map vague language to concrete operations):
    → "make it faster"     → add Redis cache between API and DB
    → "make it async"      → add Queue + Worker, remove sync edge
    → "simplify this"      → identify node with most edges, propose split or remove
    → "add monitoring"     → add Prometheus node connected to all services
    → "add auth"           → add AuthService between client and first service
    → "make it serverless" → replace service nodes with Lambda, remove always-on infra
    → "scale this"         → add Load Balancer before primary service, add replica DB

  Impact:
    → What does this action break or improve?
      Adding a node between two connected nodes → the old direct edge becomes stale
      Removing a hub node → all its edges become dangling
      Renaming → downstream edges still use old label → must update

  Dependency order:
    → Does this action require a prerequisite?
      add_edge before add_node → dangling reference (fix: reorder)
      remove_edge after remove_node → already gone (skip)
      replace_node → preserves edges (correct); remove+add → destroys edges (wrong)

  Confidence:
    → Am I certain which existing node the user means?
      Certain (one match) → act, state decision in reply
      Uncertain (2+ matches) → ask (Tier 2 ambiguity)
      No match → explain what's missing, actions: []
```

---

## Section 3 — Intent Gate THINK Block

File: `backend/app/main.py`

Added before the CASE classification.

```
THINK (internal):

  CASE 1 signal words: build, design, create, generate, make me, I need,
                       show me, diagram, architect, system for, app that
  CASE 2 signal words: what is, how does, explain, difference between,
                       when to use, best practice, pros and cons
  CASE 3 signal words: hi, hello, hey, how are you, good morning
  → No signal words? → check if sentence contains a noun + verb describing
                       a system behaviour → CASE 1

  Ambiguity resolution:
    → "What would X look like?" → CASE 1 (implies diagram)
    → "How do I build X?" → CASE 1 (intent is to create)
    → "What is X?" alone → CASE 2 (pure knowledge question)
    → Tie → always CASE 1
```

---

## Section 4 — Icon Preload THINK Block

File: `backend/app/graph/nodes.py`

Added before the TASK section.

```
THINK (internal):

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

Enforcing the priority ordering before any `lookup_icon` calls prevents over-inference (currently 8+ icon calls for simple requests).

---

## File Map

| File | Change type |
|---|---|
| `backend/app/prompts/architecture_prompt.py` | Add `SENIOR_THINK` constant, insert before PRE-PLANNING in SYSTEM_PROMPT assembly |
| `backend/app/routers/chat.py` | Replace existing REASONING TRACE block with richer THINK block |
| `backend/app/main.py` | Add THINK block before CASE classification in `_INTENT_GATE_PROMPT` |
| `backend/app/graph/nodes.py` | Add THINK block before TASK section in `_ICON_PRELOAD_PROMPT` |
| `backend/tests/test_prompts.py` | Add ~10 new sentinel-string tests |

---

## Testing Strategy

All THINK blocks are internal — tested via sentinel strings in the prompt constants. No LLM calls required.

**New tests:**

```python
# Architecture Generator
test_architecture_think_block_has_pattern_classification()
  → "monolith" in SYSTEM_PROMPT, "event-driven" in SYSTEM_PROMPT, "CQRS" in SYSTEM_PROMPT

test_architecture_think_block_has_intent_gap_fill()
  → "Missing auth layer" in SYSTEM_PROMPT
  → "Missing async work" in SYSTEM_PROMPT
  → "SPOF" in SYSTEM_PROMPT

test_architecture_think_block_has_tradeoff_justification()
  → "Trade-off justification" in SYSTEM_PROMPT
  → "Redis over Memcached" in SYSTEM_PROMPT

# Chat Assistant
test_chat_think_block_has_intent_mapping()
  → "make it faster" in CHAT_SYSTEM_PROMPT
  → "make it async" in CHAT_SYSTEM_PROMPT
  → "make it serverless" in CHAT_SYSTEM_PROMPT

test_chat_think_block_has_impact_analysis()
  → "Impact" in CHAT_SYSTEM_PROMPT
  → "dangling" in CHAT_SYSTEM_PROMPT

# Intent Gate
test_intent_gate_think_block_has_signal_words()
  → "CASE 1 signal words" in _INTENT_GATE_PROMPT
  → "CASE 2 signal words" in _INTENT_GATE_PROMPT

# Icon Preload
test_icon_preload_think_block_has_stack_classification()
  → "Stack classification" in _ICON_PRELOAD_PROMPT
  → "Component priority" in _ICON_PRELOAD_PROMPT
```

**Total: ~10 new tests.** All follow the existing fast, deterministic, no-LLM pattern.

---

## Constraints

- No new files except tests (SENIOR_THINK is a constant in `architecture_prompt.py`, not a new module)
- No schema changes, no frontend changes, no workflow topology changes
- No backwards-incompatible changes — THINK blocks are additive to existing prompt structure
- Each task is independently testable and committable
