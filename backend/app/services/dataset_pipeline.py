"""
Genuine Cybersecurity Dataset Pipeline & Live Inference Service
===============================================================
Compliant with SDMCET VII Semester Major Project Synopsis Section 17.

Supports:
1. Authentic UNSW-NB15 Benchmark Dataset (ACCS Canberra)
2. Authentic CICIDS2017 Benchmark Dataset (UNB / CIC)

Guarantees:
- Loads authentic raw datasets from data/raw/ or configurable paths.
- Never silently replaces missing datasets with synthetic distributions.
- Leakage-safe 3-way split: 65% Train, 15% Validation, 20% Held-Out Test.
- Scaler and imputation parameters fitted strictly on training data.
- Persists versioned artifacts and provides low-latency live inference for SOC events.
"""

import os
import json
import joblib
import pathlib
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, List, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import RobustScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, roc_auc_score
)

PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
RAW_DATA_DIR = PROJECT_ROOT / "data" / "raw"
os.makedirs(DATA_DIR, exist_ok=True)

MODEL_ARTIFACTS = {
    "supervised_model": os.path.join(DATA_DIR, "supervised_rf_model.joblib"),
    "supervised_scaler": os.path.join(DATA_DIR, "supervised_scaler.joblib"),
    "supervised_medians": os.path.join(DATA_DIR, "supervised_medians.pkl"),
    "metadata": os.path.join(DATA_DIR, "model_metadata.json"),
    "feature_schema": os.path.join(DATA_DIR, "feature_schema.json"),
    "preprocessing_metadata": os.path.join(DATA_DIR, "preprocessing_metadata.json")
}

# Synonyms for mapping event telemetry keys to model features
FLOW_FEATURE_SYNONYMS = {
    "dur": ["duration", "flow_duration", "elapsed_time", "Flow Duration"],
    "spkts": ["total_fwd_packets", "packets_in", "source_packets", "Total Fwd Packets"],
    "dpkts": ["total_bwd_packets", "packets_out", "destination_packets", "Total Backward Packets"],
    "sbytes": ["bytes_in", "source_bytes", "Total Length of Fwd Packets", "fwd_bytes"],
    "dbytes": ["bytes_out", "destination_bytes", "Total Length of Bwd Packets", "bwd_bytes"],
    "rate": ["flow_packets_s", "packet_rate", "Flow Packets/s", "Flow Bytes/s"],
    "sttl": ["source_ttl", "src_ttl", "ttl_in"],
    "dttl": ["destination_ttl", "dst_ttl", "ttl_out"],
    "smean": ["fwd_packet_length_mean", "mean_fwd_len", "Fwd Packet Length Mean"],
    "dmean": ["bwd_packet_length_mean", "mean_bwd_len", "Bwd Packet Length Mean"]
}

def load_or_create_reference_dataset(dataset_name: str, sample_size: int = 5000) -> pd.DataFrame:
    """
    Loads authentic records from data/raw/ or backend/app/data/.
    Never silently synthesizes synthetic data if genuine dataset is absent.
    """
    key = "UNSW-NB15" if "unsw" in dataset_name.lower() else "CICIDS2017"

    # Search paths in order of preference
    candidates = [
        RAW_DATA_DIR / "unsw_nb15" / "UNSW_NB15_training-set.csv" if key == "UNSW-NB15" else RAW_DATA_DIR / "cicids2017" / "Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv",
        pathlib.Path(DATA_DIR) / f"{dataset_name.lower()}.csv",
        pathlib.Path(DATA_DIR) / f"{dataset_name.lower()}_reference.csv"
    ]

    for cand in candidates:
        if cand.exists() and os.path.getsize(cand) > 1000:
            print(f"[DATASET] Loading authentic records from: {cand}")
            df = pd.read_csv(cand, nrows=sample_size if sample_size else None, low_memory=False)
            return df

    raise FileNotFoundError(
        f"[PROVENANCE ERROR] Genuine dataset '{key}' was not found.\n"
        f"To download and verify authentic benchmark datasets, run:\n"
        f"  python ml/preprocessing/acquire_datasets.py --dataset {key} --download\n"
        f"Expected path: {candidates[0]}"
    )

def train_and_evaluate_pipeline(
    dataset_name: str = "UNSW-NB15",
    model_type: str = "Random Forest",
    sample_size: int = 15000,
    random_seed: int = 42
) -> Dict[str, Any]:
    """
    Executes leak-free training and held-out evaluation on authentic datasets.
    """
    from ml.training.train_model import train_and_evaluate_model

    return train_and_evaluate_model(
        dataset_name=dataset_name,
        sample_size=sample_size,
        random_seed=random_seed
    )

def load_persisted_classifier() -> Tuple[Optional[Any], Optional[Any], Optional[List[str]], Optional[Dict[str, float]], Optional[Dict[str, Any]]]:
    """
    Loads saved model, scaler, feature list, medians, and metadata for live inference.
    """
    m_path = MODEL_ARTIFACTS["supervised_model"]
    s_path = MODEL_ARTIFACTS["supervised_scaler"]
    schema_path = MODEL_ARTIFACTS["feature_schema"]
    meta_path = MODEL_ARTIFACTS["metadata"]
    med_path = MODEL_ARTIFACTS["supervised_medians"]

    # Fallback to root artifacts if not in backend/app/data
    root_artifacts = PROJECT_ROOT / "artifacts"
    if not os.path.exists(m_path) and (root_artifacts / "supervised_rf_model.joblib").exists():
        m_path = str(root_artifacts / "supervised_rf_model.joblib")
        s_path = str(root_artifacts / "supervised_scaler.joblib")
        schema_path = str(root_artifacts / "feature_schema.json")
        meta_path = str(root_artifacts / "model_metadata.json")
        med_path = str(root_artifacts / "supervised_medians.pkl")

    if not (os.path.exists(m_path) and os.path.exists(s_path) and os.path.exists(schema_path)):
        return None, None, None, None, None

    try:
        clf = joblib.load(m_path)
        scaler = joblib.load(s_path)
        with open(schema_path, "r") as f:
            feat_info = json.load(f)
        feature_names = feat_info.get("features", [])

        meta = {}
        if os.path.exists(meta_path):
            with open(meta_path, "r") as f:
                meta = json.load(f)

        medians = {}
        if os.path.exists(med_path):
            medians = joblib.load(med_path)
        elif os.path.exists(MODEL_ARTIFACTS["preprocessing_metadata"]):
            with open(MODEL_ARTIFACTS["preprocessing_metadata"], "r") as f:
                p_meta = json.load(f)
                medians = p_meta.get("train_medians", {})

        return clf, scaler, feature_names, medians, meta
    except Exception as e:
        print(f"[MODEL] Error loading persisted classifier: {e}")
        return None, None, None, None, None

def extract_flow_features_from_event(event: Any) -> Optional[Dict[str, Any]]:
    """
    Extracts network flow features from SecurityEvent model or dictionary.
    Inspects raw_payload (JSON), standard event properties, and command_line.
    """
    flow_data = {}

    # 1. Check raw_payload for embedded JSON flow telemetry
    payload = getattr(event, "raw_payload", None)
    if payload:
        try:
            if isinstance(payload, str) and payload.strip().startswith("{"):
                parsed = json.loads(payload)
                if isinstance(parsed, dict):
                    flow_data.update(parsed)
        except Exception:
            pass

    # 2. Extract standard network connection attributes
    if getattr(event, "destination_port", None) is not None:
        flow_data["dsport"] = float(event.destination_port)
    if getattr(event, "source_port", None) is not None:
        flow_data["sport"] = float(event.source_port)

    # 3. If event_type is network_connection and flow attributes are present, return dictionary
    if getattr(event, "event_type", None) == "network_connection" or len(flow_data) >= 3:
        return flow_data

    return flow_data if len(flow_data) > 0 else None

def run_realtime_flow_inference(flow_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes live supervised inference on fresh incoming flow telemetry.
    Returns prediction, confidence probability, assigned severity, model version, and explanation.
    """
    clf, scaler, feature_names, medians, meta = load_persisted_classifier()
    if not clf or not scaler or not feature_names:
        return {
            "ml_evaluated": False,
            "reason": "Model artifacts not yet loaded or trained on dataset."
        }

    # Extract features in identical training schema order
    row = []
    missing_features = []
    for f in feature_names:
        val = flow_dict.get(f)
        if val is None:
            # Check synonyms
            found = False
            for syn in FLOW_FEATURE_SYNONYMS.get(f, []):
                if syn in flow_dict and flow_dict[syn] is not None:
                    try:
                        row.append(float(flow_dict[syn]))
                        found = True
                        break
                    except (ValueError, TypeError):
                        pass

            if not found:
                # Use genuine training median
                default_val = medians.get(f, 0.0) if medians else 0.0
                row.append(float(default_val))
                missing_features.append(f)
        else:
            try:
                row.append(float(val))
            except (ValueError, TypeError):
                default_val = medians.get(f, 0.0) if medians else 0.0
                row.append(float(default_val))
                missing_features.append(f)

    arr = np.array(row, dtype=float).reshape(1, -1)
    try:
        scaled = scaler.transform(arr)
        pred = int(clf.predict(scaled)[0])
        prob = float(clf.predict_proba(scaled)[0][1]) if hasattr(clf, "predict_proba") else (0.95 if pred == 1 else 0.05)
    except Exception as e:
        return {
            "ml_evaluated": False,
            "reason": f"Scaling/inference error: {e}"
        }

    is_malicious = bool(pred == 1 or prob >= 0.50)
    severity = "CRITICAL" if prob >= 0.85 else ("HIGH" if prob >= 0.65 else ("MEDIUM" if prob >= 0.40 else "INFO"))
    model_version = meta.get("model_version", "v3.0-RF")

    return {
        "ml_evaluated": True,
        "model_version": model_version,
        "dataset_name": meta.get("dataset_name", "UNSW-NB15"),
        "is_malicious": is_malicious,
        "attack_probability": round(prob, 4),
        "confidence": round(prob if is_malicious else (1.0 - prob), 4),
        "assigned_severity": severity,
        "features_evaluated": len(feature_names),
        "missing_features_imputed": len(missing_features),
        "explanation": f"Supervised {meta.get('model_type', 'Random Forest')} ({model_version}) classified network flow as {'MALICIOUS INTRUSION' if is_malicious else 'BENIGN TRAFFIC'} (Attack Probability: {prob*100:.1f}%)"
    }
