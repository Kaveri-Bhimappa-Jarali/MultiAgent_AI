"""
Unit and Integration Tests for Analytics (9.13) and System Health (9.14)
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_analytics_report_endpoint():
    """Verify Section 9.13 Analytics and Reports payload."""
    response = client.get("/api/reports/analytics?time_range=24h")
    assert response.status_code == 200, response.text
    data = response.json()

    # Required fields from 9.13
    assert "time_range" in data
    assert data["time_range"] == "24h"
    assert "summary" in data
    assert "events_over_time" in data
    assert isinstance(data["events_over_time"], list)
    assert len(data["events_over_time"]) > 0

    # Incidents breakdown
    assert "incidents_by_severity" in data
    assert "incidents_by_status" in data
    assert "incidents_by_type" in data

    # Findings by agent
    assert "findings_by_agent" in data
    assert len(data["findings_by_agent"]) == 10  # 10 agents

    # Top entities
    assert "top_source_ips" in data
    assert "top_affected_hosts" in data

    # Detection performance & ground truth
    assert "detection_performance" in data
    assert "ground_truth_review" in data["detection_performance"]

    # Correlation quality
    assert "correlation_quality" in data
    assert "related_events_grouped" in data["correlation_quality"]
    assert "unrelated_events_kept_separate" in data["correlation_quality"]
    assert "duplicate_rate_pct" in data["correlation_quality"]

    # Response outcomes
    assert "response_outcomes" in data
    assert "proposed" in data["response_outcomes"]
    assert "approved" in data["response_outcomes"]
    assert "executed" in data["response_outcomes"]
    assert "failed" in data["response_outcomes"]
    assert "verified" in data["response_outcomes"]

    # Offline model metrics clearly separated
    assert "offline_model_metrics" in data
    assert "live_operational_metrics" in data
    assert data["live_operational_metrics"]["benchmark_type"] == "LIVE_OPERATIONAL_METRICS"


def test_system_and_sources_health_endpoint():
    """Verify Section 9.14 System and Data Source Health payload."""
    response = client.get("/api/health/system-and-sources")
    assert response.status_code == 200, response.text
    data = response.json()

    # Two-VM Data path
    assert "data_path" in data
    attacker = data["data_path"]["attacker_vm"]
    victim = data["data_path"]["victim_vm"]

    assert attacker["role"] == "ATTACKER"
    assert attacker["private_ip"] == "10.0.0.13"
    assert "api_key" not in attacker
    assert "password" not in attacker

    assert victim["role"] == "VICTIM_ENDPOINT"
    assert victim["private_ip"] in ["10.0.0.12", "10.0.0.14"]
    assert "api_key" not in victim
    assert "password" not in victim

    # Victim collectors
    assert "victim_collectors" in data
    assert len(data["victim_collectors"]) >= 4

    # Telemetry freshness
    assert "telemetry_freshness" in data
    freshness = data["telemetry_freshness"]
    assert "last_network_flow" in freshness
    assert "last_host_event" in freshness
    assert "last_successful_ingestion" in freshness

    # Ingestion health
    assert "ingestion_health" in data
    ingest = data["ingestion_health"]
    assert "total_records_received" in ingest
    assert "accepted_records" in ingest
    assert "validation_errors" in ingest

    # Infrastructure
    assert "infrastructure" in data
    assert "backend_api" in data["infrastructure"]
    assert "database" in data["infrastructure"]
    assert "event_queue" in data["infrastructure"]

    # 10 Multi-AI Agents
    assert "agents_health" in data
    assert len(data["agents_health"]) == 10
    for agent in data["agents_health"]:
        assert "agent_name" in agent
        assert "status" in agent
        assert "findings_count" in agent
