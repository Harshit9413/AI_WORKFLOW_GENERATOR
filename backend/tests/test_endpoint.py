from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.schemas import DiagramEdge, DiagramNode, DiagramResponse, NodeData, NodePosition


def make_mock_diagram() -> DiagramResponse:
    return DiagramResponse(
        nodes=[
            DiagramNode(id="1", position=NodePosition(x=50, y=200), data=NodeData(label="User")),
            DiagramNode(id="2", position=NodePosition(x=250, y=200), data=NodeData(label="FastAPI")),
            DiagramNode(id="3", position=NodePosition(x=450, y=100), data=NodeData(label="Redis")),
        ],
        edges=[
            DiagramEdge(id="e1-2", source="1", target="2"),
            DiagramEdge(id="e2-3", source="2", target="3"),
        ],
    )


def test_generate_diagram_returns_200_with_valid_diagram():
    from app.main import app
    from app.auth.router import get_current_user
    from app.models import User

    fake_user = User(id=1, email="test@test.com", password_hash="x")
    app.dependency_overrides[get_current_user] = lambda: fake_user

    mock_result = {
        "prompt": "FastAPI with Redis",
        "parsed_components": ["FastAPI", "with", "Redis"],
        "diagram": make_mock_diagram(),
        "error": None,
    }
    with patch("app.main.langgraph_workflow") as mock_wf:
        mock_wf.invoke.return_value = mock_result
        client = TestClient(app)
        resp = client.post("/generate-diagram", json={"prompt": "FastAPI with Redis"})

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    data = resp.json()
    assert len(data["nodes"]) == 3
    assert len(data["edges"]) == 2
    assert data["nodes"][0]["data"]["label"] == "User"


def test_generate_diagram_returns_422_on_validation_error():
    from app.main import app
    from app.auth.router import get_current_user
    from app.models import User

    fake_user = User(id=1, email="test@test.com", password_hash="x")
    app.dependency_overrides[get_current_user] = lambda: fake_user

    mock_result = {
        "prompt": "bad prompt",
        "parsed_components": [],
        "diagram": None,
        "error": "Diagram has no nodes",
    }
    with patch("app.main.langgraph_workflow") as mock_wf:
        mock_wf.invoke.return_value = mock_result
        client = TestClient(app)
        resp = client.post("/generate-diagram", json={"prompt": "bad prompt"})

    app.dependency_overrides.clear()

    assert resp.status_code == 422
    assert "no nodes" in resp.json()["detail"].lower()


def test_generate_diagram_returns_node_type_in_response():
    from app.main import app
    from app.auth.router import get_current_user
    from app.models import User

    fake_user = User(id=1, email="test@test.com", password_hash="x")
    app.dependency_overrides[get_current_user] = lambda: fake_user

    mock_result = {
        "prompt": "FastAPI with Redis",
        "parsed_components": ["FastAPI", "Redis"],
        "diagram": DiagramResponse(
            nodes=[
                DiagramNode(id="1", position=NodePosition(x=50, y=200), data=NodeData(label="User", node_type="client")),
                DiagramNode(id="2", position=NodePosition(x=250, y=200), data=NodeData(label="FastAPI", node_type="service")),
            ],
            edges=[DiagramEdge(id="e1-2", source="1", target="2")],
        ),
        "error": None,
    }
    with patch("app.main.langgraph_workflow") as mock_wf:
        mock_wf.invoke.return_value = mock_result
        client = TestClient(app)
        resp = client.post("/generate-diagram", json={"prompt": "FastAPI with Redis"})

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    nodes = resp.json()["nodes"]
    assert nodes[0]["data"]["node_type"] == "client"
    assert nodes[1]["data"]["node_type"] == "service"


def test_health_check():
    from app.main import app
    client = TestClient(app)
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_workflow_save_and_load_preserves_icon_url():
    """Verify that relative icon_url is preserved exactly through save → load.

    The frontend must strip BASE_URL before saving so that the stored value is
    always a relative path (e.g. /static/icons/redis.svg).  On reload the
    frontend prepends BASE_URL once.  If the full URL were saved, reload would
    double-prepend it and produce a broken URL, causing the fallback icon.
    """
    from app.main import app
    from app.auth.router import get_current_user
    from app.models import User

    fake_user = User(id=99, email="icontest@test.com", password_hash="x")
    app.dependency_overrides[get_current_user] = lambda: fake_user

    client = TestClient(app)

    nodes_to_save = [
        {
            "id": "1",
            "type": "default",
            "position": {"x": 50, "y": 200},
            "data": {"label": "Redis", "node_type": "datastore", "icon_url": "/static/icons/redis.svg"},
        },
        {
            "id": "2",
            "type": "default",
            "position": {"x": 250, "y": 200},
            "data": {"label": "Unknown", "node_type": "service", "icon_url": None},
        },
    ]

    # Save workflow with relative icon_url
    save_resp = client.post("/workflows/save", json={
        "prompt": "test icon url",
        "nodes": nodes_to_save,
        "edges": [],
    })
    assert save_resp.status_code == 200
    wf_id = save_resp.json()["id"]

    # Load and verify icon_url is returned unchanged
    load_resp = client.get(f"/workflows/{wf_id}")
    assert load_resp.status_code == 200
    loaded_nodes = load_resp.json()["nodes"]

    assert loaded_nodes[0]["data"]["icon_url"] == "/static/icons/redis.svg", (
        "relative icon_url must round-trip unchanged so frontend can prepend BASE_URL exactly once"
    )
    assert loaded_nodes[1]["data"]["icon_url"] is None

    app.dependency_overrides.clear()
