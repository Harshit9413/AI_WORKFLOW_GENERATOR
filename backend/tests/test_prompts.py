def test_constitution_contains_identity_block():
    from app.prompts.constitution import CONSTITUTION
    assert "senior software architect assistant" in CONSTITUTION


def test_constitution_contains_scope_declaration():
    from app.prompts.constitution import CONSTITUTION
    assert "software architecture diagrams and architecture questions only" in CONSTITUTION


def test_constitution_contains_output_principles():
    from app.prompts.constitution import CONSTITUTION
    assert "Be specific" in CONSTITUTION
    assert "Be deterministic" in CONSTITUTION
    assert "Fail explicitly" in CONSTITUTION


def test_constitution_contains_hard_constraints():
    from app.prompts.constitution import CONSTITUTION
    assert "Never hallucinate" in CONSTITUTION
    assert "Never omit required output fields" in CONSTITUTION
    assert "Never include internal reasoning in the final output" in CONSTITUTION


def test_architecture_system_prompt_contains_constitution():
    from app.prompts.architecture_prompt import SYSTEM_PROMPT
    assert "senior software architect assistant" in SYSTEM_PROMPT
    assert "software architecture diagrams and architecture questions only" in SYSTEM_PROMPT
    # CONSTITUTION must appear before ROLE in the assembled prompt
    constitution_pos = SYSTEM_PROMPT.find("senior software architect assistant")
    role_pos = SYSTEM_PROMPT.find("expert software architect and graph layout engine")
    assert constitution_pos < role_pos, "CONSTITUTION must precede ROLE in SYSTEM_PROMPT"


def test_architecture_system_prompt_contains_rag_usage_section():
    from app.prompts.architecture_prompt import SYSTEM_PROMPT
    assert "RAG Pattern Usage" in SYSTEM_PROMPT
    assert "Do NOT copy their topology" in SYSTEM_PROMPT
    assert "Layer Architecture rules win" in SYSTEM_PROMPT


def test_architecture_system_prompt_contains_ambiguity_resolution():
    from app.prompts.architecture_prompt import SYSTEM_PROMPT
    assert "Ambiguity Resolution" in SYSTEM_PROMPT
    assert "React" in SYSTEM_PROMPT and "FastAPI" in SYSTEM_PROMPT
    assert "Never ask the user for clarification" in SYSTEM_PROMPT


def test_architecture_system_prompt_pre_planning_requires_output_block():
    from app.prompts.architecture_prompt import SYSTEM_PROMPT
    assert "PRE-PLAN" in SYSTEM_PROMPT
    assert "spine:" in SYSTEM_PROMPT
    assert "branches:" in SYSTEM_PROMPT
    assert "crossings_found:" in SYSTEM_PROMPT
    assert "node_count:" in SYSTEM_PROMPT


def test_architecture_system_prompt_validation_has_self_correction():
    from app.prompts.architecture_prompt import SYSTEM_PROMPT
    assert "SELF-CORRECTION" in SYSTEM_PROMPT
    assert "Maximum two correction passes" in SYSTEM_PROMPT


def test_architecture_system_prompt_analysis_has_length_caps():
    from app.prompts.architecture_prompt import SYSTEM_PROMPT
    assert "25 words" in SYSTEM_PROMPT
    assert "60 words" in SYSTEM_PROMPT


def test_build_user_message_requests_preplan_output():
    from app.prompts.architecture_prompt import build_user_message
    msg = build_user_message("FastAPI with Redis")
    assert "PRE-PLAN:" in msg
    assert "spine:" in msg
    assert "crossings_found:" in msg


def test_build_user_message_includes_retrieved_examples():
    from app.prompts.architecture_prompt import build_user_message
    msg = build_user_message("FastAPI with Redis", retrieved_examples=["Pattern A", "Pattern B"])
    assert "Pattern A" in msg
    assert "Pattern B" in msg
    assert "REFERENCE PATTERNS" in msg


def test_chat_prompt_contains_constitution():
    from app.routers.chat import CHAT_SYSTEM_PROMPT
    assert "senior software architect assistant" in CHAT_SYSTEM_PROMPT
    assert "software architecture diagrams and architecture questions only" in CHAT_SYSTEM_PROMPT


def test_chat_prompt_contains_reasoning_trace():
    from app.routers.chat import CHAT_SYSTEM_PROMPT
    assert "THINK" in CHAT_SYSTEM_PROMPT
    assert "never shown to user" in CHAT_SYSTEM_PROMPT


def test_chat_prompt_contains_case_zero_empty_diagram():
    from app.routers.chat import CHAT_SYSTEM_PROMPT
    assert "0 nodes, 0 edges" in CHAT_SYSTEM_PROMPT
    assert "No diagram is loaded yet" in CHAT_SYSTEM_PROMPT


def test_chat_prompt_case_three_allows_modifications():
    from app.routers.chat import CHAT_SYSTEM_PROMPT
    assert "make it async" in CHAT_SYSTEM_PROMPT
    assert "MODIFICATIONS" in CHAT_SYSTEM_PROMPT


def test_chat_prompt_contains_action_ordering_rule():
    from app.routers.chat import CHAT_SYSTEM_PROMPT
    assert "ACTION ORDERING" in CHAT_SYSTEM_PROMPT
    assert "add_node MUST precede" in CHAT_SYSTEM_PROMPT


def test_chat_prompt_contains_two_tier_ambiguity():
    from app.routers.chat import CHAT_SYSTEM_PROMPT
    assert "Tier 1" in CHAT_SYSTEM_PROMPT
    assert "Tier 2" in CHAT_SYSTEM_PROMPT
    assert "exactly ONE existing node" in CHAT_SYSTEM_PROMPT


def test_chat_prompt_contains_history_acknowledgement_rule():
    from app.routers.chat import CHAT_SYSTEM_PROMPT
    assert "don't have that in my current context" in CHAT_SYSTEM_PROMPT


def test_intent_gate_prompt_contains_constitution():
    from app.main import _INTENT_GATE_PROMPT
    assert "senior software architect assistant" in _INTENT_GATE_PROMPT
    assert "software architecture diagrams and architecture questions only" in _INTENT_GATE_PROMPT


def test_intent_gate_prompt_case2_has_output_contract():
    from app.main import _INTENT_GATE_PROMPT
    assert "2–4 plain sentences" in _INTENT_GATE_PROMPT
    assert "No markdown" in _INTENT_GATE_PROMPT
    assert "80 words" in _INTENT_GATE_PROMPT


def test_intent_gate_prompt_has_tie_breaker():
    from app.main import _INTENT_GATE_PROMPT
    assert "TIE-BREAKER" in _INTENT_GATE_PROMPT
    assert "choose CASE 1" in _INTENT_GATE_PROMPT


def test_intent_gate_prompt_case4_has_negative_example():
    from app.main import _INTENT_GATE_PROMPT
    assert "CORRECT" in _INTENT_GATE_PROMPT
    assert "INCORRECT" in _INTENT_GATE_PROMPT
    assert "never write literal brackets" in _INTENT_GATE_PROMPT


def test_intent_gate_prompt_has_fallback():
    from app.main import _INTENT_GATE_PROMPT
    assert "FALLBACK" in _INTENT_GATE_PROMPT
    assert "Never return an empty string" in _INTENT_GATE_PROMPT


def test_icon_preload_prompt_contains_constitution():
    from app.graph.nodes import _ICON_PRELOAD_PROMPT
    assert "senior software architect assistant" in _ICON_PRELOAD_PROMPT
    assert "software architecture diagrams and architecture questions only" in _ICON_PRELOAD_PROMPT


def test_icon_preload_prompt_has_component_cap():
    from app.graph.nodes import _ICON_PRELOAD_PROMPT
    assert "at most 4 components" in _ICON_PRELOAD_PROMPT


def test_icon_preload_prompt_has_no_retry_rule():
    from app.graph.nodes import _ICON_PRELOAD_PROMPT
    assert "not found" in _ICON_PRELOAD_PROMPT
    assert "do NOT retry" in _ICON_PRELOAD_PROMPT


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
    assert "Surface the winning justification" in SYSTEM_PROMPT  # add this line


def test_architecture_think_block_has_feasibility_precheck():
    from app.prompts.architecture_prompt import SYSTEM_PROMPT
    assert "Feasibility pre-check" in SYSTEM_PROMPT
    assert "Auth gap" in SYSTEM_PROMPT
    assert "Layer violation" in SYSTEM_PROMPT
    assert "Scale ceiling" in SYSTEM_PROMPT


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


def test_chat_think_block_has_confidence_check():
    from app.routers.chat import CHAT_SYSTEM_PROMPT
    assert "Confidence" in CHAT_SYSTEM_PROMPT
    assert "Tier 2 ambiguity" in CHAT_SYSTEM_PROMPT


def test_intent_gate_think_block_has_signal_words():
    from app.main import _INTENT_GATE_PROMPT
    assert "CASE 1 signal words" in _INTENT_GATE_PROMPT
    assert "CASE 2 signal words" in _INTENT_GATE_PROMPT


def test_intent_gate_think_block_has_ambiguity_examples():
    from app.main import _INTENT_GATE_PROMPT
    assert "What would" in _INTENT_GATE_PROMPT
    assert "How do I build" in _INTENT_GATE_PROMPT


def test_icon_preload_think_block_has_stack_classification():
    from app.graph.nodes import _ICON_PRELOAD_PROMPT
    assert "Stack classification" in _ICON_PRELOAD_PROMPT
    assert "Component priority" in _ICON_PRELOAD_PROMPT


def test_icon_preload_think_block_has_canonical_resolution():
    from app.graph.nodes import _ICON_PRELOAD_PROMPT
    assert "ElastiCache" in _ICON_PRELOAD_PROMPT
    assert "Unknown DB" in _ICON_PRELOAD_PROMPT
