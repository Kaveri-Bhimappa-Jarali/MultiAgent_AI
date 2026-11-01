#!/usr/bin/env python3
"""
Convenience CLI to download and verify authentic benchmark datasets.
Compliant with SDMCET VII Semester Major Project Synopsis Section 17.
"""

import sys
import pathlib

PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from ml.preprocessing.acquire_datasets import download_dataset, validate_dataset_schema, DATASET_SOURCES, get_dataset_path

def main():
    print("=" * 80)
    print("   GENUINE CYBERSECURITY BENCHMARK DATASET ACQUISITION & VALIDATION")
    print("=" * 80)

    for dataset_name in ["UNSW-NB15", "CICIDS2017"]:
        print(f"\n[STEP] Checking authentic dataset: {dataset_name}...")
        path = get_dataset_path(dataset_name)
        if path.exists():
            print(f"  • Found existing local file at: {path}")
        else:
            print(f"  • Dataset not found locally. Initiating download from verified mirror...")
            try:
                download_dataset(dataset_name, path)
            except Exception as e:
                print(f"  [DOWNLOAD ERROR] Failed to download {dataset_name}: {e}")
                print(DATASET_SOURCES[dataset_name]["manual_download_guide"])
                continue

        try:
            report = validate_dataset_schema(dataset_name, path)
            print(f"  [VALIDATED] {dataset_name} schema & integrity verified:")
            print(f"    - Size:       {report['file_size_mb']} MB")
            print(f"    - Features:   {report['matched_features_count']} verified canonical flow features")
            print(f"    - SHA-256:    {report['sha256_sample_hash'][:16]}...")
        except Exception as e:
            print(f"  [SCHEMA ERROR] {e}")

    print("\n" + "=" * 80)
    print("   ACQUISITION CHECK COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    main()
