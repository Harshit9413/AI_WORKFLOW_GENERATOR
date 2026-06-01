# AI Architecture Diagram Generator

A proof-of-concept that converts a natural language architecture prompt into an interactive, editable diagram.

**Type:** `"FastAPI with Redis and PostgreSQL"` → get a draggable, zoomable architecture diagram.

---

## How It Works

### LangGraph Flow (Backend AI)

The backend uses a **LangGraph StateGraph** with 3 sequential nodes:

```
parse_prompt_node → architecture_generator_node → validation_node
```

1. **`parse_prompt_node`** — tokenizes the raw prompt for logging. Passes the full prompt forward.
2. **`architecture_generator_node`** — calls `gpt-4o-mini` via LangChain's `with_structured_output(DiagramResponse)`. The LLM must return a Pydantic-validated `{ nodes, edges }` object — no JSON parsing needed.
3. **`validation_node`** — checks that nodes list is non-empty and all edge `source`/`target` IDs reference existing nodes.

**LangSmith tracing** is enabled automatically when `LANGCHAIN_TRACING_V2=true` is set. Every node execution, LLM call, and error appears in your LangSmith dashboard at https://smith.langchain.com — no extra code required. LangSmith is useful because it shows exactly what the LLM was prompted with, what it returned, how long it took, and where the workflow failed if something went wrong.

### React Flow Rendering (Frontend)

React Flow receives `{ nodes, edges }` from the backend and renders a draggable canvas:

- **`useNodesState` / `useEdgesState`** — React Flow's built-in state hooks that handle drag updates automatically.
- **`EditableNode`** — a custom node component that renders a `contentEditable` div. On blur, it calls `setNodes` to update the label in state.
- **`onConnect`** — lets users draw new edges by dragging from a node's Handle.

### Frontend ↔ Backend Communication

The frontend makes a plain `fetch` POST to `http://localhost:8000/generate-diagram` with `{ "prompt": "..." }` and receives `{ "nodes": [...], "edges": [...] }`. No WebSockets, no authentication — just a single HTTP request per diagram.

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- An OpenAI API key (https://platform.openai.com/api-keys)
- (Optional) A LangSmith account (https://smith.langchain.com)

---

## Setup

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and set OPENAI_API_KEY=sk-<your-key>
```

### Frontend

```bash
cd frontend
npm install
```

---

## Running Locally

```bash
# Terminal 1 — backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm run dev
```

Open http://localhost:5173

---

## LangSmith Setup (Optional)

1. Sign up at https://smith.langchain.com
2. Create a project named `ai-architecture-generator`
3. Copy your API key
4. In `backend/.env`, set:

```
LANGCHAIN_API_KEY=ls-<your-key>
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=ai-architecture-generator
```

5. Restart the backend. Generate a diagram. Visit your LangSmith dashboard to see the full execution trace — each node's input/output, the LLM prompt, token usage, and timing.

**Why LangSmith?** When the LLM returns unexpected output or a node fails, LangSmith shows you exactly what happened at every step. For a 3-node graph, this is the difference between "it broke somehow" and "the LLM returned a node with id='1a' but the prompt said use numeric IDs."

---

## Running Tests

```bash
cd backend
source venv/bin/activate
python -m pytest tests/ -v
```

---

## Sample Prompts

- `FastAPI with Redis and PostgreSQL`
- `React frontend with Node.js API, MongoDB, and S3 file storage`
- `Microservices with API Gateway, Auth Service, User Service, Kafka, and PostgreSQL`
- `Django app with Celery workers, Redis queue, and RDS database`
- `Next.js frontend, FastAPI backend, Pinecone vector database, and OpenAI embeddings`
# AI_WORKFLOW_GENERATOR
