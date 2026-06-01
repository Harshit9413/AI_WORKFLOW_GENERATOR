from langgraph.graph import StateGraph, END

from app.graph.nodes import (
    architecture_generator_node,
    icon_preload_node,
    icon_resolver_node,
    parse_prompt_node,
    rag_retrieve_node,
    validation_node,
)
from app.graph.state import GraphState


def create_workflow():
    graph = StateGraph(GraphState)

    graph.add_node("parse_prompt",          parse_prompt_node)
    graph.add_node("icon_preload",          icon_preload_node)
    graph.add_node("rag_retrieve",          rag_retrieve_node)
    graph.add_node("generate_architecture", architecture_generator_node)
    graph.add_node("validate",              validation_node)
    graph.add_node("resolve_icons",         icon_resolver_node)

    graph.set_entry_point("parse_prompt")
    # Fan-out: icon_preload and rag_retrieve run concurrently after parse_prompt
    graph.add_edge("parse_prompt",          "icon_preload")
    graph.add_edge("parse_prompt",          "rag_retrieve")
    # Fan-in: generate_architecture waits for both to complete
    graph.add_edge("icon_preload",          "generate_architecture")
    graph.add_edge("rag_retrieve",          "generate_architecture")
    graph.add_edge("generate_architecture", "validate")
    graph.add_edge("validate",              "resolve_icons")
    graph.add_edge("resolve_icons",         END)

    return graph.compile()
