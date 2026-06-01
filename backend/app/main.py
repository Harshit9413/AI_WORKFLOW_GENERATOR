import json
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

load_dotenv(Path(__file__).parent.parent / ".env", override=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

from app.auth.router import get_current_user, router as auth_router
from app.database import get_db, init_db
from app.graph.workflow import create_workflow
from app.models import User
from app.prompts.constitution import CONSTITUTION
from app.routers.chat import router as chat_router
from app.routers.share import router as share_router
from app.routers.workflow import router as workflow_router
from app.schemas import DiagramResponse, GenerateRequest

app = FastAPI()

_ICONS_DIR = Path(__file__).parent.parent.parent / "icons"
app.mount("/static/icons", StaticFiles(directory=str(_ICONS_DIR)), name="icons")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin"],
)

app.include_router(auth_router)
app.include_router(workflow_router)
app.include_router(share_router)
app.include_router(chat_router)

langgraph_workflow = create_workflow()

_GREETING_WORDS = frozenset({
    "hi", "hello", "hey", "hola", "howdy", "sup", "yo", "greetings",
    "morning", "evening", "afternoon", "night", "heya", "hiya",
})
_GREETING_REPLY = (
    "Hi! I'm an AI that generates software architecture diagrams. "
    "Describe a system you'd like to design — for example, "
    "'a microservices e-commerce backend on AWS'."
)

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


async def _intent_gate(prompt: str) -> tuple[bool, str]:
    """Return (is_architecture, friendly_reply).

    Fast heuristic for obvious greetings; LLM for ambiguous cases.
    """
    words = prompt.strip().lower().rstrip(".,!?").split()
    if 1 <= len(words) <= 2 and all(w.rstrip(".,!?").lower() in _GREETING_WORDS for w in words):
        return False, _GREETING_REPLY

    llm = ChatOpenAI(
        model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
        temperature=0,
        max_tokens=512,
        base_url=os.getenv("OPENAI_BASE_URL", "https://openrouter.ai/api/v1"),
        api_key=os.getenv("OPENAI_API_KEY"),
    )
    response = await llm.ainvoke([
        SystemMessage(content=_INTENT_GATE_PROMPT),
        HumanMessage(content=prompt),
    ])
    reply = response.content.strip()
    if reply.upper() == "GENERATE":
        return True, ""
    return False, reply


NODE_LABELS: dict[str, str] = {
    "parse_prompt":          "Parsing prompt...",
    "icon_preload":          "Resolving icons...",
    "rag_retrieve":          "Retrieving patterns...",
    "generate_architecture": "Generating diagram...",
    "validate":              "Validating...",
    "resolve_icons":         "Finalizing icons...",
}


def _sse(data: dict) -> bytes:
    return f"data: {json.dumps(data)}\n\n".encode()


async def _stream_generate(prompt: str):
    is_architecture, friendly_reply = await _intent_gate(prompt)
    if not is_architecture:
        yield _sse({"type": "chat", "reply": friendly_reply})
        return

    input_state = {
        "prompt": prompt,
        "parsed_components": [],
        "diagram": None,
        "error": None,
        "icon_map": {},
        "retrieved_examples": [],
    }
    final_state = None
    try:
        async for event in langgraph_workflow.astream_events(input_state, version="v2"):
            name = event.get("name", "")
            evt = event.get("event", "")
            if evt == "on_chain_start" and name in NODE_LABELS:
                yield _sse({"type": "step", "label": NODE_LABELS[name]})
            elif evt == "on_chain_end" and name == "resolve_icons":
                out = event.get("data", {}).get("output", {})
                if isinstance(out, dict):
                    final_state = out

        if final_state is None:
            yield _sse({"type": "error", "message": "Pipeline produced no output"})
            return
        if final_state.get("error"):
            yield _sse({"type": "error", "message": final_state["error"]})
            return
        diagram = final_state.get("diagram")
        if not diagram:
            yield _sse({"type": "error", "message": "No diagram generated"})
            return

        yield _sse({
            "type": "done",
            "nodes": [n.model_dump() for n in diagram.nodes],
            "edges": [e.model_dump() for e in diagram.edges],
            "analysis_text": diagram.analysis_text,
        })
    except Exception as e:
        logger.exception("Streaming generation failed")
        yield _sse({"type": "error", "message": str(e)})


@app.on_event("startup")
def startup():
    init_db()
    key = os.getenv("OPENAI_API_KEY", "")
    logger.info("Workflow database initialized")
    logger.info("OPENAI_API_KEY: %s", f"{key[:8]}...{key[-4:]}" if len(key) > 12 else ("SET" if key else "NOT SET"))


@app.get("/")
def health_check():
    return {"status": "ok", "service": "AI Platform"}


@app.post("/generate-diagram", response_model=DiagramResponse)
def generate_diagram(
    request: GenerateRequest,
    current_user: User = Depends(get_current_user),
):
    logger.info("Prompt: %r from user %d", request.prompt, current_user.id)
    result = langgraph_workflow.invoke(
        {
            "prompt": request.prompt,
            "parsed_components": [],
            "diagram": None,
            "error": None,
            "icon_map": {},
            "retrieved_examples": [],
        }
    )
    if result.get("error"):
        raise HTTPException(status_code=422, detail=result["error"])
    return result["diagram"]


@app.post("/generate-diagram/stream")
async def generate_diagram_stream(
    request: GenerateRequest,
    current_user: User = Depends(get_current_user),
):
    logger.info("Stream prompt: %r from user %d", request.prompt, current_user.id)
    return StreamingResponse(
        _stream_generate(request.prompt),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
