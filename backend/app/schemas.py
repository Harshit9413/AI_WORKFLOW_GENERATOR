from typing import Literal, Optional

from pydantic import BaseModel


class GenerateRequest(BaseModel):
    prompt: str


class NodeData(BaseModel):
    label: str
    node_type: Optional[Literal[
        "client", "service", "datastore",
        "queue", "security", "storage", "cloud"
    ]] = "service"
    icon_url: Optional[str] = None


class NodePosition(BaseModel):
    x: float
    y: float


class DiagramNode(BaseModel):
    id: str
    type: Literal["default"] = "default"
    position: NodePosition
    data: NodeData


class DiagramEdge(BaseModel):
    id: str
    source: str
    target: str
    label: Optional[str] = None


class DiagramResponse(BaseModel):
    nodes: list[DiagramNode]
    edges: list[DiagramEdge]
    analysis_text: Optional[str] = None
