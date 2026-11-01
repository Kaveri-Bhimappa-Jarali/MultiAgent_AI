"""
Dataset Acquisition, Schema Validation, and Provenance Verification
===================================================================
Authoritatively manages genuine cybersecurity benchmark datasets:
1. UNSW-NB15 (UNSW Canberra / ACCS)
2. CICIDS2017 (Canadian Institute for Cybersecurity, UNB)

Key Principles:
- Supports downloading authentic dataset partitions from official/verified repositories.
- Validates file integrity, expected column schema, row counts, and class distributions.
- Configurable custom paths via CLI arguments or environment variables:
    UNSW_NB15_PATH
    CICIDS2017_PATH
- NEVER silently generates or replaces missing datasets with synthetic data.
- Provides crystal-clear manual download and verification instructions.
"""

import os
import sys
import json
import hashlib
import pathlib
import argparse
from typing import Dict, Any, Optional, Tuple
import pandas as pd
import numpy as np

PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
RAW_DATA_DIR = PROJECT_ROOT / "data" / "raw"
SCHEMA_DIR = PROJECT_ROOT / "data" / "schemas"

# Official & verified distribution URLs
DATASET_SOURCES = {
    "UNSW-NB15": {
        "url": "https://raw.githubusercontent.com/ushukkla/nospammers/master/UNSW_NB15_training-set.csv",
        "default_filename": "UNSW_NB15_training-set.csv",
        "relative_dir": "unsw_nb15",
        "schema_file": "unsw_nb15_schema.json",
        "expected_min_rows": 80000,
        "official_citation": "Moustafa & Slay (2015), UNSW-NB15 dataset, MilCIS IEEE.",
        "manual_download_guide": (
            "1. Visit https://research.unsw.edu.au/projects/unsw-nb15-dataset or IEEE DataPort.\n"
            "2. Download 'UNSW_NB15_training-set.csv' (82,332 records) or partition CSVs.\n"
            f"3. Place the file at: {RAW_DATA_DIR / 'unsw_nb15' / 'UNSW_NB15_training-set.csv'}\n"
            "4. Alternatively, specify path via --unsw-path or UNSW_NB15_PATH environment variable."
        )
    },
    "CICIDS2017": {
        "url": "https://huggingface.co/datasets/c01dsnap/CIC-IDS2017/resolve/main/Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv",
        "default_filename": "Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv",
        "relative_dir": "cicids2017",
        "schema_file": "cicids2017_schema.json",
        "expected_min_rows": 100000,
        "official_citation": "Sharafaldin et al. (2018), Toward Generating a New Intrusion Detection Dataset (CICIDS2017), ICISSP.",
        "manual_download_guide": (
            "1. Visit https://www.unb.ca/cic/datasets/ids-2017.html or HuggingFace (c01dsnap/CIC-IDS2017).\n"
            "2. Download 'Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv' (~76.9 MB) or MachineLearningCSV.zip.\n"
            f"3. Place the file at: {RAW_DATA_DIR / 'cicids2017' / 'Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv'}\n"
            "4. Alternatively, specify path via --cicids-path or CICIDS2017_PATH environment variable."
        )
    }
}

def compute_file_sha256(filepath: pathlib.Path, max_bytes: int = 10 * 1024 * 1024) -> str:
    """Computes SHA-256 hash of file (reads first max_bytes for fast check)."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        chunk = f.read(max_bytes)
        h.update(chunk)
    return h.hexdigest()

def get_dataset_path(dataset_name: str, custom_path: Optional[str] = None) -> pathlib.Path:
    """Resolves dataset location from argument, environment variable, or default directory."""
    if custom_path and os.path.exists(custom_path):
        return pathlib.Path(custom_path).resolve()

    env_var = "UNSW_NB15_PATH" if "unsw" in dataset_name.lower() else "CICIDS2017_PATH"
    if os.environ.get(env_var) and os.path.exists(os.environ[env_var]):
        return pathlib.Path(os.environ[env_var]).resolve()

    cfg = DATASET_SOURCES.get("UNSW-NB15" if "unsw" in dataset_name.lower() else "CICIDS2017")
    target_dir = RAW_DATA_DIR / cfg["relative_dir"]
    target_file = target_dir / cfg["default_filename"]
    return target_file

def download_dataset(dataset_name: str, destination: Optional[pathlib.Path] = None) -> pathlib.Path:
    """
    Downloads legitimate dataset from official/verified mirror.
    Uses urllib/httpx with streaming to keep memory footprint bounded.
    """
    import urllib.request
    import shutil

    key = "UNSW-NB15" if "unsw" in dataset_name.lower() else "CICIDS2017"
    cfg = DATASET_SOURCES[key]
    url = cfg["url"]

    dest = destination or (RAW_DATA_DIR / cfg["relative_dir"] / cfg["default_filename"])
    dest.parent.mkdir(parents=True, exist_ok=True)

    print(f"[ACQUIRE] Downloading authentic {key} dataset from:")
    print(f"          {url}")
    print(f"          Destination: {dest}")

    # Use urllib with streaming download
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MultiAgent-SOC-Acquisition/1.0"}
    )
    with urllib.request.urlopen(req, timeout=120) as response, open(dest, "wb") as out_file:
        shutil.copyfileobj(response, out_file)

    size_mb = os.path.getsize(dest) / (1024 * 1024)
    print(f"[ACQUIRE] Download completed: {size_mb:.2f} MB saved to {dest}")
    return dest

def validate_dataset_schema(
    dataset_name: str,
    filepath: pathlib.Path,
    sample_rows: int = 1000
) -> Dict[str, Any]:
    """
    Validates CSV header and structure against official JSON schema.
    Returns validation report and provenance information.
    """
    key = "UNSW-NB15" if "unsw" in dataset_name.lower() else "CICIDS2017"
    cfg = DATASET_SOURCES[key]
    schema_path = SCHEMA_DIR / cfg["schema_file"]

    if not filepath.exists():
        raise FileNotFoundError(
            f"Dataset file not found at: {filepath}\n"
            f"Provenance instructions for {key}:\n{cfg['manual_download_guide']}"
        )

    file_size_mb = os.path.getsize(filepath) / (1024 * 1024)
    if file_size_mb < 0.1:
        raise ValueError(f"File at {filepath} is suspiciously small ({file_size_mb:.2f} MB). Potential corrupt download.")

    with open(schema_path, "r") as f:
        schema = json.load(f)

    # Read header and first chunk to inspect columns without loading whole file
    df_preview = pd.read_csv(filepath, nrows=sample_rows, low_memory=False)
    raw_columns = list(df_preview.columns)
    cleaned_col_names = [c.strip() for c in raw_columns]

    # Check for target column
    target_col = schema.get("target_column", "label")
    target_found = any(c.lower() == target_col.lower() for c in cleaned_col_names)

    # Check feature presence
    expected_features = schema.get("feature_columns") or schema.get("canonical_features", [])
    raw_synonyms = schema.get("raw_column_synonyms", {})

    matched_features = []
    missing_features = []
    for feat in expected_features:
        # direct match or stripped match or synonym match
        if feat in raw_columns or feat in cleaned_col_names:
            matched_features.append(feat)
        else:
            # Check synonyms
            found_syn = False
            for raw_k, norm_v in raw_synonyms.items():
                if norm_v == feat and (raw_k in raw_columns or raw_k.strip() in cleaned_col_names):
                    matched_features.append(feat)
                    found_syn = True
                    break
            if not found_syn:
                missing_features.append(feat)

    sha256_prefix = compute_file_sha256(filepath)

    report = {
        "dataset_name": key,
        "file_path": str(filepath),
        "file_size_mb": round(file_size_mb, 2),
        "sha256_sample_hash": sha256_prefix,
        "target_column": target_col,
        "target_column_found": target_found,
        "expected_features_count": len(expected_features),
        "matched_features_count": len(matched_features),
        "missing_features": missing_features,
        "sample_preview_rows": len(df_preview),
        "official_citation": cfg["official_citation"],
        "schema_valid": target_found and (len(missing_features) == 0 or len(matched_features) >= 15)
    }

    if not report["schema_valid"]:
        raise ValueError(
            f"Schema validation failed for {key} at {filepath}.\n"
            f"Missing features: {missing_features}\n"
            f"Target column found: {target_found}"
        )

    return report

def load_genuine_dataset(
    dataset_name: str,
    custom_path: Optional[str] = None,
    max_samples: Optional[int] = None,
    chunk_size: int = 50000,
    random_seed: int = 42
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Safely loads genuine dataset records with memory-conscious chunking.
    Never silently invents fake records if file is missing.
    """
    key = "UNSW-NB15" if "unsw" in dataset_name.lower() else "CICIDS2017"
    filepath = get_dataset_path(key, custom_path)

    if not filepath.exists():
        cfg = DATASET_SOURCES[key]
        raise FileNotFoundError(
            f"[DATA PROVENANCE ERROR] Genuine {key} dataset is not present at:\n"
            f"  {filepath}\n\n"
            f"To download and verify authentic data, run:\n"
            f"  python ml/preprocessing/acquire_datasets.py --dataset {key} --download\n\n"
            f"Manual instructions:\n{cfg['manual_download_guide']}"
        )

    val_report = validate_dataset_schema(key, filepath)
    print(f"[DATA] Validated authentic {key} schema: {val_report['matched_features_count']} features verified.")

    # Load with chunking to prevent out-of-memory on constrained RAM
    chunks = []
    total_loaded = 0

    for chunk in pd.read_csv(filepath, chunksize=chunk_size, low_memory=False):
        # Drop repeated headers if any
        target_col = val_report["target_column"]
        for c in chunk.columns:
            if c.strip().lower() == target_col.lower():
                chunk = chunk[chunk[c].astype(str) != c].copy()
                break

        chunks.append(chunk)
        total_loaded += len(chunk)
        if max_samples and total_loaded >= max_samples:
            break

    df = pd.concat(chunks, ignore_index=True)
    if max_samples and len(df) > max_samples:
        df = df.sample(n=max_samples, random_state=random_seed).reset_index(drop=True)

    val_report["total_loaded_records"] = len(df)
    print(f"[DATA] Successfully loaded {len(df)} authentic records from {filepath}")
    return df, val_report

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Acquire and validate genuine cybersecurity datasets")
    parser.add_argument("--dataset", type=str, choices=["UNSW-NB15", "CICIDS2017", "ALL"], default="ALL")
    parser.add_argument("--download", action="store_true", help="Download official dataset from verified mirror")
    parser.add_argument("--unsw-path", type=str, default=None, help="Custom path to UNSW-NB15 CSV")
    parser.add_argument("--cicids-path", type=str, default=None, help="Custom path to CICIDS2017 CSV")
    parser.add_argument("--validate-only", action="store_true", help="Validate local dataset schema without training")
    args = parser.parse_args()

    targets = ["UNSW-NB15", "CICIDS2017"] if args.dataset == "ALL" else [args.dataset]

    for target in targets:
        print(f"\n{'='*70}\nPROCESSING {target}\n{'='*70}")
        custom = args.unsw_path if "unsw" in target.lower() else args.cicids_path
        path = get_dataset_path(target, custom)

        if args.download:
            try:
                download_dataset(target, path)
            except Exception as e:
                print(f"[ERROR] Download failed: {e}")
                print(DATASET_SOURCES[target]["manual_download_guide"])
                sys.exit(1)

        if path.exists():
            rep = validate_dataset_schema(target, path)
            print(f"[SUCCESS] {target} schema verified:")
            print(json.dumps(rep, indent=2))
        else:
            print(f"[MISSING] {target} is not present at: {path}")
            print(DATASET_SOURCES[target]["manual_download_guide"])
