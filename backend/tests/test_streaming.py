import json
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.schemas import DiagramEdge, DiagramNode, DiagramResponse, NodeData, NodePosition


def _make_diagram():
    return DiagramResponse(
        nodes=[DiagramNode(id="1", position=NodePosition(x=60, y=240), data=NodeData(label="User", node_type="client"))],
        edges=[],
        analysis_text="Test analysis",
    )


def _fake_user():
    from app.models import User
    return User(id=1, email="test@test.com", password_hash="x")


async def _fake_stream_all_nodes(input_state, version="v2"):
    mock_diagram = _make_diagram()
    for name in ["parse_prompt", "icon_preload", "rag_retrieve", "generate_architecture", "validate"]:
        yield {"event": "on_chain_start", "name": name, "data": {}}
        yield {"event": "on_chain_end", "name": name, "data": {"output": {}}}
    yield {"event": "on_chain_start", "name": "resolve_icons", "data": {}}
    yield {"event": "on_chain_end", "name": "resolve_icons", "data": {
        "output": {"diagram": mock_diagram, "error": None, "retrieved_examples": []}
    }}


def _parse_sse(response) -> list[dict]:
    events = []
    for line in response.iter_lines():
        if line.startswith("data: "):
            events.append(json.loads(line[6:]))
    return events


async def _fake_intent_gate_proceed(prompt):
    return (True, "")


def test_stream_returns_text_event_stream_content_type():
    from app.auth.router import get_current_user
    from app.main import app
    app.dependency_overrides[get_current_user] = _fake_user
    with patch("app.main._intent_gate", _fake_intent_gate_proceed), \
         patch("app.main.langgraph_workflow") as mock_wf:
        mock_wf.astream_events = _fake_stream_all_nodes
        with TestClient(app).stream("POST", "/generate-diagram/stream", json={"prompt": "test"}) as resp:
            assert resp.status_code == 200
            assert "text/event-stream" in resp.headers["content-type"]
    app.dependency_overrides.clear()


def test_stream_emits_six_step_events_in_order():
    from app.auth.router import get_current_user
    from app.main import app
    app.dependency_overrides[get_current_user] = _fake_user
    with patch("app.main._intent_gate", _fake_intent_gate_proceed), \
         patch("app.main.langgraph_workflow") as mock_wf:
        mock_wf.astream_events = _fake_stream_all_nodes
        with TestClient(app).stream("POST", "/generate-diagram/stream", json={"prompt": "test"}) as resp:
            events = _parse_sse(resp)
    app.dependency_overrides.clear()

    step_events = [e for e in events if e["type"] == "step"]
    assert len(step_events) == 6
    assert step_events[0]["label"] == "Parsing prompt..."
    assert step_events[5]["label"] == "Finalizing icons..."


def test_stream_emits_done_event_with_nodes_edges_analysis():
    from app.auth.router import get_current_user
    from app.main import app
    app.dependency_overrides[get_current_user] = _fake_user
    with patch("app.main._intent_gate", _fake_intent_gate_proceed), \
         patch("app.main.langgraph_workflow") as mock_wf:
        mock_wf.astream_events = _fake_stream_all_nodes
        with TestClient(app).stream("POST", "/generate-diagram/stream", json={"prompt": "test"}) as resp:
            events = _parse_sse(resp)
    app.dependency_overrides.clear()

    done_events = [e for e in events if e["type"] == "done"]
    assert len(done_events) == 1
    assert done_events[0]["nodes"][0]["data"]["label"] == "User"
    assert done_events[0]["analysis_text"] == "Test analysis"
    assert isinstance(done_events[0]["edges"], list)


def test_stream_emits_error_event_on_pipeline_exception():
    from app.auth.router import get_current_user
    from app.main import app
    app.dependency_overrides[get_current_user] = _fake_user

    async def _boom(input_state, version="v2"):
        yield {"event": "on_chain_start", "name": "parse_prompt", "data": {}}
        raise RuntimeError("pipeline exploded")

    with patch("app.main._intent_gate", _fake_intent_gate_proceed), \
         patch("app.main.langgraph_workflow") as mock_wf:
        mock_wf.astream_events = _boom
        with TestClient(app).stream("POST", "/generate-diagram/stream", json={"prompt": "test"}) as resp:
            events = _parse_sse(resp)
    app.dependency_overrides.clear()

    error_events = [e for e in events if e["type"] == "error"]
    assert len(error_events) == 1
    assert "pipeline exploded" in error_events[0]["message"]


def test_stream_emits_error_when_pipeline_sets_error_field():
    from app.auth.router import get_current_user
    from app.main import app
    app.dependency_overrides[get_current_user] = _fake_user

    async def _error_state(input_state, version="v2"):
        yield {"event": "on_chain_start", "name": "parse_prompt", "data": {}}
        yield {"event": "on_chain_end", "name": "resolve_icons", "data": {
            "output": {"diagram": None, "error": "No nodes in diagram", "retrieved_examples": []}
        }}

    with patch("app.main._intent_gate", _fake_intent_gate_proceed), \
         patch("app.main.langgraph_workflow") as mock_wf:
        mock_wf.astream_events = _error_state
        with TestClient(app).stream("POST", "/generate-diagram/stream", json={"prompt": "test"}) as resp:
            events = _parse_sse(resp)
    app.dependency_overrides.clear()

    error_events = [e for e in events if e["type"] == "error"]
    assert len(error_events) == 1
    assert "No nodes" in error_events[0]["message"]
