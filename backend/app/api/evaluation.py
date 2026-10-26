from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.dataset import EvaluationRun
from app.schemas.evaluation import DatasetEvaluationRequest, EvaluationRunResponse
from app.services.evaluation_service import run_dataset_evaluation

router = APIRouter(prefix="/evaluation", tags=["Historical Evaluation"])

@router.get("/runs", response_model=List[EvaluationRunResponse])
def list_evaluation_runs(limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    runs = db.query(EvaluationRun).order_by(EvaluationRun.evaluated_at.desc()).limit(limit).all()
    return [EvaluationRunResponse.model_validate(r) for r in runs]

@router.get("/runs/{run_id}", response_model=EvaluationRunResponse)
def get_evaluation_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(EvaluationRun).filter(EvaluationRun.run_id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Evaluation run not found")
    return EvaluationRunResponse.model_validate(run)

@router.post("/evaluate", response_model=EvaluationRunResponse)
def evaluate_dataset(req: DatasetEvaluationRequest, db: Session = Depends(get_db)):
    run = run_dataset_evaluation(
        db,
        dataset_name=req.dataset_name,
        model_type=req.model_type,
        test_size=req.test_size,
        random_seed=req.random_seed
    )
    return EvaluationRunResponse.model_validate(run)
