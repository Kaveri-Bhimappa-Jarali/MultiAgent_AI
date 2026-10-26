from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

class DatasetEvaluationRequest(BaseModel):
    dataset_name: str  # UNSW-NB15, CICIDS2017
    model_type: str = "Random Forest"  # Random Forest, Isolation Forest, Decision Tree
    test_size: float = 0.25
    random_seed: int = 42

class EvaluationRunResponse(BaseModel):
    id: int
    run_id: str
    dataset_name: str
    model_type: str
    sample_size: int
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    false_positive_rate: float
    confusion_matrix: List[List[int]]
    feature_importance: Dict[str, float]
    metrics_summary: Dict[str, Any]
    evaluated_at: datetime

    class Config:
        from_attributes = True
