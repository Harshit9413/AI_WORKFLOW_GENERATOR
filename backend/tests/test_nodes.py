import pytest
from app.graph.state import GraphState
from app.schemas import DiagramResponse, DiagramNode, DiagramEdge, NodePosition, NodeData


def make_state(**kwargs) -> GraphState:
    return {
        "prompt": "FastAPI with Redis",
        "parsed_components": [],
        "diagram": None,
        "error": None,
        "icon_map": {},
        "retrieved_examples": [],
        **kwargs,
    }


def make_diagram(nodes=None, edges=None) -> DiagramResponse:
    nodes = nodes or [
        DiagramNode(id="1", position=NodePosition(x=50, y=200), data=NodeData(label="User")),
        DiagramNode(id="2", position=NodePosition(x=250, y=200), data=NodeData(label="FastAPI")),
    ]
    edges = edges or [DiagramEdge(id="e1-2", source="1", target="2")]
    return DiagramResponse(nodes=nodes, edges=edges)


def test_parse_prompt_node_returns_state_with_parsed_components():
    from app.graph.nodes import parse_prompt_node
    state = make_state(prompt="FastAPI with Redis and PostgreSQL")
    result = parse_prompt_node(state)
    assert "parsed_components" in result
    assert isinstance(result["parsed_components"], list)
    assert len(result["parsed_components"]) > 0


def test_parse_prompt_node_returns_only_parsed_components():
    from app.graph.nodes import parse_prompt_node
    state = make_state(prompt="Nginx proxy with Django")
    result = parse_prompt_node(state)
    # Nodes now return only the keys they update (LangGraph merges the rest)
    assert set(result.keys()) == {"parsed_components"}
    assert isinstance(result["parsed_components"], list)


def test_validation_node_passes_valid_diagram():
    from app.graph.nodes import validation_node
    state = make_state(diagram=make_diagram())
    result = validation_node(state)
    assert result.get("error") is None


def test_validation_node_catches_empty_nodes():
    from app.graph.nodes import validation_node
    diagram = DiagramResponse(nodes=[], edges=[])
    state = make_state(diagram=diagram)
    result = validation_node(state)
    assert result.get("error") is not None


def test_validation_node_catches_edge_with_unknown_source():
    from app.graph.nodes import validation_node
    diagram = make_diagram(
        nodes=[DiagramNode(id="1", position=NodePosition(x=50, y=100), data=NodeData(label="User"))],
        edges=[DiagramEdge(id="e1-99", source="1", target="99")],
    )
    state = make_state(diagram=diagram)
    result = validation_node(state)
    assert result.get("error") is not None


def test_validation_node_catches_edge_with_unknown_target():
    from app.graph.nodes import validation_node
    diagram = make_diagram(
        nodes=[DiagramNode(id="1", position=NodePosition(x=50, y=100), data=NodeData(label="User"))],
        edges=[DiagramEdge(id="e99-1", source="99", target="1")],
    )
    state = make_state(diagram=diagram)
    result = validation_node(state)
    assert result.get("error") is not None


def test_validation_node_sets_no_error_for_no_edges():
    from app.graph.nodes import validation_node
    diagram = DiagramResponse(
        nodes=[DiagramNode(id="1", position=NodePosition(x=50, y=100), data=NodeData(label="API"))],
        edges=[],
    )
    state = make_state(diagram=diagram)
    result = validation_node(state)
    assert result.get("error") is None


# node_type tests
def test_node_data_accepts_valid_node_type():
    node = NodeData(label="User", node_type="client")
    assert node.node_type == "client"


def test_node_data_defaults_node_type_to_service():
    node = NodeData(label="FastAPI")
    assert node.node_type == "service"


def test_node_data_rejects_invalid_node_type():
    with pytest.raises(Exception):
        NodeData(label="Unknown", node_type="invalid_type")


def test_node_data_accepts_all_valid_types():
    valid_types = ["client", "service", "datastore", "queue", "security", "storage", "cloud"]
    for t in valid_types:
        node = NodeData(label="Test", node_type=t)
        assert node.node_type == t


def test_node_data_icon_url_defaults_to_none():
    node = NodeData(label="AWS Lambda")
    assert node.icon_url is None


def test_node_data_icon_url_accepts_string():
    node = NodeData(label="AWS Lambda", icon_url="/static/icons/aws-lambda.svg")
    assert node.icon_url == "/static/icons/aws-lambda.svg"


def test_icon_resolver_node_populates_icon_url_for_known_service(monkeypatch):
    from app.graph import icon_resolver
    from app.graph.nodes import icon_resolver_node
    monkeypatch.setattr(icon_resolver, "_INDEX", {"redis": "redis.svg"})
    diagram = make_diagram(
        nodes=[
            DiagramNode(id="1", position=NodePosition(x=0, y=0), data=NodeData(label="Redis")),
        ],
        edges=[],
    )
    state = make_state(diagram=diagram)
    result = icon_resolver_node(state)
    icon_url = result["diagram"].nodes[0].data.icon_url
    assert icon_url == "/static/icons/redis.svg"


def test_icon_resolver_node_leaves_none_for_unknown_service():
    from app.graph.nodes import icon_resolver_node
    diagram = make_diagram(
        nodes=[
            DiagramNode(id="1", position=NodePosition(x=0, y=0), data=NodeData(label="zxqyfoo99")),
        ],
        edges=[],
    )
    state = make_state(diagram=diagram)
    result = icon_resolver_node(state)
    icon_url = result["diagram"].nodes[0].data.icon_url
    assert icon_url is None


def test_icon_resolver_node_returns_only_diagram():
    from app.graph.nodes import icon_resolver_node
    state = make_state(diagram=make_diagram())
    result = icon_resolver_node(state)
    # Nodes now return only the keys they update
    assert set(result.keys()) == {"diagram"}


def test_icon_resolver_node_returns_empty_dict_when_diagram_is_none():
    from app.graph.nodes import icon_resolver_node
    state = make_state(diagram=None, error="Diagram has no nodes")
    result = icon_resolver_node(state)
    # Early return: nothing to update, LangGraph keeps existing state
    assert result == {}


def test_rag_retrieve_node_populates_retrieved_examples(monkeypatch):
    from app.rag import store
    from app.graph.nodes import rag_retrieve_node
    monkeypatch.setattr(store, "query_patterns", lambda prompt, n_results=2: ["Pattern A", "Pattern B"])
    state = make_state(prompt="ecommerce store")
    result = rag_retrieve_node(state)
    assert result["retrieved_examples"] == ["Pattern A", "Pattern B"]


def test_rag_retrieve_node_returns_empty_list_on_store_failure(monkeypatch):
    from app.rag import store
    from app.graph.nodes import rag_retrieve_node
    monkeypatch.setattr(store, "query_patterns", lambda prompt, n_results=2: [])
    state = make_state(prompt="anything")
    result = rag_retrieve_node(state)
    assert result["retrieved_examples"] == []


def test_rag_retrieve_node_returns_only_retrieved_examples(monkeypatch):
    from app.rag import store
    from app.graph.nodes import rag_retrieve_node
    monkeypatch.setattr(store, "query_patterns", lambda prompt, n_results=2: ["P1"])
    state = make_state(prompt="kafka pipeline", icon_map={"kafka": "/static/icons/kafka.svg"})
    result = rag_retrieve_node(state)
    # Nodes now return only the keys they update (LangGraph merges the rest)
    assert set(result.keys()) == {"retrieved_examples"}
    assert result["retrieved_examples"] == ["P1"]
