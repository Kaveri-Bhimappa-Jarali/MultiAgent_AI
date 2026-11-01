# PROJECT STRUCTURE DOCUMENTATION

**Project:** Multi-Agent AI Security Operations Center (SOC) for Real-Time Threat Detection  
**Academic Specification:** SDMCET VII Sem CSE Major Project Synopsis (Sections 16–17)  
**Authors:** Deepak, Isha U Prabhu, Ishank Kumar, Kaveri Jarali  
**Faculty Guide:** Dr. Rani Shetty  
**Updated:** 2026-11-01  

---

## 1. Directory Tree Architecture

The repository adheres to a clean, modular, and production-grade SOC architecture:

```text
MultiAgent_AI/
├── .venv/                         # Local Python 3.14 AMD64 Virtual Environment
├── artifacts/                     # Persisted Production ML Artifacts & Preprocessors
│   ├── models/                    # Versioned Model Store
│   │   ├── v3.0-UNSW-NB15-RF100/  # Trained on authentic UNSW-NB15 (97.59% Acc)
│   │   └── v3.0-CICIDS2017-RF100/ # Trained on authentic CICIDS2017 (99.86% Acc)
│   ├── feature_schema.json        # 39-feature canonical schema
│   ├── model_metadata.json        # Training metadata, hyperparameters, and held-out metrics
│   ├── preprocessing_metadata.json# Training medians and feature order dictionary
│   ├── supervised_rf_model.joblib # 100-tree Random Forest classifier artifact
│   ├── supervised_scaler.joblib   # RobustScaler fitted strictly on training data
│   └── supervised_medians.pkl     # Feature median imputation dictionary
│
├── backend/                       # Enterprise FastAPI & SQLAlchemy SOC Engine
│   ├── app/
│   │   ├── agents/                # 10 Specialized Autonomous SOC Agents
│   │   │   ├── orchestrator.py    # MultiAgentSOCEngine (Pipeline coordinator)
│   │   │   ├── network_agent.py   # Agent 1: Network Intrusion & Supervised Flow Detection
│   │   │   ├── auth_agent.py      # Agent 2: Authentication & Credential Abuse
│   │   │   ├── endpoint_agent.py  # Agent 3: Endpoint & Host Process Monitoring
│   │   │   ├── anomaly_agent.py   # Agent 4: Multivariate Isolation Forest Anomaly Detection
│   │   │   ├── behaviour_agent.py # Agent 5: Living-off-the-Land & Behavioral Patterns
│   │   │   ├── threat_intel_agent.py # Agent 6: Threat Intelligence & IOC Enrichment
│   │   │   ├── correlation_agent.py  # Agent 7: Graph & Sliding-Window Event Correlation
│   │   │   ├── attack_path_agent.py  # Agent 8: Dynamic Entity Graph & Lateral Movement
│   │   │   ├── investigation_agent.py # Agent 9: 8-Question Root Cause Analysis (RCA)
│   │   │   └── response_agent.py  # Agent 10: SOAR Automated Containment Formulation
│   │   ├── api/                   # REST Endpoints (/events, /incidents, /ml, /telemetry, /lab, /ws)
│   │   ├── config.py              # Central configuration, DB URLs, thresholds
│   │   ├── data/                  # Runtime model storage mirror & schemas
│   │   ├── database.py            # SQLite engine with WAL mode and foreign key constraints
│   │   ├── models/                # SQLAlchemy ORM Models (Event, Finding, Incident, VM, Response)
│   │   ├── schemas/               # Pydantic validation schemas
│   │   └── services/              # Business logic (Ingestion, Risk, Verification, ML Pipeline)
│   │       ├── collectors/        # Telemetry Ingress Collectors
│   │       │   ├── base_collector.py
│   │       │   ├── collector_manager.py
│   │       │   ├── file_watcher_collector.py
│   │       │   ├── live_demo_stream_collector.py
│   │       │   ├── network_flow_sniffer.py
│   │       │   └── syslog_collector.py
│   │       ├── dataset_pipeline.py# Real training, leak-safe split, evaluation, and inference
│   │       ├── detection_service.py # 12 MITRE ATT&CK rules + RULE-ML-001 + RULE-ANOM-001
│   │       ├── risk_service.py    # Deterministic 0-100 incident risk scoring algorithm
│   │       ├── response_service.py# SOAR execution, approval gates, and rollback
│   │       └── verification_service.py # Evidence-based post-containment verification
│   └── tests/                     # Automated Backend Test Suite (16/16 Passed)
│       ├── test_realtime_pipeline.py
│       ├── test_soc_core.py
│       └── test_virtual_lab.py
│
├── data/                          # Dataset Store & Schemas
│   ├── raw/                       # Authentic Downloaded Datasets
│   │   ├── unsw_nb15/             # UNSW_NB15_training-set.csv (14.59 MB, 82,332 records)
│   │   └── cicids2017/            # Friday-WorkingHours-Afternoon-PortScan (73.34 MB)
│   └── schemas/                   # Official Feature Definitions
│       ├── unsw_nb15_schema.json  # 39 features + types + descriptions
│       └── cicids2017_schema.json # 20 canonical features + types + descriptions
│
├── frontend/                      # Enterprise React 18 / TypeScript Web Dashboard
│   ├── src/                       # Components, Views, WebSocket hooks, State
│   └── dist/                      # Production Vite Build (Compiled clean in 21.26s)
│
├── ml/                            # Machine Learning Preprocessing & Training
│   ├── preprocessing/
│   │   ├── acquire_datasets.py    # Dataset downloader with schema validation
│   │   └── pipeline.py            # Leak-free splitting, RobustScaler, and feature selection
│   └── training/
│       └── train_model.py         # Versioned training script for RF models
│
├── reports/                       # Visual Confusion Matrices & Feature Importance Charts
│   ├── unsw_nb15_confusion_matrix.png
│   ├── unsw_nb15_feature_importance_top15.png
│   ├── cicids2017_confusion_matrix.png
│   └── cicids2017_feature_importance_top15.png
│
├── scripts/                       # Operational & Acceptance Verification Scripts
│   ├── download_datasets.py
│   ├── final_acceptance_audit.py
│   ├── phase10_acceptance_verification.py
│   ├── verify_dynamic_unknown_telemetry.py
│   └── verify_frontend_backend_integration.py
│
├── virtual-lab/                   # Isolated 3-Node Virtual Enterprise Lab
│   ├── Vagrantfile                # Automated 3-VM host-only provisioning (192.168.56.0/24)
│   ├── guest-agent/               # VM telemetry collector daemon with offline buffer
│   ├── attacker/                  # Attacker scenario toolkit bounded to lab subnet
│   └── run_local_virtual_nodes.py # Local multi-process daemon runner fallback
│
└── docs/                          # Comprehensive Technical Documentation
    ├── FINAL_SYNOPSIS_COMPLIANCE_REPORT.md
    ├── FINAL_REALTIME_ACCEPTANCE_REPORT.md
    ├── DATASET_AND_TRAINING_AUDIT.md
    ├── VM_LAB_ACCEPTANCE_REPORT.md
    ├── END_TO_END_TEST_REPORT.md
    ├── GENUINE_VM_LAB_DEPLOYMENT_GUIDE.md
    ├── MODEL_AND_ALGORITHM_AUDIT.md
    ├── PROJECT_STRUCTURE.md
    └── DATA_AND_MODEL_FLOW.md
```
