"""
Dataset Event Stream Replay Tool
================================
Streams network flow events from benchmark datasets into the SOC pipeline.
Features:
- Reads from processed or reference cybersecurity datasets (UNSW-NB15 / CICIDS2017)
- Tags every ingested event strictly as source_type='DATASET_REPLAY' and is_simulated=True
- Provides bounded playback with configurable interval (--delay) and count (--limit)
- Calculates real-time telemetry throughput (events/sec) and latency stats (min, avg, max)
- Invokes real ML inference and SOC correlation pipeline
"""

import os
import sys
import time
import uuid
import argparse
import pathlib
import pandas as pd
from datetime import datetime, timezone

PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

def stream_events_to_soc(
    csv_path: str,
    limit: int = 50,
    delay_sec: float = 0.05,
    source_label: str = "UNSW-NB15-Replay"
):
    print("=" * 65)
    print(f"MULTI-AGENT SOC: DATASET TELEMETRY REPLAY ({source_label})")
    print("=" * 65)
    print(f"Dataset path : {csv_path}")
    print(f"Event limit  : {limit} events")
    print(f"Delay        : {delay_sec}s between events")
    print("=" * 65)

    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found at: {csv_path}")

    from app.database import SessionLocal, engine, Base
    from app.schemas.event import SecurityEventCreate
    from app.services.ingestion_service import normalize_and_ingest_events
    from app.agents.orchestrator import MultiAgentSOCEngine
    from app.services.dataset_pipeline import run_realtime_flow_inference

    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    df = pd.read_csv(csv_path)
    records = df.head(limit).to_dict(orient="records")

    db = SessionLocal()
    orchestrator = MultiAgentSOCEngine(db)

    stats = {
        "total_streamed": 0,
        "malicious_detected": 0,
        "benign_classified": 0,
        "anomalies_flagged": 0,
        "latencies": []
    }

    start_time = time.time()

    try:
        for idx, row in enumerate(records):
            t0 = time.time()
            is_attack = int(row.get("label", row.get("Label", 0))) == 1
            attack_cat = row.get("attack_cat", "Normal" if not is_attack else "Attack")

            # Real ML inference on the flow
            ml_res = run_realtime_flow_inference(row)
            ml_pred = ml_res.get("is_malicious", False)
            prob = ml_res.get("attack_probability", 0.0)

            # Map flow to normalized SOC SecurityEventCreate
            src_ip = f"192.168.10.{10 + (idx % 20)}" if not is_attack else f"198.51.100.{15 + (idx % 10)}"
            dst_ip = "10.0.0.50"
            dst_port = 443 if not is_attack else int(row.get("ct_dst_sport_ltm", 80) * 100 + 80)

            evt = SecurityEventCreate(
                event_id=f"REPLAY-EVT-{uuid.uuid4().hex[:8].upper()}",
                timestamp=datetime.now(timezone.utc),
                source_type="DATASET_REPLAY",
                source_identifier=source_label,
                event_type="network_connection",
                severity=ml_res.get("assigned_severity", "INFO"),
                source_ip=src_ip,
                destination_ip=dst_ip,
                destination_port=dst_port,
                file_action="FLOW_TELEMETRY",
                command_line=f"Flow dur={row.get('dur', 0.1):.3f}s, bytes={row.get('sbytes', 100)}->{row.get('dbytes', 100)}, ML_Prob={prob:.2f}",
                is_simulated=True
            )

            # Ingest and analyze
            ingest_res, saved = normalize_and_ingest_events(db, [evt], auto_queue=False)
            if saved:
                orch_res = orchestrator.run_pipeline(events=saved)

            latency = time.time() - t0
            stats["latencies"].append(latency)
            stats["total_streamed"] += 1

            if ml_pred:
                stats["malicious_detected"] += 1
            else:
                stats["benign_classified"] += 1

            status_str = f"[ATTACK: {attack_cat}]" if is_attack else "[BENIGN]"
            ml_str = f"PREDICT: {'MALICIOUS' if ml_pred else 'BENIGN'} ({prob*100:5.1f}%)"
            print(f"[{idx+1:03d}/{limit:03d}] {status_str:<22} | {ml_str:<26} | Latency: {latency*1000:5.1f}ms")

            if delay_sec > 0:
                time.sleep(delay_sec)

    finally:
        db.close()

    total_time = time.time() - start_time
    avg_latency = sum(stats["latencies"]) / len(stats["latencies"]) if stats["latencies"] else 0.0
    throughput = stats["total_streamed"] / total_time if total_time > 0 else 0.0

    print("\n" + "=" * 65)
    print("STREAM REPLAY SUMMARY")
    print("=" * 65)
    print(f"Events Streamed    : {stats['total_streamed']}")
    print(f"Benign Verified    : {stats['benign_classified']}")
    print(f"Malicious Detected : {stats['malicious_detected']}")
    print(f"Total Playback Time: {total_time:.2f}s")
    print(f"Throughput Rate    : {throughput:.2f} events/second")
    print(f"Average Latency    : {avg_latency*1000:.2f} ms")
    if stats["latencies"]:
        print(f"Min Latency        : {min(stats['latencies'])*1000:.2f} ms")
        print(f"Max Latency        : {max(stats['latencies'])*1000:.2f} ms")
    print("=" * 65)

    return stats

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Stream benchmark cybersecurity flows into SOC")
    parser.add_argument("--csv", type=str, default=None)
    parser.add_argument("--limit", type=int, default=25)
    parser.add_argument("--delay", type=float, default=0.02)
    parser.add_argument("--label", type=str, default="UNSW-NB15-Replay")
    args = parser.parse_args()

    default_csv = os.path.join(PROJECT_ROOT, "backend", "app", "data", "unsw_nb15_reference.csv")
    csv_file = args.csv or default_csv

    stream_events_to_soc(csv_file, limit=args.limit, delay_sec=args.delay, source_label=args.label)
