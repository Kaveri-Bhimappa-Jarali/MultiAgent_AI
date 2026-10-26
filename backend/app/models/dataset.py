from sqlalchemy import Column, Integer, String, DateTime, Float, JSON
from datetime import datetime, timezone
from app.database import Base

class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(String(64), unique=True, index=True, nullable=False)
    dataset_name = Column(String(100), index=True, nullable=False)  # UNSW-NB15, CICIDS2017
    model_type = Column(String(50), nullable=False)  # Random Forest, Isolation Forest, Decision Tree
    sample_size = Column(Integer, nullable=False)
    accuracy = Column(Float, nullable=False)
    precision = Column(Float, nullable=False)
    recall = Column(Float, nullable=False)
    f1_score = Column(Float, nullable=False)
    false_positive_rate = Column(Float, nullable=False)
    confusion_matrix = Column(JSON, nullable=False)  # [[TN, FP], [FN, TP]]
    feature_importance = Column(JSON, default=dict, nullable=False)
    metrics_summary = Column(JSON, default=dict, nullable=False)
    evaluated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
