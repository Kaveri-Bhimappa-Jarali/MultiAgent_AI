"""
Leakage-Free Cybersecurity Preprocessing Pipeline
=================================================
Compliant with SDMCET VII Semester Major Project Synopsis Section 17.

Guarantees:
1. Strict isolation of training, validation, and held-out test splits.
2. Imputation medians and RobustScaler fitted SOLELY on X_train.
3. Excludes identifier columns (IPs, Ports, Timestamps, Flow IDs) to prevent shortcut learning.
4. Robust handling of infinite values, duplicates, and missing measurements.
5. Standardizes labels across UNSW-NB15 and CICIDS2017 into canonical 0 (Benign) and 1 (Attack).
6. Preserves category labels for fine-grained per-class evaluation.
"""

import os
import json
import joblib
import pathlib
from typing import Dict, Any, Tuple, List, Optional
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import RobustScaler

PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent

class CybersecurityPreprocessingPipeline:
    def __init__(
        self,
        dataset_name: str,
        test_size: float = 0.20,
        val_size: float = 0.15,
        random_seed: int = 42
    ):
        self.dataset_name = dataset_name.upper()
        self.test_size = test_size
        self.val_size = val_size
        self.random_seed = random_seed

        self.target_col: str = ""
        self.feature_names: List[str] = []
        self.scaler: Optional[RobustScaler] = None
        self.train_medians: Dict[str, float] = {}
        self.metadata: Dict[str, Any] = {}

    def _normalize_columns_and_labels(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series, Optional[pd.Series]]:
        """Cleans headers, strips whitespace, standardizes target label to binary 0/1."""
        df = df.copy()
        df.columns = [c.strip() for c in df.columns]

        # Identify target column
        target_candidates = ["label", "Label", "attack", "class"]
        found_target = None
        for cand in target_candidates:
            if cand in df.columns:
                found_target = cand
                break

        if not found_target:
            raise ValueError(f"Could not find target label in columns: {list(df.columns)}")

        self.target_col = found_target

        # Remove repeated header rows
        df = df[df[self.target_col].astype(str) != self.target_col].copy()

        # Extract attack category if present (for multi-class diagnostics)
        attack_category = None
        for cat_col in ["attack_cat", "Attack_Cat", "category"]:
            if cat_col in df.columns:
                attack_category = df[cat_col].astype(str)
                df = df.drop(columns=[cat_col])
                break

        # Standardize target to numeric 0 / 1
        y_raw = df[self.target_col]
        if "cicids" in self.dataset_name.lower():
            # In CICIDS2017: "BENIGN" is 0, any attack string is 1
            y = y_raw.apply(lambda v: 0 if str(v).strip().upper() == "BENIGN" else 1).astype(int)
            if attack_category is None:
                attack_category = y_raw.astype(str)
        else:
            # In UNSW-NB15: already 0 or 1
            y = pd.to_numeric(y_raw, errors="coerce").fillna(0).astype(int)

        df = df.drop(columns=[self.target_col])

        # Exclude non-informative identifiers, timestamps, and target-derived features
        exclude_cols = [
            "id", "ID", "srcip", "dstip", "sport", "dsport", "proto", "state", "service",
            "Flow ID", "Source IP", "Source Port", "Destination IP", "Destination Port",
            "Timestamp", "Protocol", "Unnamed: 0"
        ]
        to_drop = [c for c in exclude_cols if c in df.columns]
        if to_drop:
            df = df.drop(columns=to_drop)

        return df, y, attack_category

    def fit_transform_splits(
        self,
        df_raw: pd.DataFrame
    ) -> Dict[str, Any]:
        """
        Executes leak-free preprocessing and 3-way split:
        Train (65%) | Validation (15%) | Held-Out Test (20%)
        """
        print(f"[PREPROCESS] Normalizing {self.dataset_name} ({len(df_raw)} records)...")
        df_features, y, attack_cats = self._normalize_columns_and_labels(df_raw)

        # Retain only numeric features
        for col in df_features.columns:
            df_features[col] = pd.to_numeric(df_features[col], errors="coerce")

        # Replace infinite values with NaN
        df_features.replace([np.inf, -np.inf], np.nan, inplace=True)

        # Drop columns with > 50% missing values
        null_thresh = len(df_features) * 0.50
        df_features = df_features.dropna(thresh=null_thresh, axis=1)

        # Drop duplicate records to prevent data contamination across splits
        combined = pd.concat([df_features, y.rename("__target__")], axis=1)
        init_len = len(combined)
        combined.drop_duplicates(inplace=True)
        dropped_dups = init_len - len(combined)
        if dropped_dups > 0:
            print(f"[PREPROCESS] Removed {dropped_dups} duplicate records.")

        X = combined.drop(columns=["__target__"])
        y = combined["__target__"].astype(int)
        self.feature_names = list(X.columns)

        print(f"[PREPROCESS] Final features ({len(self.feature_names)}): {self.feature_names[:8]}...")
        print(f"[PREPROCESS] Class balance: Benign={np.sum(y == 0)}, Attack={np.sum(y == 1)}")

        # Step 1: Split Train+Val vs Held-Out Test (BEFORE any transformation)
        X_train_val, X_test, y_train_val, y_test = train_test_split(
            X, y, test_size=self.test_size, random_state=self.random_seed, stratify=y
        )

        # Step 2: Split Train vs Validation
        rel_val_size = self.val_size / (1.0 - self.test_size)
        X_train, X_val, y_train, y_val = train_test_split(
            X_train_val, y_train_val, test_size=rel_val_size, random_state=self.random_seed, stratify=y_train_val
        )

        print(f"[SPLIT] Train: {len(X_train)} (65%), Validation: {len(X_val)} (15%), Test: {len(X_test)} (20%)")

        # Step 3: Compute Medians SOLELY on X_train (Leakage Prevention)
        self.train_medians = {}
        for col in self.feature_names:
            med = float(X_train[col].median())
            self.train_medians[col] = 0.0 if np.isnan(med) else med

        # Impute all splits using frozen X_train medians
        X_train_imp = X_train.fillna(self.train_medians)
        X_val_imp = X_val.fillna(self.train_medians)
        X_test_imp = X_test.fillna(self.train_medians)

        # Step 4: Fit RobustScaler SOLELY on X_train (Leakage Prevention)
        self.scaler = RobustScaler()
        X_train_scaled = self.scaler.fit_transform(X_train_imp)
        X_val_scaled = self.scaler.transform(X_val_imp)
        X_test_scaled = self.scaler.transform(X_test_imp)

        self.metadata = {
            "dataset_name": self.dataset_name,
            "feature_names": self.feature_names,
            "train_medians": self.train_medians,
            "n_features": len(self.feature_names),
            "total_records_processed": len(combined),
            "duplicates_removed": dropped_dups,
            "splits": {
                "train_samples": len(X_train),
                "val_samples": len(X_val),
                "test_samples": len(X_test),
                "train_class_ratio": float(np.mean(y_train)),
                "test_class_ratio": float(np.mean(y_test))
            }
        }

        return {
            "X_train": X_train_scaled,
            "y_train": y_train.to_numpy(),
            "X_val": X_val_scaled,
            "y_val": y_val.to_numpy(),
            "X_test": X_test_scaled,
            "y_test": y_test.to_numpy(),
            "feature_names": self.feature_names,
            "metadata": self.metadata
        }

    def transform_single(self, flow_dict: Dict[str, Any]) -> np.ndarray:
        """Transforms a single incoming network flow record using frozen training parameters."""
        if not self.scaler or not self.train_medians:
            raise RuntimeError("Pipeline has not been fitted yet!")

        row = []
        for feat in self.feature_names:
            val = flow_dict.get(feat)
            if val is None or val == "" or str(val).lower() == "nan":
                row.append(self.train_medians[feat])
            else:
                try:
                    fval = float(val)
                    row.append(self.train_medians[feat] if np.isnan(fval) or np.isinf(fval) else fval)
                except (ValueError, TypeError):
                    row.append(self.train_medians[feat])

        arr = np.array(row, dtype=float).reshape(1, -1)
        return self.scaler.transform(arr)

    def save_pipeline_artifacts(self, output_dir: pathlib.Path):
        """Persists fitted scaler, medians, feature schema, and metadata."""
        output_dir.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.scaler, output_dir / "scaler.joblib")
        joblib.dump(self.train_medians, output_dir / "train_medians.pkl")
        with open(output_dir / "feature_schema.json", "w") as f:
            json.dump({"features": self.feature_names, "n_features": len(self.feature_names)}, f, indent=2)
        with open(output_dir / "preprocessing_metadata.json", "w") as f:
            json.dump(self.metadata, f, indent=2)
        print(f"[PIPELINE] Saved preprocessing artifacts to {output_dir}")
