from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.agent import AgentExecution, AgentFinding
from app.schemas.agent import AgentExecutionResponse, AgentFindingResponse, AgentStatusItem, AgentRunRequest
from app.agents.orchestrator import AGENT_REGISTRY, MultiAgentSOCEngine

router = APIRouter(prefix="/agents", tags=["Agents"])

@router.get("/status", response_model=List[AgentStatusItem])
def get_agents_status(db: Session = Depends(get_db)):
    status_list = []
    for name, AgentCls in AGENT_REGISTRY.items():
        last_exec = db.query(AgentExecution).filter(AgentExecution.agent_name == name).order_by(AgentExecution.start_time.desc()).first()
        total_findings = db.query(AgentFinding).filter(AgentFinding.agent_name == name).count()
        status_list.append(AgentStatusItem(
            name=name,
            role_description=AgentCls.description,
            status=last_exec.status if last_exec else "IDLE",
            last_run_time=last_exec.start_time if last_exec else None,
            total_findings=total_findings,
            health="HEALTHY" if (not last_exec or last_exec.status != "FAILED") else "ERROR"
        ))
    return status_list

@router.get("/runs", response_model=List[AgentExecutionResponse])
def get_agent_runs(limit: int = Query(30, ge=1, le=100), db: Session = Depends(get_db)):
    runs = db.query(AgentExecution).order_by(AgentExecution.start_time.desc()).limit(limit).all()
    return [AgentExecutionResponse.model_validate(r) for r in runs]

@router.get("/findings", response_model=List[AgentFindingResponse])
def get_agent_findings(limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db)):
    findings = db.query(AgentFinding).order_by(AgentFinding.created_at.desc()).limit(limit).all()
    return [AgentFindingResponse.model_validate(f) for f in findings]

@router.post("/run")
def trigger_agent_execution(req: AgentRunRequest, db: Session = Depends(get_db)):
    engine = MultiAgentSOCEngine(db)
    result = engine.run_pipeline(
        incident_id=req.incident_id,
        agent_filter=req.agent_name
    )
    return result
