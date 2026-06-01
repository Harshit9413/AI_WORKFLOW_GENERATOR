import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.router import get_current_user
from app.database import get_db
from app.models import User, Workflow

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workflows", tags=["workflows"])


class SaveRequest(BaseModel):
    id: Optional[int] = None
    prompt: str
    nodes: list
    edges: list
    analysis_text: Optional[str] = None


class WorkflowSummary(BaseModel):
    id: int
    title: str
    prompt: str
    share_token: str
    node_count: int
    edge_count: int
    created_at: str
    updated_at: str


class WorkflowDetail(BaseModel):
    id: int
    title: str
    prompt: str
    nodes: list
    edges: list
    analysis_text: Optional[str]
    share_token: str


@router.post("/save")
def save_workflow(
    body: SaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    title = body.prompt[:60]
    if body.id:
        wf = db.query(Workflow).filter(
            Workflow.id == body.id, Workflow.user_id == current_user.id
        ).first()
        if not wf:
            raise HTTPException(status_code=404, detail="Workflow not found")
        wf.title = title
        wf.prompt = body.prompt
        wf.nodes_json = json.dumps(body.nodes)
        wf.edges_json = json.dumps(body.edges)
        wf.analysis_text = body.analysis_text
    else:
        wf = Workflow(
            user_id=current_user.id,
            title=title,
            prompt=body.prompt,
            nodes_json=json.dumps(body.nodes),
            edges_json=json.dumps(body.edges),
            analysis_text=body.analysis_text,
        )
        db.add(wf)
    db.commit()
    db.refresh(wf)
    return {"id": wf.id, "share_token": wf.share_token}


@router.get("", response_model=list[WorkflowSummary])
def list_workflows(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workflows = (
        db.query(Workflow)
        .filter(Workflow.user_id == current_user.id)
        .order_by(Workflow.updated_at.desc())
        .all()
    )
    result = []
    for wf in workflows:
        try:
            nodes = json.loads(wf.nodes_json or "[]")
        except (json.JSONDecodeError, TypeError):
            logger.warning("Failed to parse nodes_json for workflow %s", wf.id)
            nodes = []
        try:
            edges = json.loads(wf.edges_json or "[]")
        except (json.JSONDecodeError, TypeError):
            logger.warning("Failed to parse edges_json for workflow %s", wf.id)
            edges = []
        result.append(
            WorkflowSummary(
                id=wf.id,
                title=wf.title,
                prompt=wf.prompt,
                share_token=wf.share_token,
                node_count=len(nodes),
                edge_count=len(edges),
                created_at=wf.created_at.isoformat(),
                updated_at=wf.updated_at.isoformat(),
            )
        )
    return result


@router.get("/{workflow_id}", response_model=WorkflowDetail)
def get_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wf = db.query(Workflow).filter(
        Workflow.id == workflow_id, Workflow.user_id == current_user.id
    ).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    try:
        nodes = json.loads(wf.nodes_json or "[]")
    except (json.JSONDecodeError, TypeError):
        logger.warning("Failed to parse nodes_json for workflow %s", wf.id)
        nodes = []
    try:
        edges = json.loads(wf.edges_json or "[]")
    except (json.JSONDecodeError, TypeError):
        logger.warning("Failed to parse edges_json for workflow %s", wf.id)
        edges = []
    return WorkflowDetail(
        id=wf.id,
        title=wf.title,
        prompt=wf.prompt,
        nodes=nodes,
        edges=edges,
        analysis_text=wf.analysis_text,
        share_token=wf.share_token,
    )


@router.delete("/{workflow_id}")
def delete_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wf = db.query(Workflow).filter(
        Workflow.id == workflow_id, Workflow.user_id == current_user.id
    ).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    db.delete(wf)
    db.commit()
    return {"ok": True}


class RenameRequest(BaseModel):
    title: str


@router.patch("/{workflow_id}/rename")
def rename_workflow(
    workflow_id: int,
    body: RenameRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wf = db.query(Workflow).filter(
        Workflow.id == workflow_id, Workflow.user_id == current_user.id
    ).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    wf.title = body.title[:100]
    db.commit()
    return {"ok": True, "title": wf.title}


@router.post("/{workflow_id}/duplicate", response_model=WorkflowSummary)
def duplicate_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wf = db.query(Workflow).filter(
        Workflow.id == workflow_id, Workflow.user_id == current_user.id
    ).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    new_wf = Workflow(
        user_id=current_user.id,
        title=f"Copy of {wf.title}"[:100],
        prompt=wf.prompt,
        nodes_json=wf.nodes_json,
        edges_json=wf.edges_json,
        analysis_text=wf.analysis_text,
    )
    db.add(new_wf)
    db.commit()
    db.refresh(new_wf)
    try:
        nodes = json.loads(new_wf.nodes_json or "[]")
    except (json.JSONDecodeError, TypeError):
        nodes = []
    try:
        edges = json.loads(new_wf.edges_json or "[]")
    except (json.JSONDecodeError, TypeError):
        edges = []
    return WorkflowSummary(
        id=new_wf.id,
        title=new_wf.title,
        prompt=new_wf.prompt,
        share_token=new_wf.share_token,
        node_count=len(nodes),
        edge_count=len(edges),
        created_at=new_wf.created_at.isoformat(),
        updated_at=new_wf.updated_at.isoformat(),
    )
