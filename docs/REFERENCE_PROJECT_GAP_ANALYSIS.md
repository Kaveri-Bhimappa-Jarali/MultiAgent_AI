# Reference Project Gap Analysis & Integration Strategy

**Primary Academic Specification:** VII Sem CSE Major Project Synopsis, SDM College of Engineering & Technology, Dharwad  
**Existing SOC Implementation:** `C:\Users\kaver\MultiAgent_AI` (Kaveri Jarali)  
**Reference Repository:** `https://github.com/Isha260106/Multi-AI-Agent-in-SOC-for-Real-Time-Threat-Detection` (Isha U Prabhu)  
**Analysis Date:** 2026-10-28  

---

## 1. Executive Summary

Both repositories originate from the same VII Semester Major Project group (Deepak, Isha U Prabhu, Ishank Kumar, Kaveri Jarali). However, their architectural scopes diverge significantly:

1. **Kaveri's Implementation (`MultiAgent_AI`):**
   - Represents the complete enterprise platform requested by the synopsis:
   - **Full 10-Agent Architecture** (Network, Authentication, Endpoint, Malicious Behaviour, Anomaly Detection, Threat Intelligence, Correlation, Attack-Path Analysis, Investigation, Response).
   - **Dual Threat Detection Engine** (12 MITRE ATT&CK rules with rolling time windows + Unsupervised ML Isolation Forest).
   - **Policy-Governed SOAR Response & Mandatory Verification** (IP blocking, account disabling, host isolation; distinguishes real VM evidence from simulated and pending verification).
   - **FastAPI Backend + React/Vite Royal Enterprise Command Center UI** with real-time WebSocket streaming (`/api/ws`).
   - **Virtual Enterprise Lab** with 3-node network topology (`192.168.56.0/24`) and live guest telemetry daemons.
   - **Executive & Forensic PDF Dossier Generation** via ReportLab.

2. **Isha's Reference Repository (`Multi-AI-Agent-in-SOC`):**
   - Focuses strictly on a narrow slice of network flow machine learning and local log processing:
   - Contains only **3 agents** (`network_detection`, `anomaly_detection`, `alert_correlation`).
   - Missing **7 out of 10 synopsis-mandated agents** (Authentication, Endpoint, Malicious Behaviour, Threat Intelligence, Attack Path, Investigation, Response).
   - Has **no SOAR automated response**, no response verification, no web dashboard (CLI-only terminal scripts), no virtual lab topology, and no PDF generation.
   - Uses hardcoded absolute paths throughout (`r"E:\multi-agent-soc\..."`).
   - Uses `Thursday-01-03-2018_TrafficForML_CICFlowMeter.csv` (CSE-CIC-IDS2018) rather than the synopsis-mandated **UNSW-NB15** and **CICIDS2017** datasets.

---

## 2. Comprehensive Component Gap Matrix

| Functional Area | Synopsis Requirement (SDMCET Sections 16–17) | Kaveri Implementation (`MultiAgent_AI`) | Isha Reference Repo (`ref_repo`) | Integration Decision & Action |
|:---|:---|:---|:---|:---|
| **Multi-Agent Architecture** | 10 Specialized Agents (Network, Auth, Endpoint, Malicious Behaviour, Anomaly, Threat Intel, Correlation, Attack Path, Investigation, Response) | **10 Agents Implemented** (`backend/app/agents/*.py`) | **Only 3 Agents** (Network, Anomaly, Correlation) | **PRESERVE** Kaveri's 10-agent orchestrator; enrich Network & Anomaly agents with reference ML preprocessing. |
| **Detection Engine** | Dual Engine: Known attack patterns + Unusual behaviour | Dual Engine: 12 MITRE ATT&CK rolling rules + Isolation Forest | Single Random Forest classifier + basic Isolation Forest | **PRESERVE & ENHANCE**: Keep 12 rules, connect Random Forest flow classifier and Isolation Forest anomaly detector. |
| **Datasets** | UNSW-NB15 & CICIDS2017 | UNSW-NB15 & CICIDS2017 supported | Single 2018 CSV file (`Thursday-01-03-2018`) | **ENFORCE SYNOPSIS**: Retain UNSW-NB15 & CICIDS2017; adopt reference data cleaning logic. |
| **Data Cleaning** | Robust handling of duplicates, nulls, infs, repeated headers | Implemented in `dataset_pipeline.py` | Implemented in `clean_dataset.py` (`df["Label"] != "Label"`, median imputation) | **ACQUIRE & ADOPT**: Port repeated-header removal and column-median fallback into `ml/preprocessing/clean_dataset.py`. |
| **Preprocessing Metadata** | Feature schema persistence and reproducible inference scaling | Implemented in `dataset_pipeline.py` | Implemented in `build_preprocessing_metadata.py` | **ACQUIRE & ADOPT**: Standardize metadata artifact generation into `ml/preprocessing/build_preprocessing_metadata.py`. |
| **Feature Explainability** | Explainable scoring and feature importance | Anomaly reason indicators in `anomaly_model.py` | MDI feature importances and top-20 PNG in `feature_importance.py` | **ACQUIRE & ADOPT**: Port feature importance extraction into `ml/explainability/feature_importance.py`. |
| **Attack-Path Analysis** | Graph representation of traversal across network entities | Dynamic directed graph synthesis (`AttackPathAgent.py`) | **MISSING** (No graph or traversal logic) | **PRESERVE**: Retain Kaveri's dynamic attack-path construction. |
| **Incident Investigation** | 8 canonical SOC root cause analysis questions | Complete 8-question RCA generator (`InvestigationAgent.py`) | **MISSING** (No RCA or investigation agent) | **PRESERVE**: Retain Kaveri's structured investigation engine. |
| **Risk Assessment** | Calibrated 0–100 score based on progression, asset, privilege | Multi-factor bounded risk engine (`risk_service.py`) | Basic alert severity count | **PRESERVE & REFINE**: Keep 0–100 risk model, add CTI and uncertainty factors. |
| **Defensive Response (SOAR)** | Predefined, controlled containment (IP block, account lock, host isolation) | Policy-governed response desk (`response_service.py`) | **MISSING** (No containment or response playbooks) | **PRESERVE**: Retain Kaveri's SOAR containment playbooks. |
| **Response Verification** | Verify threat containment from fresh post-mitigation telemetry | Multi-state verification engine (`verification_service.py`) | **MISSING** (No response verification) | **PRESERVE**: Retain Kaveri's multi-state verification engine. |
| **Telemetry Ingestion** | Real-time queue, asynchronous processing, low latency | FastAPI async queue (`event_queue.py`), REST & UDP syslog | Local file reader & optional Kafka wrapper scripts | **PRESERVE & AUGMENT**: Keep FastAPI queue; add reproducible replay runner from reference concepts. |
| **User Interface** | Centralized real-time SOC command dashboard | React/Vite Enterprise Command Center (`frontend/src/`) | **MISSING** (Terminal CLI scripts only) | **PRESERVE**: Retain React/Vite dashboard, expose ML and dataset training state. |
| **Virtual Lab Testbed** | 3-node isolated network (Endpoint, Server, Attacker, SOC Host) | Full virtual lab scaffold (`virtual-lab/`) & guest agents | **MISSING** (No lab, hypervisors, or VMs) | **PRESERVE**: Retain Vagrantfile, topologies, and live guest collector daemons. |
| **Reporting** | Branded executive & forensic incident reports | PDF Incident Dossier & Executive Briefing via ReportLab | **MISSING** (No PDF reporting) | **PRESERVE**: Retain ReportLab PDF generation. |

---

## 3. Useful Functionality Acquired from Reference Repository

### A. Dataset Cleaning (`clean_dataset.py`)
- **Key Technique:** Explicit detection and removal of repeated header lines in concatenated CSVs (`df[df["Label"] != "Label"]`).
- **Missing Value Handling:** Conversion of all non-target columns to numeric with `errors="coerce"`, replacement of positive/negative infinity with `pd.NA`, and per-column median imputation (dropping columns where the entire column is empty).
- **Adaptation:** Ported into [`ml/preprocessing/clean_dataset.py`](file:///C:/Users/kaver/MultiAgent_AI/ml/preprocessing/clean_dataset.py) with dynamic, relative project paths.

### B. Preprocessing Metadata Extraction (`build_preprocessing_metadata.py`)
- **Key Technique:** One-time extraction of exact training feature names and training-set medians into a persistent metadata file (`network_detection_preprocessing.pkl` / `feature_schema.json`).
- **Benefit:** Guarantees that at runtime inference, missing fields can be imputed with genuine training medians rather than zeros, maintaining numerical stability.
- **Adaptation:** Ported into [`ml/preprocessing/build_preprocessing_metadata.py`](file:///C:/Users/kaver/MultiAgent_AI/ml/preprocessing/build_preprocessing_metadata.py).

### C. Feature Importance Analysis (`feature_importance.py`)
- **Key Technique:** Extraction of Gini impurity decrease (MDI) importances from `RandomForestClassifier.feature_importances_`, sorting top-20 features, exporting `feature_importance.csv`, and plotting horizontal bar charts with non-interactive backend (`matplotlib.use("Agg")`).
- **Benefit:** Provides model-level explainability for security analysts to inspect which packet fields (e.g. `sbytes`, `sttl`, `rate`) drove the classifier's decisions.
- **Adaptation:** Ported into [`ml/explainability/feature_importance.py`](file:///C:/Users/kaver/MultiAgent_AI/ml/explainability/feature_importance.py).

### D. Continuous Event Stream Replay (`kafka/realtime_producer.py`, `realtime_wrapper.py`)
- **Key Technique:** Bounded event replay with configurable time intervals, rate pacing, and execution summary metrics.
- **Adaptation:** Ported into [`scripts/replay/event_replay.py`](file:///C:/Users/kaver/MultiAgent_AI/scripts/replay/event_replay.py) with explicit tagging of all events as `DATASET_REPLAY` to prevent confusion with authentic live telemetry.

---

## 4. Features Preserved Exclusively from Kaveri's Implementation

1. **All 10 Specialized Agents:** Authentication, Endpoint, Malicious Behaviour, Threat Intelligence, Attack-Path, Investigation, and Response agents exist solely in Kaveri's repository.
2. **Deterministic Rolling-Window Rule Engine:** Dynamic sliding window evaluation across database records.
3. **Directed Attack-Path Graph:** Chronological traversal graph connecting external IP, compromised account, host, server, and exfiltrated file.
4. **8-Question Forensic Root Cause Analysis:** Automatic synthesis answering What happened, How it began, Affected assets, Observed activities, Sequence, Evidence, Uncertainties, and Next steps.
5. **Calibrated Risk Engine:** Bounded 0–100 quantitative risk scoring.
6. **SOAR Response & Verification Engine:** Containment playbooks and post-mitigation telemetry observation.
7. **React/Vite SOC Dashboard:** Modern UI with Recharts, WebSockets, topology viewer, and investigation workspace.
8. **Virtual Enterprise Lab:** Isolated subnet configuration, Vagrant automation, and authentic Linux guest collectors.
9. **Forensic PDF Dossiers:** Executive summaries and incident briefings generated via ReportLab.
