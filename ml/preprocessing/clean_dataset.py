"""
Cybersecurity Dataset Cleaning & Normalization Script
====================================================
Integrates robust data quality features:
- Repeated header row removal (e.g. df[df["Label"] != "Label"])
- Handling of infinite values (+/- inf -> NaN)
- Per-feature median imputation for missing values
- Separation of numeric features from labels
- Output of clean CSV to data/processed/
Supports: UNSW-NB15 and CICIDS2017 benchmark formats
"""

import os
import sys
import argparse
import pandas as pd
import numpy as np

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

def clean_dataset(
    input_path: str,
    output_path: str,
    target_col: str = "Label",
    timestamp_cols: list = None
) -> pd.DataFrame:
    print(f"[CLEAN] Loading dataset from: {input_path}")
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found at: {input_path}")

    df = pd.read_csv(input_path, low_memory=False)
    orig_shape = df.shape
    print(f"[CLEAN] Original dataset shape: {orig_shape}")

    # Standardize target column casing if needed
    for col in df.columns:
        if col.lower() == target_col.lower() and col != target_col:
            df.rename(columns={col: target_col}, inplace=True)
            break

    if target_col not in df.columns:
        # Fall back to finding 'label' or 'attack_cat'
        candidates = [c for c in df.columns if c.lower() in ["label", "attack", "class"]]
        if candidates:
            target_col = candidates[0]
            print(f"[CLEAN] Detected target column: '{target_col}'")
        else:
            raise ValueError(f"Target column '{target_col}' not found in columns: {list(df.columns)}")

    # 1. Remove repeated header rows
    initial_rows = len(df)
    df = df[df[target_col].astype(str) != target_col].copy()
    headers_removed = initial_rows - len(df)
    if headers_removed > 0:
        print(f"[CLEAN] Removed {headers_removed} repeated header rows.")

    # 2. Drop timestamp or non-informative identifier columns if present
    drop_candidates = timestamp_cols or ["Timestamp", "timestamp", "id", "Flow ID", "Src IP", "Dst IP"]
    to_drop = [c for c in drop_candidates if c in df.columns]
    if to_drop:
        df = df.drop(columns=to_drop)
        print(f"[CLEAN] Dropped non-feature columns: {to_drop}")

    # 3. Identify feature columns
    feature_cols = [c for c in df.columns if c != target_col and c.lower() != "attack_cat"]

    # 4. Cast feature columns to numeric
    for col in feature_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # 5. Replace infinite values with NaN
    df.replace([np.inf, -np.inf], np.nan, inplace=True)

    # 6. Fill missing values with median
    imputed_count = 0
    cols_to_drop = []
    for col in feature_cols:
        if df[col].isna().any():
            median_val = df[col].median()
            if pd.notna(median_val):
                df[col] = df[col].fillna(median_val)
                imputed_count += 1
            else:
                cols_to_drop.append(col)

    if cols_to_drop:
        df = df.drop(columns=cols_to_drop)
        print(f"[CLEAN] Dropped completely empty columns: {cols_to_drop}")

    # 7. Normalize target labels to standard format (0: Benign, 1: Attack)
    unique_labels = df[target_col].unique()
    print(f"[CLEAN] Unique labels before standardization: {unique_labels}")

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"[CLEAN] Cleaned shape: {df.shape}")
    print(f"[CLEAN] Total missing values remaining: {df.isnull().sum().sum()}")
    print(f"[CLEAN] Cleaned dataset successfully saved to: {output_path}")

    return df

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Clean and normalize flow datasets for ML training")
    parser.add_argument("--input", type=str, default=None, help="Input raw CSV path")
    parser.add_argument("--output", type=str, default=None, help="Output cleaned CSV path")
    parser.add_argument("--target", type=str, default="label", help="Target label column name")
    args = parser.parse_args()

    default_in = os.path.join(PROJECT_ROOT, "backend", "app", "data", "unsw_nb15_reference.csv")
    default_out = os.path.join(PROJECT_ROOT, "data", "processed", "cleaned_unsw_nb15.csv")

    input_file = args.input or default_in
    output_file = args.output or default_out

    clean_dataset(input_file, output_file, target_col=args.target)
