import json
import logging
import os
import time
from pathlib import Path

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI

load_dotenv(Path(__file__).parent.parent.parent / ".env", override=True)

from app.graph.icon_resolver import resolve_icon
from app.graph.state import GraphState
from app.graph.tools import lookup_icon
from app.prompts.architecture_prompt import SYSTEM_PROMPT, build_user_message
from app.prompts.constitution import CONSTITUTION
from app.schemas import DiagramResponse

logger = logging.getLogger(__name__)

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


def _llm(max_tokens: int = 2048) -> ChatOpenAI:
    return ChatOpenAI(
        model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
        temperature=0,
        top_p=1,
        frequency_penalty=0,
        presence_penalty=0,
        max_tokens=max_tokens,
        base_url=os.getenv("OPENAI_BASE_URL", "https://openrouter.ai/api/v1"),
        api_key=os.getenv("OPENAI_API_KEY"),
    )


def parse_prompt_node(state: GraphState) -> dict:
    prompt = state["prompt"]
    parsed = [word.strip(".,;:") for word in prompt.split() if len(word.strip(".,;:")) > 2]
    logger.info("parse_prompt_node: extracted %d tokens from prompt", len(parsed))
    return {"parsed_components": parsed}


def icon_preload_node(state: GraphState) -> GraphState:
    """Use the LLM as a tool-calling agent to pre-resolve icons for all
    technologies implied by the prompt — even those the user didn't name.

    The resulting icon_map (tech_name → icon_url) is passed to
    icon_resolver_node so it can match generated node labels robustly.
    """
    start = time.time()
    llm = _llm(max_tokens=512).bind_tools([lookup_icon])

    messages = [
        SystemMessage(content=_ICON_PRELOAD_PROMPT),
        HumanMessage(content=f"System to build: {state['prompt']}"),
    ]

    icon_map: dict[str, str] = {}
    MAX_ROUNDS = 6 

    for _ in range(MAX_ROUNDS):
        response = llm.invoke(messages)
        messages.append(response)

        if not response.tool_calls:
            break  
        for tc in response.tool_calls:
            svc = tc["args"].get("service_name", "").strip()
            if not svc:
                continue
            icon_url = resolve_icon(svc) or ""
            icon_map[svc.lower()] = icon_url
            messages.append(ToolMessage(content=icon_url or "not found", tool_call_id=tc["id"]))
            logger.debug("icon_preload: %r → %s", svc, icon_url or "(none)")

    elapsed_ms = (time.time() - start) * 1000
    resolved = sum(1 for v in icon_map.values() if v)
    logger.info(
        "icon_preload_node: %d technologies identified, %d icons resolved in %.0fms",
        len(icon_map), resolved, elapsed_ms,
    )
    return {"icon_map": icon_map}


def architecture_generator_node(state: GraphState) -> GraphState:
    start = time.time()
    llm = _llm(max_tokens=1500)
    structured_llm = llm.with_structured_output(DiagramResponse)

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=build_user_message(
            state["prompt"],
            state.get("retrieved_examples", []),
        )),
    ]

    diagram: DiagramResponse = structured_llm.invoke(messages)
    elapsed_ms = (time.time() - start) * 1000
    logger.info(
        "architecture_generator_node: generated %d nodes, %d edges in %.0fms",
        len(diagram.nodes),
        len(diagram.edges),
        elapsed_ms,
    )
    return {"diagram": diagram}


def validation_node(state: GraphState) -> dict:
    diagram = state.get("diagram")

    if not diagram or not diagram.nodes:
        logger.warning("validation_node: no nodes in diagram")
        return {"error": "Diagram has no nodes"}

    # Deduplicate labels: "Python", "Python 2", "Python 3"
    label_count: dict[str, int] = {}
    for node in diagram.nodes:
        label_count[node.data.label] = label_count.get(node.data.label, 0) + 1
    label_seen: dict[str, int] = {}
    for node in diagram.nodes:
        label = node.data.label
        if label_count[label] > 1:
            label_seen[label] = label_seen.get(label, 0) + 1
            if label_seen[label] > 1:
                node.data = node.data.model_copy(update={"label": f"{label} {label_seen[label]}"})
                logger.info("validation_node: renamed duplicate label → %r", node.data.label)

    node_ids = {node.id for node in diagram.nodes}
    for edge in diagram.edges:
        if edge.source not in node_ids:
            msg = f"Edge '{edge.id}' references unknown source node '{edge.source}'"
            logger.warning("validation_node: %s", msg)
            return {"error": msg}
        if edge.target not in node_ids:
            msg = f"Edge '{edge.id}' references unknown target node '{edge.target}'"
            logger.warning("validation_node: %s", msg)
            return {"error": msg}

    logger.info("validation_node: diagram is valid")
    return {}


def _match_icon_from_map(label: str, icon_map: dict[str, str]) -> str | None:
    """Find the best matching icon from the pre-loaded icon_map.

    Strategy: check whether any key in icon_map appears as a whole word inside
    the node label (case-insensitive).  This matches:
      "Django App"     → icon_map key "django"     → django.svg  ✓
      "Redis Queue"    → icon_map key "redis"       → redis.svg   ✓
      "Celery Workers" → icon_map key "celery"      → celery.svg  ✓
    """
    label_lower = label.lower()
    # Split label into word tokens for whole-word matching
    label_words = set(label_lower.replace("/", " ").replace("-", " ").split())

    for tech, url in icon_map.items():
        if not url:
            continue
        # Whole-word match: every word of the tech key appears in the label
        tech_words = set(tech.replace("-", " ").split())
        if tech_words & label_words:  # non-empty intersection
            return url

    return None


def icon_resolver_node(state: GraphState) -> dict:
    """Attach icon_url to every diagram node using a four-layer cascade:

    1. Direct resolve_icon(label)           — exact / fuzzy label match
    2. icon_map word-match                  — LLM-preloaded tech → icon
    3. resolve_icon on each label word      — "Redis Queue" → resolve("redis")
    4. None                                 — FontAwesome fallback in frontend
    """
    if state.get("error") or state["diagram"] is None:
        return {}

    diagram = state["diagram"]
    icon_map = state.get("icon_map", {})
    resolved = 0

    for node in diagram.nodes:
        label = node.data.label

        # Layer 1: direct fuzzy match on the full label
        icon = resolve_icon(label)

        # Layer 2: match via LLM-preloaded icon_map
        if not icon:
            icon = _match_icon_from_map(label, icon_map)

        # Layer 3: try each individual word of the label (≥4 chars)
        if not icon:
            for word in label.lower().replace("/", " ").split():
                if len(word) >= 4:
                    icon = resolve_icon(word)
                    if icon:
                        break

        node.data.icon_url = icon
        if icon:
            resolved += 1

    logger.info(
        "icon_resolver_node: %d/%d nodes got icons",
        resolved, len(diagram.nodes),
    )
    return {"diagram": diagram}


def rag_retrieve_node(state: GraphState) -> dict:
    from app.rag.store import query_patterns
    examples = query_patterns(state["prompt"])
    logger.info("rag_retrieve_node: retrieved %d examples", len(examples))
    return {"retrieved_examples": examples}
