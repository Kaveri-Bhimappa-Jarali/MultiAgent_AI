"""
Feature Importance Analysis & Explainability
===========================================
Extracts Mean Decrease in Impurity (MDI) feature importances from trained Random Forest models.
Generates:
1. reports/feature_importance.csv
2. reports/feature_importance_top20.png (when matplotlib is available)
3. Explainability JSON summary
"""

import os
import sys
import json
import joblib
import pathlib
import argparse
import pandas as pd
import numpy as np

PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent

def extract_feature_importance(
    model_path: str = None,
    schema_path: str = None,
    output_csv: str = None,
    output_png: str = None
) -> pd.DataFrame:
    m_path = model_path or str(PROJECT_ROOT / "artifacts" / "supervised_rf_model.joblib")
    if not os.path.exists(m_path):
        m_path = str(PROJECT_ROOT / "backend" / "app" / "data" / "supervised_rf_model.joblib")

    s_path = schema_path or str(PROJECT_ROOT / "artifacts" / "feature_schema.json")
    if not os.path.exists(s_path):
        s_path = str(PROJECT_ROOT / "backend" / "app" / "data" / "feature_schema.json")

    print(f"[EXPLAIN] Loading model from: {m_path}")
    print(f"[EXPLAIN] Loading schema from: {s_path}")

    if not os.path.exists(m_path) or not os.path.exists(s_path):
        raise FileNotFoundError(f"Missing model ({m_path}) or schema ({s_path}). Train model first!")

    model = joblib.load(m_path)
    with open(s_path, "r") as f:
        schema = json.load(f)
    feature_names = schema.get("features", [])

    if not hasattr(model, "feature_importances_"):
        raise ValueError("Loaded model does not have feature_importances_ attribute.")

    importances = model.feature_importances_
    if len(feature_names) != len(importances):
        raise ValueError(f"Feature count mismatch: {len(feature_names)} names vs {len(importances)} weights")

    df_imp = pd.DataFrame({
        "feature": feature_names,
        "importance": importances
    }).sort_values(by="importance", ascending=False).reset_index(drop=True)

    df_imp["cumulative_importance"] = df_imp["importance"].cumsum()

    # Save CSV
    c_out = output_csv or str(PROJECT_ROOT / "reports" / "feature_importance.csv")
    os.makedirs(os.path.dirname(os.path.abspath(c_out)), exist_ok=True)
    df_imp.to_csv(c_out, index=False)
    print(f"[EXPLAIN] Feature importance CSV saved to: {c_out}")

    print("\n--- TOP 10 MOST INFLUENTIAL FEATURES ---")
    for i, r in df_imp.head(10).iterrows():
        print(f"  {i+1:2d}. {r['feature']:<25} : {r['importance']*100:6.2f}% (Cumulative: {r['cumulative_importance']*100:6.2f}%)")

    # Generate plot using matplotlib or PIL
    p_out = output_png or str(PROJECT_ROOT / "reports" / "feature_importance_top20.png")
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        top20 = df_imp.head(20).iloc[::-1]  # Reverse for horizontal bar chart
        plt.figure(figsize=(10, 8))
        plt.barh(top20["feature"], top20["importance"], color="#1f77b4", edgecolor="#0e4370")
        plt.xlabel("Mean Decrease in Impurity (Gini Importance)")
        plt.title("Top 20 Most Discriminative Telemetry Features (Random Forest)")
        plt.grid(axis="x", linestyle="--", alpha=0.7)
        plt.tight_layout()
        plt.savefig(p_out, dpi=150)
        plt.close()
        print(f"[EXPLAIN] Top-20 importance chart saved via matplotlib to: {p_out}")
    except Exception:
        # Fallback to Pillow for standalone pure-Python image generation
        try:
            from PIL import Image, ImageDraw, ImageFont
            top20 = df_imp.head(20)
            img_w, img_h = 800, 650
            img = Image.new("RGB", (img_w, img_h), color="#ffffff")
            draw = ImageDraw.Draw(img)

            # Title
            draw.text((30, 20), "Top 20 Feature Importances (Random Forest - MDI)", fill="#0f172a")
            max_imp = float(top20["importance"].max()) or 0.01

            y_pos = 60
            for _, r in top20.iterrows():
                feat = str(r["feature"])
                imp = float(r["importance"])
                bar_len = int((imp / max_imp) * 450)

                draw.text((30, y_pos), f"{feat:<18}", fill="#334155")
                draw.rectangle([(220, y_pos + 2), (220 + bar_len, y_pos + 18)], fill="#2563eb")
                draw.text((230 + bar_len, y_pos), f"{imp*100:.2f}%", fill="#1e293b")
                y_pos += 28

            img.save(p_out)
            print(f"[EXPLAIN] Top-20 importance chart saved via Pillow to: {p_out}")
        except Exception as e2:
            print(f"[EXPLAIN] Note: Plot generation skipped ({e2}). Text/CSV metrics available.")

    return df_imp

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract and visualize feature importance from trained model")
    parser.add_argument("--model", type=str, default=None)
    parser.add_argument("--schema", type=str, default=None)
    parser.add_argument("--csv", type=str, default=None)
    parser.add_argument("--png", type=str, default=None)
    args = parser.parse_args()

    extract_feature_importance(
        model_path=args.model,
        schema_path=args.schema,
        output_csv=args.csv,
        output_png=args.png
    )
