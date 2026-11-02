from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app.database import get_db
from app.models.user import User
from app.services.auth_service import get_current_user
from app.services.audit_service import log_audit_entry
from app.schemas.simulation import (
    SimulationLaunchRequest,
    SimulationStopRequest,
    SimulationScenario,
    SimulationExecutionResponse,
    SimulationConnectivityStatus,
)
from app.services.simulation_service import simulation_service

router = APIRouter(prefix="/simulation", tags=["Attack Simulation Console"])

@router.get("/status", response_model=SimulationConnectivityStatus)
async def get_simulation_status():
    """
    Performs dynamic live checks across:
    1. Attacker VM reachability over SSH.
    2. Victim VM reachability.
    3. Attacker -> Victim VM private network reachability (ping & TCP probe).
    4. Required simulation tools readiness (nmap, curl, python3, nc).
    """
    return await simulation_service.check_connectivity()

@router.get("/scenarios", response_model=List[SimulationScenario])
def get_supported_scenarios():
    """
    Returns the catalog of supported attack scenarios (Recon, Auth, Web, Network, Data Movement)
    with their MITRE ATT&CK techniques and configurable parameter schemas.
    """
    return simulation_service.get_scenarios()

@router.post("/launch", response_model=SimulationExecutionResponse)
async def launch_simulation(
    payload: SimulationLaunchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Dispatches a controlled, rate-limited attack simulation from the Attacker VM targeting the Victim VM's private IP.
    """
    try:
        execution = await simulation_service.launch_simulation(db, payload)
        log_audit_entry(
            db,
            actor=current_user.username,
            action="LAUNCH_ATTACK_SIMULATION",
            target_type="SIMULATION",
            target_id=execution.execution_id,
            details={
                "scenario_id": payload.scenario_id,
                "target_ip": execution.target_ip,
                "attacker_ip": execution.attacker_ip
            },
            status="SUCCESS"
        )
        return execution
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to launch simulation: {e}")

@router.post("/{execution_id}/stop", response_model=SimulationExecutionResponse)
async def stop_simulation(
    execution_id: str,
    payload: SimulationStopRequest = Body(default_factory=SimulationStopRequest),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Triggers emergency stop / process termination for an active simulation.
    """
    try:
        execution = await simulation_service.stop_simulation(db, execution_id, payload.reason or "Manual Stop")
        log_audit_entry(
            db,
            actor=current_user.username,
            action="STOP_ATTACK_SIMULATION",
            target_type="SIMULATION",
            target_id=execution_id,
            details={"reason": payload.reason},
            status="SUCCESS"
        )
        return execution
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop simulation: {e}")

@router.get("/executions", response_model=List[SimulationExecutionResponse])
def list_simulation_executions(
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Retrieves execution history with real-time SOC pipeline association.
    """
    return simulation_service.list_executions(db, limit=limit)

@router.get("/executions/{execution_id}", response_model=SimulationExecutionResponse)
def get_simulation_execution(
    execution_id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieves full execution details, ANSI-styled logs, and correlated SOC findings.
    """
    rec = simulation_service.get_execution(db, execution_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"Simulation '{execution_id}' not found")
    return rec
