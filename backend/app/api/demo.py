from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.demo_service import (
    run_scenario_1_brute_force,
    run_scenario_2_network_scan,
    run_scenario_3_account_compromise,
    run_scenario_4_endpoint_malware,
    reset_demo_lab
)

router = APIRouter(prefix="/demo", tags=["Demo Lab"])

@router.post("/scenario/{scenario_num}")
def trigger_scenario(scenario_num: int, db: Session = Depends(get_db)):
    if scenario_num == 1:
        return run_scenario_1_brute_force(db)
    elif scenario_num == 2:
        return run_scenario_2_network_scan(db)
    elif scenario_num == 3:
        return run_scenario_3_account_compromise(db)
    elif scenario_num == 4:
        return run_scenario_4_endpoint_malware(db)
    else:
        raise HTTPException(status_code=400, detail="Invalid scenario number. Choose between 1 and 4.")

@router.post("/reset")
def reset_lab(db: Session = Depends(get_db)):
    return reset_demo_lab(db)
