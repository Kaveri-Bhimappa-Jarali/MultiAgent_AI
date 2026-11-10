# Graph Report - kaveri2  (2026-11-09)

## Corpus Check
- 253 files · ~172,498 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 39 file(s) not represented in the graph (top: .joblib 12, (none) 6, .csv 6)

## Summary
- 1828 nodes · 4914 edges · 112 communities (88 shown, 24 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 537 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d387a07b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Agent Orchestration & Analysis
- SecurityEvent
- schemas/event.py
- schemas/__init__.py
- Frontend API Client
- Attack Simulation Engine
- detections.py
- Frontend Dependencies
- os
- Frontend Dependencies (2)
- control_demo_stream
- Machine Learning & Telemetry Pipeline (2)
- Machine Learning & Telemetry Pipeline (3)
- Telemetry Collectors & Ingestion
- Incident Response & Mitigation
- responses.py
- BaseAgent
- Frontend API Client (4)
- Agent Orchestration & Analysis (5)
- datetime
- Attack Simulation Engine (3)
- Telemetry Collectors & Ingestion (2)
- Machine Learning & Telemetry Pipeline (4)
- Threat Detection & Rules (2)
- tsconfig.json / compilerOptions
- json
- Frontend API Client (5)
- BroadcasterService / .broadcast()
- test_run_local_virtual_nodes.py / FakePr
- Multi-Agent AI Security Operations Center (SOC) for Real-Time Threat Detection
- 2. Step-by-Step Installation
- AnomalyDetectionEngine
- vm_service.py
- Security Event Pipeline
- sqlalchemy_orm
- start_vm_tunnel.sh / start_vm_tunnel.sh 
- System Architecture: Multi-Agent AI Security Operations Center (SOC)
- main.py
- Project Context: Multi-Agent AI Security Operations Center (SOC)
- KNOWN LIMITATIONS & ENVIRONMENTAL CONSTRAINTS
- KNOWN LIMITATIONS & ENVIRONMENTAL CONSTRAINTS
- incidents.py
- agents.py
- threat_intel_service.py
- Product Requirements Document (PRD)
- Running the Multi-Agent AI SOC Platform
- api/evaluation.py
- Cybersecurity Dataset and Training Audit: Multi-Agent AI SOC
- 1. Development Lifecycle & Phase Breakdown
- ingestion_service.py
- report_service.py
- SDMCET VII SEMESTER MAJOR PROJECT — FINAL SYNOPSIS COMPLIANCE & ACCEPTANCE REPORT
- Scenario A: SSH Authentication Brute-Force Attack
- 1. Synopsis Requirement Acceptance Checklist
- 1. Synopsis Requirement Acceptance Checklist
- REST & Streaming API Documentation
- 3. Complete Endpoint Reference
- 3. Verified Implementations & Reproducibility
- 3.11 Monitoring, Health & Settings (`/api/health`, `/api/settings`, `/api/dashboard`, `/api/reports`)
- 2. Detailed Test Results & Outputs
- 2. Step-by-Step Deployment Runbook
- 2. Detailed Test Results & Outputs
- 5. Functional Requirements
- 3.6 SOAR & Containment Responses (`/api/responses`)
- 3. Useful Functionality Acquired from Reference Repository
- 3.8 Virtual Enterprise Lab (`/api/vm`)
- Guest Telemetry Collector Daemon Setup Guide
- SecurityEventCreate
- dataset_pipeline.py
- analyze_threat_findings
- DATA AND MODEL FLOW ARCHITECTURE
- 3.9 Attack Simulation Console (`/api/simulation`)
- 3.2 Telemetry & Event Ingestion (`/api/events`)
- 3.5 Incident Management (`/api/incidents`)
- 2.10 Real-Time Dashboard & Visualization
- 2.1 Network Monitoring & Flow Sniffing
- 2.2 Real-Time Threat Detection
- 2.3 Machine Learning Classification
- 2.4 Multi-Agent Collaborative Analysis
- 2.5 Dynamic Attack-Path Graph Analysis
- 2.6 Spatial-Temporal Event Correlation
- 2.7 Alert Generation & Risk Prioritization
- 2.8 Incident Management & SOAR Containment
- 2.9 Search, Retrieval & Telemetry Querying
- 1. Overview & Authentication
- 3.3 Detections & Rule Engine (`/api/detections`)
- 3.4 Multi-Agent Orchestration (`/api/agents`)
- Virtual Enterprise Network Architecture & Lab Topology
- Multi-Agent Architecture & Agent Specifications
- NetworkFlowSniffer
- 2. Granular Feature Specifications
- update_policies
- Settings
- PROJECT STRUCTURE DOCUMENTATION
- SYNOPSIS_COMPLIANCE_MATRIX.md
- sys
- 2. Detailed Verification Test Suites
- FINAL REAL-TIME IMPLEMENTATION VERIFICATION AND ACCEPTANCE REPORT
- get_collectors_health
- websocket_endpoint

## God Nodes (most connected - your core abstractions)
1. `SecurityEvent` - 73 edges
2. `Incident` - 61 edges
3. `ResponseAction` - 51 edges
4. `MultiAgentSOCEngine` - 42 edges
5. `BaseAgent` - 41 edges
6. `SecurityEventCreate` - 41 edges
7. `Button()` - 37 edges
8. `User` - 32 edges
9. `normalize_and_ingest_events()` - 32 edges
10. `Badge()` - 32 edges

## Surprising Connections (you probably didn't know these)
- `3. Real-Time Telemetry & Collector Architecture` --references--> `CollectorManager`  [INFERRED]
  docs/DATA_AND_MODEL_FLOW.md → backend/app/services/collectors/collector_manager.py
- `Implementation Status` --references--> `AttackPathAgent`  [INFERRED]
  features.md → backend/app/agents/attack_path_agent.py
- `FR-6: Dynamic Attack-Path Graph Reconstruction` --references--> `AttackPathAgent`  [INFERRED]
  prd.md → backend/app/agents/attack_path_agent.py
- `Implementation Status` --references--> `BaseAgent`  [INFERRED]
  features.md → backend/app/agents/base.py
- `FR-4: Security Event Correlation & Incident Synthesis` --references--> `CorrelationAgent`  [INFERRED]
  prd.md → backend/app/agents/correlation_agent.py

## Import Cycles
- None detected.

## Communities (112 total, 24 thin omitted)

### Community 0 - "Agent Orchestration & Analysis"
Cohesion: 0.06
Nodes (84): api, getAuthHeaders(), request(), App(), ProtectedRoute(), AttackPathGraph(), AttackPathGraphProps, Modal() (+76 more)

### Community 2 - "schemas/event.py"
Cohesion: 0.14
Nodes (13): export_events_csv(), get_event(), import_batch_events(), ingest_single_event(), list_events(), EventBatchIngest, IngestionResult, SecurityEventBase (+5 more)

### Community 3 - "schemas/__init__.py"
Cohesion: 0.13
Nodes (20): AgentFindingResponse, Config, AgentStatusItem, LoginRequest, TokenResponse, UserCreate, UserResponse, Config (+12 more)

### Community 4 - "Frontend API Client"
Cohesion: 0.06
Nodes (76): MetricCardProps, NavSection, SidebarProps, api, getAuthHeaders(), request(), mapBackendIncident(), App() (+68 more)

### Community 5 - "Attack Simulation Engine"
Cohesion: 0.12
Nodes (9): AttackSimulationExecution, SimulationConnectivityStatus, SimulationExecutionResponse, Config, SimulationLaunchRequest, SimulationScenario, SimulationStopRequest, VMNodeStatus (+1 more)

### Community 6 - "detections.py"
Cohesion: 0.12
Nodes (17): list_findings(), list_rules(), trigger_evaluation(), update_rule(), DetectionFinding, DetectionRule, ThreatIndicator, DetectionFindingResponse (+9 more)

### Community 7 - "Frontend Dependencies"
Cohesion: 0.06
Nodes (43): dependencies, clsx@^2.1.1, framer-motion@^14.9.0, lucide-react@^0.469.0, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.28.1, recharts@^2.15.0 (+35 more)

### Community 8 - "os"
Cohesion: 0.23
Nodes (3): extract_feature_importance(), build_preprocessing_metadata(), clean_dataset()

### Community 9 - "Frontend Dependencies (2)"
Cohesion: 0.07
Nodes (36): dependencies, clsx@^2.1.1, framer-motion@^11.5.4, lucide-react@^0.441.0, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.26.2, recharts@^2.12.7 (+28 more)

### Community 10 - "control_demo_stream"
Cohesion: 0.33
Nodes (4): control_demo_stream(), toggle_collector(), test_stream_control_endpoint_lifecycle(), exercise_endpoint()

### Community 11 - "Machine Learning & Telemetry Pipeline (2)"
Cohesion: 0.17
Nodes (12): run_multi_stage_intrusion(), run_port_scan(), run_ssh_brute_force(), test_tcp_connect(), validate_lab_target(), main(), read_guest_output(), _read_guest_output_guarded() (+4 more)

### Community 12 - "Machine Learning & Telemetry Pipeline (3)"
Cohesion: 0.10
Nodes (5): EvaluationRun, run_dataset_evaluation(), CybersecurityPreprocessingPipeline, generate_visualizations(), train_and_evaluate_model()

### Community 13 - "Telemetry Collectors & Ingestion"
Cohesion: 0.11
Nodes (5): BaseCollector, CollectorManager, FileWatcherCollector, SyslogCollector, SyslogProtocol

### Community 14 - "Incident Response & Mitigation"
Cohesion: 0.24
Nodes (14): Incident, ResponseAction, log_audit_entry(), approve_response_action(), execute_response_action(), rollback_response_action(), simulate_response_action(), create_and_run_verification() (+6 more)

### Community 15 - "responses.py"
Cohesion: 0.21
Nodes (15): allow_action(), approve_action(), deny_action(), execute_action(), get_response(), list_responses(), list_verifications(), _require_soc_admin() (+7 more)

### Community 16 - "BaseAgent"
Cohesion: 0.28
Nodes (33): 2.10 ResponseAgent, 2.1 NetworkMonitoringAgent, 2.2 AuthenticationAgent, 2.3 EndpointAgent, 2.4 AnomalyDetectionAgent, 2.5 MaliciousBehaviourAgent, 2.6 ThreatIntelligenceAgent, 2.7 CorrelationAgent (+25 more)

### Community 17 - "Frontend API Client (4)"
Cohesion: 0.17
Nodes (9): create_vm_action(), get_virtualization_diagnostics(), list_vm_nodes(), poll_pending_actions(), run_vm_scenario(), submit_action_result(), submit_vm_telemetry(), verify_vm_auth() (+1 more)

### Community 20 - "Attack Simulation Engine (3)"
Cohesion: 0.20
Nodes (14): AuditLog, VerificationResult, VMAction, VMNode, _create_action(), soar_client(), test_admin_approval_only_changes_approval_state(), test_approval_requires_authenticated_soc_admin_and_audits_denial() (+6 more)

### Community 21 - "Telemetry Collectors & Ingestion (2)"
Cohesion: 0.13
Nodes (5): LiveDemoStreamCollector, test_one_shot_scenarios_enqueue_persisted_security_events(), test_stream_pause_resume_stop_and_duplicate_start(), test_stream_rejects_unknown_scenario_and_invalid_rate(), test_stream_scenarios_persist_normalized_events_and_enqueue()

### Community 22 - "Machine Learning & Telemetry Pipeline (4)"
Cohesion: 0.17
Nodes (6): compute_file_sha256(), download_dataset(), get_dataset_path(), load_genuine_dataset(), validate_dataset_schema(), main()

### Community 23 - "Threat Detection & Rules (2)"
Cohesion: 0.13
Nodes (4): RealtimeEventQueue, test_queue_processing_persists_distinct_processing_time(), 1.1 Backend Architecture & API Layer, 1.1 Backend Architecture & API Layer

### Community 24 - "tsconfig.json / compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 25 - "json"
Cohesion: 0.20
Nodes (6): get_wheel_info(), main(), download_file(), get_wheel_url(), main(), install_portable_node()

### Community 26 - "Frontend API Client (5)"
Cohesion: 0.38
Nodes (10): get_dashboard_summary(), AgentHealthCard, AgentSummary, AttentionItem, CategoryCount, DashboardSummaryResponse, MetricSummary, SeverityCount (+2 more)

### Community 28 - "test_run_local_virtual_nodes.py / FakePr"
Cohesion: 0.19
Nodes (5): FakeProcess, test_read_guest_output_reads_stdout_and_detects_real_ack(), test_runner_stops_started_process_when_later_start_fails(), test_start_guest_node_captures_text_output_and_merges_stderr(), fake_popen()

### Community 29 - "Multi-Agent AI Security Operations Center (SOC) for Real-Time Threat Detection"
Cohesion: 0.07
Nodes (28): 10. Contributors & Academic Defense Team, 1. Introduction & Overview, 1. Real-Time Command Center (`/dashboard`), 2. Key Features, 2. Live Threat Map & Dynamic Attack Graph (`/incidents/{id}`), 3. Forensic Investigation Console (`/incidents/{id}/investigation`), 3. System Architecture Overview, 4. SOAR Containment & Verification Center (`/responses`) (+20 more)

### Community 30 - "2. Step-by-Step Installation"
Cohesion: 0.07
Nodes (27): 1.1 Minimum & Recommended Hardware, 1.2 Required Software Packages, 1. System Requirements & Prerequisites, 2. Step-by-Step Installation, 3. Running the Application, 4. Default Login Credentials, 5. Post-Installation Verification & Testing, 6. Message Broker Configuration: In-Memory vs. Apache Kafka (+19 more)

### Community 31 - "AnomalyDetectionEngine"
Cohesion: 0.10
Nodes (9): AnomalyDetectionEngine, 1. Summary of Evaluated Models & Algorithms, 2. In-Depth Cross-Questioning of Each Model, A. Isolation Forest (Unsupervised Anomaly Detector), C. Decision Tree Classifier (Supervised Comparative Baseline), D. Multi-Agent Correlation Algorithm, E. Topological Attack-Path Analysis, F. Calibrated Multi-Factor Risk Engine (+1 more)

### Community 32 - "vm_service.py"
Cohesion: 0.13
Nodes (26): get_lab_nodes_status(), get_pending_vm_actions(), ingest_vm_telemetry(), record_vm_action_result(), record_vm_heartbeat(), seed_default_vm_nodes(), test_broadcaster_event_dispatch(), test_collector_manager_and_freshness_warnings() (+18 more)

### Community 33 - "Security Event Pipeline"
Cohesion: 0.36
Nodes (8): now_iso(), post_telemetry(), scenario_brute_force(), scenario_ddos(), scenario_exfiltration(), scenario_portscan(), scenario_ransomware(), send()

### Community 34 - "sqlalchemy_orm"
Cohesion: 0.11
Nodes (13): get_current_user_profile(), login(), logout(), get_simulation_execution(), get_simulation_status(), get_supported_scenarios(), list_simulation_executions(), get_db() (+5 more)

### Community 44 - "System Architecture: Multi-Agent AI Security Operations Center (SOC)"
Cohesion: 0.07
Nodes (26): 10.1 Authentication & Authorization, 10.2 Defense Against Adversarial Manipulation, 10.3 Network & Transport Security, 10. Security Considerations & Defenses, 1. Overall System Architecture, 2.1 Ingestion & Telemetry Sources, 2.2 Telemetry Broker & Queue, 2.3 Detection Engine & ML Pipeline (+18 more)

### Community 46 - "main.py"
Cohesion: 0.11
Nodes (12): get_audit_logs(), get_policies(), global_websocket_endpoint(), healthcheck(), lifespan(), root(), seed_detection_rules(), seed_threat_intelligence() (+4 more)

### Community 47 - "Project Context: Multi-Agent AI Security Operations Center (SOC)"
Cohesion: 0.10
Nodes (20): 10. Automated Test Results & Verification, 11. Known Limitations & Environmental Constraints, 1. Project Identification & Metadata, 2. Problem Statement & System Purpose, 3. End-to-End Operational Lifecycle & Flow, 5.1 Dual-Layer Detection Model, 5.2 Authentic Dataset Provenance, 5.3 Leak-Free Preprocessing Pipeline (`ml/preprocessing/pipeline.py`) (+12 more)

### Community 48 - "KNOWN LIMITATIONS & ENVIRONMENTAL CONSTRAINTS"
Cohesion: 0.11
Nodes (18): 1.1 Technical Constraint Description, 1.2 Status & Academic Honesty Verdict, 1.3 Verified Workaround & Demonstration, 1.4 Workstation Requirements for Full Three-VM Lab, 1. Hardware Virtualization & Three-VM Virtual Lab Constraint, 2.1 Technical Constraint Description, 2.2 Mitigation, 2. Actual Guest Firewall Containment vs Simulated Dry-Run (+10 more)

### Community 49 - "KNOWN LIMITATIONS & ENVIRONMENTAL CONSTRAINTS"
Cohesion: 0.11
Nodes (18): 1.1 Technical Constraint Description, 1.2 Status & Academic Honesty Verdict, 1.3 Verified Workaround & Demonstration, 1.4 Workstation Requirements for Full Three-VM Lab, 1. Hardware Virtualization & Three-VM Virtual Lab Constraint, 2.1 Technical Constraint Description, 2.2 Mitigation, 2. Actual Guest Firewall Containment vs Simulated Dry-Run (+10 more)

### Community 50 - "incidents.py"
Cohesion: 0.16
Nodes (13): add_incident_note(), get_incident_detail(), list_incidents(), trigger_incident_investigation(), update_incident_status(), IncidentAudit, IncidentEvent, IncidentNote (+5 more)

### Community 51 - "agents.py"
Cohesion: 0.24
Nodes (9): get_agent_findings(), get_agent_runs(), get_agents_status(), trigger_agent_execution(), AgentExecution, AgentFinding, AgentExecutionResponse, Config (+1 more)

### Community 52 - "threat_intel_service.py"
Cohesion: 0.27
Nodes (6): list_indicators(), lookup_threat(), ThreatIndicatorResponse, Config, ThreatLookupRequest, ThreatLookupResponse

### Community 53 - "Product Requirements Document (PRD)"
Cohesion: 0.11
Nodes (17): 1. Project Overview, 2. Problem Statement, 3. Objectives, 4. Target Users & Personas, 6. Non-Functional Requirements, 7. System Constraints, 8. Success Criteria, 9. Scope and Limitations (+9 more)

### Community 54 - "Running the Multi-Agent AI SOC Platform"
Cohesion: 0.12
Nodes (16): Architecture, Attack Simulation Feature (All Files Confirmed Present After Merge), Current Repository State (After Merge), Environment Configuration (`.env`), File Integrity Verification Script, File Map, Live VM Tunnel, Push to GitHub (+8 more)

### Community 55 - "api/evaluation.py"
Cohesion: 0.30
Nodes (6): evaluate_dataset(), get_evaluation_run(), list_evaluation_runs(), DatasetEvaluationRequest, EvaluationRunResponse, Config

### Community 56 - "Cybersecurity Dataset and Training Audit: Multi-Agent AI SOC"
Cohesion: 0.12
Nodes (15): 1. Required Benchmark Datasets Overview, 2. Dataset 1: UNSW-NB15 Provenance & Verification, 3. Dataset 2: CICIDS2017 Provenance & Verification, 4. Persisted Model Artifacts & Live Pipeline Integration, 5. Audit Conclusion, A. Official Metadata & Sources, A. Official Metadata & Sources, B. Local Authentic File Inspection (+7 more)

### Community 57 - "1. Development Lifecycle & Phase Breakdown"
Cohesion: 0.12
Nodes (15): 1. Development Lifecycle & Phase Breakdown, 2. Feature Implementation Status Matrix, 3. Testing Strategy & Execution Results, 4. Future Enhancements & Product Roadmap, Automated Test Suite Execution Summary, Measured Real-Time Latency Benchmarks, Phase 10: Virtual Lab, Adversary Emulation & Final Verification, Phase 1: Core Foundation & Data Modeling (+7 more)

### Community 58 - "ingestion_service.py"
Cohesion: 0.17
Nodes (9): UTCDateTime, ensure_event_processed_at_column(), ensure_utc(), format_ist(), utc_isoformat(), test_existing_event_migration_preserves_historical_timestamp(), test_utc_timestamp_normalization_and_ist_format(), G. 8-Question Root Cause Analysis (Investigation Agent) (+1 more)

### Community 59 - "report_service.py"
Cohesion: 0.23
Nodes (4): download_incident_report(), download_summary_report(), generate_incident_pdf(), generate_soc_summary_pdf()

### Community 60 - "SDMCET VII SEMESTER MAJOR PROJECT — FINAL SYNOPSIS COMPLIANCE & ACCEPTANCE REPORT"
Cohesion: 0.14
Nodes (13): 1. Executive Summary & Verdict, 3. Dataset Provenance & Machine Learning Audit, 5. End-to-End Test Execution Summary, 6. How to Run the Application & Verify, 7. Faculty Presentation & Academic Defense Summary, A. Run Full Test Suites, Authentic Datasets Evaluated, B. Train Supervised ML Models on Authentic Datasets (+5 more)

### Community 61 - "Scenario A: SSH Authentication Brute-Force Attack"
Cohesion: 0.14
Nodes (13): 1. Goal, 1. Goal, 1. Goal, 2. Execution from Attacker VM (`192.168.56.20`):, 2. Execution from Attacker VM (`192.168.56.20`):, 2. Execution from Attacker VM (`192.168.56.20`):, 3. Expected Telemetry & SOC Detection:, 3. Expected Telemetry & SOC Detection: (+5 more)

### Community 62 - "1. Synopsis Requirement Acceptance Checklist"
Cohesion: 0.15
Nodes (12): 1.2 Machine Learning & Benchmark Datasets, 1.3 Multi-Agent SOC Architecture (All 10 Agents), 1.4 SOAR Response & Verification Engine, 1.5 Frontend Dashboard, 1.6 Three-VM Virtual Enterprise Lab, 1. Synopsis Requirement Acceptance Checklist, 2. Features Verified vs Features Still Pending, 3. Security & Repository Audit (+4 more)

### Community 63 - "1. Synopsis Requirement Acceptance Checklist"
Cohesion: 0.15
Nodes (12): 1.2 Machine Learning & Benchmark Datasets, 1.3 Multi-Agent SOC Architecture (All 10 Agents), 1.4 SOAR Response & Verification Engine, 1.5 Frontend Dashboard, 1.6 Three-VM Virtual Enterprise Lab, 1. Synopsis Requirement Acceptance Checklist, 2. Features Verified vs Features Still Pending, 3. Security & Repository Audit (+4 more)

### Community 64 - "REST & Streaming API Documentation"
Cohesion: 0.17
Nodes (11): 1. Ingested Event Frame (`EVENT_INGESTED`), 2. Alert Generation Frame (`ALERT_RAISED`), 2. API Interaction Sequence Flows, 3. Agent Execution Log Frame (`AGENT_EXECUTION`), 4. Containment Action Update (`ACTION_STATUS_CHANGED`), 4. WebSocket Streaming Protocol (`/api/ws`), Connection Handshake, Flow A: Telemetry Ingestion to Real-Time Alert Broadcast (+3 more)

### Community 65 - "3. Complete Endpoint Reference"
Cohesion: 0.17
Nodes (12): 3.10 Historical Evaluation & ML Benchmark (`/api/evaluation`), 3.1 Authentication (`/api/auth`), 3.7 Threat Intelligence (`/api/intelligence`), 3. Complete Endpoint Reference, `GET /api/auth/me`, `GET /api/evaluation/runs`, `GET /api/evaluation/runs/{run_id}`, `GET /api/intelligence/indicators` (+4 more)

### Community 67 - "3. Verified Implementations & Reproducibility"
Cohesion: 0.17
Nodes (11): 1. Executive Summary & Academic Specification, 2. Host Environmental Audit, 3. Verified Implementations & Reproducibility, 3-VM Virtual Lab Acceptance & Environmental Audit Report, 4. Hardware Lab Deployment Guide, A. Vagrantfile Architecture, B. Guest Telemetry Collector Architecture, C. Controlled Attacker Toolkit Safety (+3 more)

### Community 68 - "3.11 Monitoring, Health & Settings (`/api/health`, `/api/settings`, `/api/dashboard`, `/api/reports`)"
Cohesion: 0.18
Nodes (11): 3.11 Monitoring, Health & Settings (`/api/health`, `/api/settings`, `/api/dashboard`, `/api/reports`), `GET /api/dashboard/summary`, `GET /api/health/collectors`, `GET /api/health/pipeline`, `GET /api/reports/incidents/{incident_id}/pdf`, `GET /api/reports/summary/pdf`, `GET /api/settings/audit-logs`, `GET /api/settings/policies` & `PUT /api/settings/policies` (+3 more)

### Community 69 - "2. Detailed Test Results & Outputs"
Cohesion: 0.17
Nodes (11): 1. Test Execution Summary, 2.2 Frontend-Backend Integration Test Suite, 2.3 Phase 10 Acceptance Verification, 2.4 Final Acceptance Evidence Audit, 2.5 Dynamic Telemetry Audit, 2.6 Frontend Production Build, 2. Detailed Test Results & Outputs, 3. Real-Time Latency Benchmark Table (+3 more)

### Community 70 - "2. Step-by-Step Deployment Runbook"
Cohesion: 0.18
Nodes (10): 1. Executive Summary & Hardware Requirements, 2. Step-by-Step Deployment Runbook, GENUINE VIRTUAL ENTERPRISE NETWORK LAB — DEPLOYMENT & ACCEPTANCE GUIDE, Minimum Workstation Requirements for Hardware Kernel Virtualization, Step 1: Install Hypervisor & Tooling (PowerShell as Administrator), Step 2: Verify Host-Only Network Adapter, Step 3: Provision the 3 Isolated Guest VMs, Step 4: Start SOC Central Platform on Host (+2 more)

### Community 71 - "2. Detailed Test Results & Outputs"
Cohesion: 0.17
Nodes (11): 1. Test Execution Summary, 2.2 Frontend-Backend Integration Test Suite, 2.3 Phase 10 Acceptance Verification, 2.4 Final Acceptance Evidence Audit, 2.5 Dynamic Telemetry Audit, 2.6 Frontend Production Build, 2. Detailed Test Results & Outputs, 3. Real-Time Latency Benchmark Table (+3 more)

### Community 72 - "5. Functional Requirements"
Cohesion: 0.18
Nodes (11): 5. Functional Requirements, FR-10: Forensic Reporting & PDF Dossier Export, FR-1: Telemetry Ingestion & Normalization, FR-2: Dual-Layer Threat Detection Engine, FR-3: Multi-Agent Autonomous Orchestration, FR-4: Security Event Correlation & Incident Synthesis, FR-5: Bounded Mathematical Risk Scoring, FR-6: Dynamic Attack-Path Graph Reconstruction (+3 more)

### Community 73 - "3.6 SOAR & Containment Responses (`/api/responses`)"
Cohesion: 0.20
Nodes (10): 3.6 SOAR & Containment Responses (`/api/responses`), `GET /api/responses`, `GET /api/responses/{action_id}`, `GET /api/responses/verifications`, `POST /api/responses/{action_id}/allow`, `POST /api/responses/{action_id}/approve`, `POST /api/responses/{action_id}/deny`, `POST /api/responses/{action_id}/execute` (+2 more)

### Community 74 - "3. Useful Functionality Acquired from Reference Repository"
Cohesion: 0.20
Nodes (9): 1. Executive Summary, 2. Comprehensive Component Gap Matrix, 3. Useful Functionality Acquired from Reference Repository, 4. Features Preserved Exclusively from Kaveri's Implementation, A. Dataset Cleaning (`clean_dataset.py`), B. Preprocessing Metadata Extraction (`build_preprocessing_metadata.py`), C. Feature Importance Analysis (`feature_importance.py`), D. Continuous Event Stream Replay (`kafka/realtime_producer.py`, `realtime_wrapper.py`) (+1 more)

### Community 75 - "3.8 Virtual Enterprise Lab (`/api/vm`)"
Cohesion: 0.22
Nodes (9): 3.8 Virtual Enterprise Lab (`/api/vm`), `GET /api/vm/actions/pending`, `GET /api/vm/diagnostics`, `GET /api/vm/nodes`, `POST /api/vm/actions/{action_id}/result`, `POST /api/vm/actions/create`, `POST /api/vm/heartbeat`, `POST /api/vm/simulation/run` (+1 more)

### Community 76 - "Guest Telemetry Collector Daemon Setup Guide"
Cohesion: 0.22
Nodes (8): 1. Prerequisites on the Guest VM, 2. Quick-Start Execution, 3. Running as a Persistent Systemd Service (Optional), 4. How the Guest Daemon Works, Guest Telemetry Collector Daemon Setup Guide, On Endpoint VM (192.168.56.10):, On Server VM (192.168.56.15):, Running Local Guest-Agent Processes

### Community 77 - "SecurityEventCreate"
Cohesion: 0.25
Nodes (10): reset_lab(), trigger_scenario(), SecurityEventCreate, _queue_scenario_events(), reset_demo_lab(), run_scenario_1_brute_force(), run_scenario_2_network_scan(), run_scenario_3_account_compromise() (+2 more)

### Community 78 - "dataset_pipeline.py"
Cohesion: 0.13
Nodes (5): load_or_create_reference_dataset(), load_persisted_classifier(), run_realtime_flow_inference(), train_and_evaluate_pipeline(), B. Random Forest Classifier (Supervised Intrusion Classifier)

### Community 79 - "analyze_threat_findings"
Cohesion: 0.16
Nodes (3): analyze_threat_findings(), _call_gemini_api(), _local_cybersecurity_expert_reasoning()

### Community 80 - "DATA AND MODEL FLOW ARCHITECTURE"
Cohesion: 0.25
Nodes (7): 1. High-Level Data Lifecycle, 2.1 Zero-Leakage Preprocessing & Training, 2.2 Real-Time Online Inference Flow, 2. Machine Learning Training & Inference Flow, 3. Real-Time Telemetry & Collector Architecture, 4. 0–100 Incident Risk Scoring Formula, DATA AND MODEL FLOW ARCHITECTURE

### Community 81 - "3.9 Attack Simulation Console (`/api/simulation`)"
Cohesion: 0.29
Nodes (7): 3.9 Attack Simulation Console (`/api/simulation`), `GET /api/simulation/executions`, `GET /api/simulation/executions/{execution_id}`, `GET /api/simulation/scenarios`, `GET /api/simulation/status`, `POST /api/simulation/{execution_id}/stop`, `POST /api/simulation/launch`

### Community 82 - "3.2 Telemetry & Event Ingestion (`/api/events`)"
Cohesion: 0.33
Nodes (6): 3.2 Telemetry & Event Ingestion (`/api/events`), `GET /api/events`, `GET /api/events/{event_id}`, `GET /api/events/export/csv`, `POST /api/events/import`, `POST /api/events/ingest`

### Community 83 - "3.5 Incident Management (`/api/incidents`)"
Cohesion: 0.33
Nodes (6): 3.5 Incident Management (`/api/incidents`), `GET /api/incidents`, `GET /api/incidents/{incident_id}`, `PATCH /api/incidents/{incident_id}/status`, `POST /api/incidents/{incident_id}/investigate`, `POST /api/incidents/{incident_id}/notes`

### Community 84 - "2.10 Real-Time Dashboard & Visualization"
Cohesion: 0.33
Nodes (6): 2.10 Real-Time Dashboard & Visualization, Description, Implementation Status, Key Capabilities, Relevant Source Files, Typical Use Cases

### Community 85 - "2.1 Network Monitoring & Flow Sniffing"
Cohesion: 0.33
Nodes (6): 2.1 Network Monitoring & Flow Sniffing, Description, Implementation Status, Key Capabilities, Relevant Source Files, Typical Use Cases

### Community 86 - "2.2 Real-Time Threat Detection"
Cohesion: 0.33
Nodes (6): 2.2 Real-Time Threat Detection, Description, Implementation Status, Key Capabilities, Relevant Source Files, Typical Use Cases

### Community 87 - "2.3 Machine Learning Classification"
Cohesion: 0.33
Nodes (6): 2.3 Machine Learning Classification, Description, Implementation Status, Key Capabilities, Relevant Source Files, Typical Use Cases

### Community 88 - "2.4 Multi-Agent Collaborative Analysis"
Cohesion: 0.33
Nodes (6): 2.4 Multi-Agent Collaborative Analysis, Description, Implementation Status, Key Capabilities, Relevant Source Files, Typical Use Cases

### Community 89 - "2.5 Dynamic Attack-Path Graph Analysis"
Cohesion: 0.33
Nodes (6): 2.5 Dynamic Attack-Path Graph Analysis, Description, Implementation Status, Key Capabilities, Relevant Source Files, Typical Use Cases

### Community 90 - "2.6 Spatial-Temporal Event Correlation"
Cohesion: 0.33
Nodes (6): 2.6 Spatial-Temporal Event Correlation, Description, Implementation Status, Key Capabilities, Relevant Source Files, Typical Use Cases

### Community 91 - "2.7 Alert Generation & Risk Prioritization"
Cohesion: 0.33
Nodes (6): 2.7 Alert Generation & Risk Prioritization, Description, Implementation Status, Key Capabilities, Relevant Source Files, Typical Use Cases

### Community 92 - "2.8 Incident Management & SOAR Containment"
Cohesion: 0.33
Nodes (6): 2.8 Incident Management & SOAR Containment, Description, Implementation Status, Key Capabilities, Relevant Source Files, Typical Use Cases

### Community 93 - "2.9 Search, Retrieval & Telemetry Querying"
Cohesion: 0.33
Nodes (6): 2.9 Search, Retrieval & Telemetry Querying, Description, Implementation Status, Key Capabilities, Relevant Source Files, Typical Use Cases

### Community 94 - "1. Overview & Authentication"
Cohesion: 0.40
Nodes (5): 1. Overview & Authentication, Authentication Mechanism, Base URLs, Common HTTP Status & Error Codes, Standard Error Response Format

### Community 95 - "3.3 Detections & Rule Engine (`/api/detections`)"
Cohesion: 0.40
Nodes (5): 3.3 Detections & Rule Engine (`/api/detections`), `GET /api/detections`, `GET /api/detections/rules`, `POST /api/detections/evaluate`, `PUT /api/detections/rules/{rule_id}`

### Community 96 - "3.4 Multi-Agent Orchestration (`/api/agents`)"
Cohesion: 0.40
Nodes (5): 3.4 Multi-Agent Orchestration (`/api/agents`), `GET /api/agents/findings`, `GET /api/agents/runs`, `GET /api/agents/status`, `POST /api/agents/run`

### Community 97 - "Virtual Enterprise Network Architecture & Lab Topology"
Cohesion: 0.40
Nodes (4): 1. Enterprise Network Lab Topology, 2. IP Addressing & Component Roles, 3. Network Isolation Guarantee, Virtual Enterprise Network Architecture & Lab Topology

### Community 98 - "Multi-Agent Architecture & Agent Specifications"
Cohesion: 0.50
Nodes (3): 1. Overview & Blackboard Coordination Model, Multi-Agent Architecture & Agent Specifications, Multi-Agent Interaction Diagram

### Community 100 - "2. Granular Feature Specifications"
Cohesion: 0.50
Nodes (3): 1. Feature Implementation Matrix, 2. Granular Feature Specifications, Comprehensive Features Catalog & Implementation Matrix

### Community 106 - "sys"
Cohesion: 0.29
Nodes (3): get_scenario_events(), main(), run_integration_verification()

### Community 107 - "2. Detailed Verification Test Suites"
Cohesion: 0.25
Nodes (7): 1. Test Suite Summary, 2. Detailed Verification Test Suites, 3. Real-Time Latency Benchmarks, End-to-End Test and Verification Report: Multi-Agent AI SOC, Test Suite 2: Frontend-Backend Integration & WebSocket Acceptance, Test Suite 3: Phase 10 Acceptance Verification, Test Suite 4: Dynamic Telemetry & False-Positive Acceptance

### Community 108 - "FINAL REAL-TIME IMPLEMENTATION VERIFICATION AND ACCEPTANCE REPORT"
Cohesion: 0.25
Nodes (7): 1. Overall Acceptance Decision, 3.1 Genuine Dataset Provenance & Record Statistics, 3.2 Leak-Free Preprocessing Pipeline, 3.3 Live Real-Time Ingestion Integration, 3. Machine Learning Training & Inference Rigor, 4. Latency & Performance Measurements, FINAL REAL-TIME IMPLEMENTATION VERIFICATION AND ACCEPTANCE REPORT

## Knowledge Gaps
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `InvestigationAgent` connect `BaseAgent` to `SecurityEvent`, `detections.py`, `5. Functional Requirements`, `Incident Response & Mitigation`, `analyze_threat_findings`, `incidents.py`, `3.5 Incident Management (`/api/incidents`)`, `Product Requirements Document (PRD)`, `ingestion_service.py`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Are the 34 inferred relationships involving `SecurityEvent` (e.g. with `AnomalyDetectionAgent` and `AttackPathAgent`) actually correct?**
  _`SecurityEvent` has 34 INFERRED edges - model-reasoned connections that need verification._
- **Should `Agent Orchestration & Analysis` be split into smaller, more focused modules?**
  _Cohesion score 0.05909090909090909 - nodes in this community are weakly interconnected._
- **Why does `SecurityEvent` connect `SecurityEvent` to `vm_service.py`, `schemas/event.py`, `ingestion_service.py`, `Attack Simulation Engine`, `detections.py`, `Machine Learning & Telemetry Pipeline (2)`, `SecurityEventCreate`, `Incident Response & Mitigation`, `analyze_threat_findings`, `BaseAgent`, `main.py`, `incidents.py`, `datetime`, `Telemetry Collectors & Ingestion (2)`, `Threat Detection & Rules (2)`, `Frontend API Client (5)`, `report_service.py`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Are the 35 inferred relationships involving `Incident` (e.g. with `AttackPathAgent` and `CorrelationAgent`) actually correct?**
  _`Incident` has 35 INFERRED edges - model-reasoned connections that need verification._
- **Should `schemas/event.py` be split into smaller, more focused modules?**
  _Cohesion score 0.14245014245014245 - nodes in this community are weakly interconnected._
- **Why does ``POST /api/incidents/{incident_id}/investigate`` connect `3.5 Incident Management (`/api/incidents`)` to `BaseAgent`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._