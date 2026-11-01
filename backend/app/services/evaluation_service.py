import sys
import pathlib
ROOT_DIR = pathlib.Path(__file__).resolve().parent.parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import uuid
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, roc_auc_score

from app.models.dataset import EvaluationRun
from ml.preprocessing.acquire_datasets import load_genuine_dataset
from ml.preprocessing.pipeline import CybersecurityPreprocessingPipeline

def run_dataset_evaluation(
    db: Session,
    dataset_name: str = "UNSW-NB15",
    model_type: str = "Random Forest",
    test_size: float = 0.20,
    random_seed: int = 42,
    sample_size: int = 10000
) -> EvaluationRun:
    """
    Executes supervised ML evaluation on genuine benchmark datasets
    with strict leak-free train/val/test separation and rigorous metrics.
    """
    key = "UNSW-NB15" if "unsw" in dataset_name.lower() else "CICIDS2017"

    # 1. Load authentic dataset records
    df_raw, provenance = load_genuine_dataset(
        dataset_name=key,
        max_samples=sample_size,
        random_seed=random_seed
    )

    # 2. Leak-free preprocessing
    pipeline = CybersecurityPreprocessingPipeline(
        dataset_name=key,
        test_size=test_size,
        val_size=0.15,
        random_seed=random_seed
    )
    splits = pipeline.fit_transform_splits(df_raw)

    X_train, y_train = splits["X_train"], splits["y_train"]
    X_test, y_test = splits["X_test"], splits["y_test"]
    feature_names = splits["feature_names"]

    # 3. Fit classifier
    if model_type == "Decision Tree":
        clf = DecisionTreeClassifier(max_depth=10, random_state=random_seed, class_weight="balanced")
    else:
        clf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=random_seed, class_weight="balanced", n_jobs=1)

    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)
    y_probs = clf.predict_proba(X_test)[:, 1] if hasattr(clf, "predict_proba") else y_pred

    # 4. Calculate actual empirical metrics
    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, zero_division=0))
    rec = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))

    try:
        roc_auc = float(roc_auc_score(y_test, y_probs))
    except Exception:
        roc_auc = acc

    cm = confusion_matrix(y_test, y_pred).tolist()  # [[TN, FP], [FN, TP]]
    tn = cm[0][0]
    fp = cm[0][1]
    fn = cm[1][0]
    tp = cm[1][1]

    fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0

    # Feature importance
    importances = clf.feature_importances_.tolist()
    feat_imp = {feat: round(float(imp), 4) for feat, imp in sorted(zip(feature_names, importances), key=lambda x: x[1], reverse=True)[:25]}

    run_id = f"EVAL-{uuid.uuid4().hex[:8].upper()}"
    eval_run = EvaluationRun(
        run_id=run_id,
        dataset_name=key,
        model_type=model_type,
        sample_size=len(df_raw),
        accuracy=round(acc, 4),
        precision=round(prec, 4),
        recall=round(rec, 4),
        f1_score=round(f1, 4),
        false_positive_rate=round(fpr, 4),
        confusion_matrix=cm,
        feature_importance=feat_imp,
        metrics_summary={
            "test_samples": len(y_test),
            "training_samples": len(y_train),
            "true_positives": tp,
            "true_negatives": tn,
            "false_positives": fp,
            "false_negatives": fn,
            "roc_auc": round(roc_auc, 4),
            "provenance_source": provenance.get("file_path"),
            "provenance_citation": provenance.get("official_citation"),
            "features_evaluated": len(feature_names)
        },
        evaluated_at=datetime.now(timezone.utc)
    )
    db.add(eval_run)
    db.commit()

    return eval_run
