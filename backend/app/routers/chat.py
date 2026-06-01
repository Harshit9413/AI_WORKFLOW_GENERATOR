import json
import logging
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

load_dotenv(Path(__file__).parent.parent.parent / ".env", override=True)
from pydantic import BaseModel

from app.auth.router import get_current_user
from app.graph.icon_resolver import resolve_icon
from app.models import User
from app.prompts.constitution import CONSTITUTION

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)


def _extract_json(text: str) -> dict | None:
    """Try multiple strategies to extract a JSON object from LLM output."""
    text = text.strip()

    # 1. Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 2. Strip markdown code fences
    if "```" in text:
        for part in text.split("```"):
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            if part.startswith("{"):
                try:
                    return json.loads(part)
                except json.JSONDecodeError:
                    pass

    # 3. Find first {...} block (handles "Here is my response: {...}")
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    return None

CHAT_SYSTEM_PROMPT = CONSTITUTION + """

You are a software architecture assistant. You handle TWO things only:
1. Architecture diagrams (analyze, modify nodes/edges)
2. Architecture concepts (patterns, services, infrastructure)

ALWAYS output valid JSON. No text outside JSON. No markdown fences.
{"reply": "<text>", "actions": [<action>, ...]}

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

═══ SCOPE GATE (apply after THINK, in order) ═══

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


def _build_context(nodes: list, edges: list) -> str:
    node_map = {n.get("id"): n.get("data", {}).get("label", n.get("id", "")) for n in nodes}
    node_lines = [
        f"  {i}. \"{n.get('data', {}).get('label', '')}\" [type={n.get('data', {}).get('node_type', 'service')}]"
        for i, n in enumerate(nodes, 1)
    ]
    edge_lines = []
    for e in edges:
        src = node_map.get(e.get("source"), e.get("source"))
        tgt = node_map.get(e.get("target"), e.get("target"))
        lbl = e.get("label", "")
        edge_lines.append(f"  - {src} → {tgt}" + (f" ({lbl})" if lbl else ""))
    parts = [f"Current diagram: {len(nodes)} nodes, {len(edges)} connections"]
    if node_lines:
        parts.append("Nodes:\n" + "\n".join(node_lines))
    if edge_lines:
        parts.append("Connections:\n" + "\n".join(edge_lines))
    return "\n\n".join(parts)


def _enrich_action_icons(actions: list) -> list:
    """Resolve icon_url for add_node, replace_node, and rename_node actions."""
    result = []
    for action in actions:
        if action.get("type") in ("add_node", "replace_node", "rename_node"):
            label = action.get("new_label") or action.get("label", "")
            if label:
                action = {**action, "icon_url": resolve_icon(label)}
        result.append(action)
    return result


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    nodes: list
    edges: list
    history: list[ChatMessage] = []

    model_config = {"extra": "ignore"}


class ChatResponse(BaseModel):
    reply: str
    actions: list = []


@router.post("/enhance", response_model=ChatResponse)
def chat_enhance(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        llm = ChatOpenAI(
            model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
            temperature=0,
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0,
            max_tokens=2048,
            base_url=os.getenv("OPENAI_BASE_URL", "https://openrouter.ai/api/v1"),
            api_key=os.getenv("OPENAI_API_KEY"),
        )

        context = _build_context(body.nodes, body.edges)
        messages = [SystemMessage(content=CHAT_SYSTEM_PROMPT)]

        for msg in body.history[-6:]:
            if msg.role == "user":
                messages.append(HumanMessage(content=msg.content))
            else:
                messages.append(AIMessage(content=msg.content))

        messages.append(HumanMessage(content=f"{context}\n\nUser: {body.message}"))

        raw = llm.invoke(messages).content.strip()
        logger.info("chat_enhance raw response: %s", raw[:200])

        parsed = _extract_json(raw)
        if parsed:
            return ChatResponse(
                reply=parsed.get("reply", ""),
                actions=_enrich_action_icons(parsed.get("actions", [])),
            )

        # Fallback: return raw text as reply with no actions
        logger.warning("chat_enhance: could not extract JSON from response, returning raw text")
        return ChatResponse(reply=raw, actions=[])
    except Exception as e:
        logger.error("chat_enhance error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI assistant error: {str(e)}")
