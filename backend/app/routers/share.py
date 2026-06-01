import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Workflow

router = APIRouter(prefix="/share", tags=["share"])


class ShareDetail(BaseModel):
    id: int
    title: str
    prompt: str
    nodes: list
    edges: list
    analysis_text: Optional[str]


@router.get("/{token}", response_model=ShareDetail)
def get_shared_workflow(token: str, db: Session = Depends(get_db)):
    wf = db.query(Workflow).filter(Workflow.share_token == token).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Shared workflow not found")
    return ShareDetail(
        id=wf.id,
        title=wf.title,
        prompt=wf.prompt,
        nodes=json.loads(wf.nodes_json),
        edges=json.loads(wf.edges_json),
        analysis_text=wf.analysis_text,
    )
