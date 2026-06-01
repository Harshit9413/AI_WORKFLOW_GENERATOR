from typing import TypedDict, Optional
from app.schemas import DiagramResponse


class GraphState(TypedDict):
    prompt: str
    parsed_components: list[str]
    diagram: Optional[DiagramResponse]
    error: Optional[str]
    icon_map: dict[str, str]  # canonical_tech_name (lowercase) → /static/icons/... URL
    retrieved_examples: list[str]
