"""
Build Preprocessing Metadata
============================
Extracts:
- Exact feature column names in training order
- Per-feature training-set medians (for handling missing / partial telemetry at inference time)
- Preprocessing schema versioning

Saves metadata in both .pkl (for Python pipelines) and .json (for API consumers).
Compatible with reference model inspection.
"""

import os
import sys
import json
import joblib
import pathlib
import argparse
import pandas as pd

PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent

def build_preprocessing_metadata(
    dataset_path: str,
    output_pkl: str,
    output_json: str = None,
    target_col: str = "label",
    model_path: str = None
) -> dict:
    print(f"[METADATA] Loading cleaned dataset from: {dataset_path}")
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Dataset not found at: {dataset_path}")

    df = pd.read_csv(dataset_path, low_memory=False)
    print(f"[METADATA] Dataset shape: {df.shape}")

    # Standardize column casing
    for col in df.columns:
        if col.lower() == target_col.lower() and col != target_col:
            df.rename(columns={col: target_col}, inplace=True)
            break

    # Extract feature columns in exact training order
    feature_cols = [c for c in df.columns if c != target_col and c.lower() != "attack_cat"]
    X = df[feature_cols]

    print(f"[METADATA] Feature count: {len(feature_cols)}")

    # Optional model verification
    if model_path and os.path.exists(model_path):
        model = joblib.load(model_path)
        if hasattr(model, "feature_importances_"):
            n_model_features = len(model.feature_importances_)
            if len(feature_cols) != n_model_features:
                raise ValueError(
                    f"Feature count mismatch: Dataset has {len(feature_cols)} features, "
                    f"model expects {n_model_features} features!"
                )
            print(f"[METADATA] Feature count verified against model: {len(feature_cols)} (OK)")

    # Compute per-feature medians
    print("[METADATA] Computing per-feature training medians...")
    medians = {}
    for col in feature_cols:
        medians[col] = float(X[col].median())

    metadata = {
        "feature_names": feature_cols,
        "medians": medians,
        "n_features": len(feature_cols),
        "target_col": target_col,
        "dataset_rows": len(df)
    }

    # Save PKL
    os.makedirs(os.path.dirname(os.path.abspath(output_pkl)), exist_ok=True)
    joblib.dump(metadata, output_pkl)
    print(f"[METADATA] Preprocessing PKL saved to: {output_pkl}")

    # Save JSON
    if output_json:
        os.makedirs(os.path.dirname(os.path.abspath(output_json)), exist_ok=True)
        with open(output_json, "w") as f:
            json.dump(metadata, f, indent=2)
        print(f"[METADATA] Preprocessing JSON saved to: {output_json}")

    return metadata

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract training features and per-feature medians")
    parser.add_argument("--dataset", type=str, default=None)
    parser.add_argument("--output-pkl", type=str, default=None)
    parser.add_argument("--output-json", type=str, default=None)
    parser.add_argument("--target", type=str, default="label")
    parser.add_argument("--model", type=str, default=None)
    args = parser.parse_args()

    default_data = os.path.join(PROJECT_ROOT, "backend", "app", "data", "unsw_nb15_reference.csv")
    default_pkl = os.path.join(PROJECT_ROOT, "artifacts", "preprocessing_metadata.pkl")
    default_json = os.path.join(PROJECT_ROOT, "artifacts", "preprocessing_metadata.json")

    build_preprocessing_metadata(
        dataset_path=args.dataset or default_data,
        output_pkl=args.output_pkl or default_pkl,
        output_json=args.output_json or default_json,
        target_col=args.target,
        model_path=args.model
    )
