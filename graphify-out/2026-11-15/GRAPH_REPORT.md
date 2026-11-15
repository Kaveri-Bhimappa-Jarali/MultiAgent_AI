# Graph Report - kaveri2  (2026-11-10)

## Corpus Check
- 254 files · ~183,941 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 40 file(s) not represented in the graph (top: .joblib 12, (none) 6, .csv 6)

## Summary
- 1923 nodes · 5021 edges · 136 communities (110 shown, 26 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 542 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d387a07b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Agent Orchestration & Analysis
- SecurityEvent
- database.py
- schemas/__init__.py
- ref_react
- SimulationService
- detections.py
- Frontend Dependencies
- time
- Frontend Dependencies (2)
- generate_incident_pdf
- sys
- Machine Learning & Telemetry Pipeline (3)
- CollectorManager
- Incident
- responses.py
- BaseAgent
- Frontend API Client (4)
- Agent Orchestration & Analysis (5)
- launch_simulation
- Attack Simulation Engine (3)
- LiveDemoStreamCollector
- Machine Learning & Telemetry Pipeline (4)
- Threat Detection & Rules (2)
- tsconfig.json / compilerOptions
- install_portable_node.py
- Frontend API Client (5)
- BroadcasterService / .broadcast()
- test_run_local_virtual_nodes.py / FakePr
- Multi-Agent AI Security Operations Center (SOC) for Real-Time Threat Detection
- 2. Step-by-Step Installation
- AnomalyDetectionEngine
- vm_service.py
- Security Event Pipeline
- auth_service.py
- start_vm_tunnel.sh / start_vm_tunnel.sh 
- System Architecture: Multi-Agent AI Security Operations Center (SOC)
- .record_finding
- get_collectors_health
- Project Context: Multi-Agent AI Security Operations Center (SOC)
- KNOWN LIMITATIONS & ENVIRONMENTAL CONSTRAINTS
- KNOWN LIMITATIONS & ENVIRONMENTAL CONSTRAINTS
- typing
- agents.py
- threat_intel_service.py
- Product Requirements Document (PRD)
- Running the Multi-Agent AI SOC Platform
- api/evaluation.py
- Cybersecurity Dataset and Training Audit: Multi-Agent AI SOC
- 1. Development Lifecycle & Phase Breakdown
- simulation_service.py
- Comprehensive System Specification & Master Technical Overview: Multi-Agent AI Security Operations Center (SOC)
- SDMCET VII SEMESTER MAJOR PROJECT — FINAL SYNOPSIS COMPLIANCE & ACCEPTANCE REPORT
- Scenario A: SSH Authentication Brute-Force Attack
- 1. Synopsis Requirement Acceptance Checklist
- 1. Synopsis Requirement Acceptance Checklist
- REST & Streaming API Documentation
- 3. Complete Endpoint Reference
- datetime
- 3. Verified Implementations & Reproducibility
- 3.11 Monitoring, Health & Settings (`/api/health`, `/api/settings`, `/api/dashboard`, `/api/reports`)
- 2. Detailed Test Results & Outputs
- 2. Step-by-Step Deployment Runbook
- 2. Detailed Test Results & Outputs
- 6. Detailed Specifications of the 10 Autonomous SOC Agents
- 3.6 SOAR & Containment Responses (`/api/responses`)
- 3. Useful Functionality Acquired from Reference Repository
- 3.8 Virtual Enterprise Lab (`/api/vm`)
- Guest Telemetry Collector Daemon Setup Guide
- SecurityEventCreate
- os
- 4. Novel Features & Key Technical Innovations
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
- 5. End-to-End System Architecture
- 2. Granular Feature Specifications
- 11. SOAR Containment & 7-State Response Verification Lifecycle
- 12. Virtual Enterprise Lab & Attack Simulation Suite
- PROJECT STRUCTURE DOCUMENTATION
- SYNOPSIS_COMPLIANCE_MATRIX.md
- test_realtime_pipeline.py
- 2. Detailed Verification Test Suites
- FINAL REAL-TIME IMPLEMENTATION VERIFICATION AND ACCEPTANCE REPORT
- run_realtime_flow_inference
- 2. Component Descriptions
- 15. Frontend Dashboard & Visualization Architecture
- 16. Empirical Verification & Test Execution Results
- 8. Machine Learning Pipeline & Empirical Benchmark Evaluation
- 10. Dynamic 7-Factor Mathematical Risk Scoring Model
- MultiAgentSOCEngine
- 18. Project Governance, Team Ownership & Conclusion
- 2. Project Background, Problem Statement & Overall Explanation
- 7. Dual-Layer Threat Detection Engine & 12 MITRE ATT&CK Rules
- NetworkFlowSniffer
- 3. Project Goals, Objectives & Performance Targets
- 5. Functional Requirements
- run_local_virtual_nodes.py
- FileWatcherCollector
- analyze_threat_findings
- control_demo_stream
- Project Implementation Plan, Milestones & Roadmap
- 6. Non-Functional Requirements
- test_stream_scenarios_persist_normalized_events_and_enqueue
- websocket_endpoint
- update_policies
- 13. REST & Streaming API Specifications
- 14. Database Architecture & Relational Data Model
- 17. Known Limitations, Operational Constraints & Future Roadmap

## God Nodes (most connected - your core abstractions)
1. `SecurityEvent` - 69 edges
2. `Incident` - 56 edges
3. `ResponseAction` - 50 edges
4. `MultiAgentSOCEngine` - 44 edges
5. `BaseAgent` - 43 edges
6. `SecurityEventCreate` - 41 edges
7. `Button()` - 37 edges
8. `User` - 32 edges
9. `Badge()` - 32 edges
10. `normalize_and_ingest_events()` - 32 edges

## Surprising Connections (you probably didn't know these)
- `1.3 Multi-Agent SOC Architecture (All 10 Agents)` --references--> `MultiAgentSOCEngine`  [INFERRED]
  docs/FINAL_ACCEPTANCE_CHECKLIST.md → backend/app/agents/orchestrator.py
- `1.3 Multi-Agent SOC Architecture (All 10 Agents)` --references--> `MultiAgentSOCEngine`  [INFERRED]
  FINAL_ACCEPTANCE_CHECKLIST.md → backend/app/agents/orchestrator.py
- `FR-3: Multi-Agent Autonomous Orchestration` --references--> `MultiAgentSOCEngine`  [INFERRED]
  prd.md → backend/app/agents/orchestrator.py
- `In-Scope (Implemented & Verified)` --references--> `MultiAgentSOCEngine`  [INFERRED]
  prd.md → backend/app/agents/orchestrator.py
- `3. Real-Time Telemetry & Collector Architecture` --references--> `CollectorManager`  [INFERRED]
  docs/DATA_AND_MODEL_FLOW.md → backend/app/services/collectors/collector_manager.py

## Import Cycles
- None detected.

## Communities (136 total, 26 thin omitted)

### Community 0 - "Agent Orchestration & Analysis"
Cohesion: 0.06
Nodes (84): api, getAuthHeaders(), request(), App(), ProtectedRoute(), AttackPathGraph(), AttackPathGraphProps, Modal() (+76 more)

### Community 1 - "SecurityEvent"
Cohesion: 0.26
Nodes (3): SecurityEvent, IncidentAudit, IncidentEvent

### Community 2 - "database.py"
Cohesion: 0.10
Nodes (16): export_events_csv(), get_event(), list_events(), get_audit_logs(), get_policies(), get_db(), AuditLog, UTCDateTime (+8 more)

### Community 3 - "schemas/__init__.py"
Cohesion: 0.11
Nodes (23): add_incident_note(), get_correlation_detail(), get_incident_detail(), list_correlations(), list_incidents(), update_incident_status(), IncidentNote, UTCBaseModel (+15 more)

### Community 4 - "ref_react"
Cohesion: 0.06
Nodes (77): MetricCardProps, NavSection, SidebarProps, api, getAuthHeaders(), request(), mapBackendIncident(), App() (+69 more)

### Community 6 - "detections.py"
Cohesion: 0.17
Nodes (14): list_findings(), list_rules(), trigger_evaluation(), update_rule(), DetectionFinding, DetectionRule, DetectionFindingResponse, Config (+6 more)

### Community 7 - "Frontend Dependencies"
Cohesion: 0.06
Nodes (43): dependencies, clsx@^2.1.1, framer-motion@^14.9.0, lucide-react@^0.469.0, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.28.1, recharts@^2.15.0 (+35 more)

### Community 8 - "time"
Cohesion: 0.22
Nodes (8): download_file(), get_wheel_url(), main(), run_multi_stage_intrusion(), run_port_scan(), run_ssh_brute_force(), test_tcp_connect(), validate_lab_target()

### Community 9 - "Frontend Dependencies (2)"
Cohesion: 0.07
Nodes (36): dependencies, clsx@^2.1.1, framer-motion@^11.5.4, lucide-react@^0.441.0, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.26.2, recharts@^2.12.7 (+28 more)

### Community 10 - "generate_incident_pdf"
Cohesion: 0.33
Nodes (4): download_incident_report(), download_summary_report(), generate_incident_pdf(), generate_soc_summary_pdf()

### Community 11 - "sys"
Cohesion: 0.29
Nodes (3): get_scenario_events(), main(), run_integration_verification()

### Community 12 - "Machine Learning & Telemetry Pipeline (3)"
Cohesion: 0.12
Nodes (3): CybersecurityPreprocessingPipeline, generate_visualizations(), train_and_evaluate_model()

### Community 13 - "CollectorManager"
Cohesion: 0.18
Nodes (3): CollectorManager, SyslogCollector, SyslogProtocol

### Community 14 - "Incident"
Cohesion: 0.24
Nodes (14): Incident, ResponseAction, log_audit_entry(), approve_response_action(), execute_response_action(), rollback_response_action(), simulate_response_action(), create_and_run_verification() (+6 more)

### Community 15 - "responses.py"
Cohesion: 0.26
Nodes (15): allow_action(), approve_action(), deny_action(), execute_action(), get_response(), list_responses(), list_verifications(), _require_soc_admin() (+7 more)

### Community 16 - "BaseAgent"
Cohesion: 0.28
Nodes (32): 2.10 ResponseAgent, 2.1 NetworkMonitoringAgent, 2.2 AuthenticationAgent, 2.3 EndpointAgent, 2.4 AnomalyDetectionAgent, 2.5 MaliciousBehaviourAgent, 2.6 ThreatIntelligenceAgent, 2.7 CorrelationAgent (+24 more)

### Community 17 - "Frontend API Client (4)"
Cohesion: 0.14
Nodes (15): create_vm_action(), get_virtualization_diagnostics(), list_vm_nodes(), poll_pending_actions(), run_vm_scenario(), submit_action_result(), submit_vm_telemetry(), verify_vm_auth() (+7 more)

### Community 19 - "launch_simulation"
Cohesion: 0.17
Nodes (5): get_simulation_execution(), get_simulation_status(), get_supported_scenarios(), launch_simulation(), list_simulation_executions()

### Community 20 - "Attack Simulation Engine (3)"
Cohesion: 0.21
Nodes (13): VerificationResult, VMAction, VMNode, _create_action(), soar_client(), test_admin_approval_only_changes_approval_state(), test_approval_requires_authenticated_soc_admin_and_audits_denial(), test_each_simulation_creates_a_separate_verification_log_entry() (+5 more)

### Community 21 - "LiveDemoStreamCollector"
Cohesion: 0.16
Nodes (3): LiveDemoStreamCollector, test_stream_pause_resume_stop_and_duplicate_start(), test_stream_rejects_unknown_scenario_and_invalid_rate()

### Community 22 - "Machine Learning & Telemetry Pipeline (4)"
Cohesion: 0.19
Nodes (6): compute_file_sha256(), download_dataset(), get_dataset_path(), load_genuine_dataset(), validate_dataset_schema(), main()

### Community 24 - "tsconfig.json / compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 25 - "install_portable_node.py"
Cohesion: 0.36
Nodes (3): get_wheel_info(), main(), install_portable_node()

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

### Community 32 - "vm_service.py"
Cohesion: 0.18
Nodes (19): test_broadcaster_event_dispatch(), test_collector_manager_and_freshness_warnings(), test_duplicate_event_handling(), test_event_driven_agent_orchestration_and_correlation(), test_rolling_window_brute_force_detection(), test_anomaly_detection_model(), test_auth_and_seed_users(), test_multi_agent_pipeline_and_correlation() (+11 more)

### Community 33 - "Security Event Pipeline"
Cohesion: 0.36
Nodes (8): now_iso(), post_telemetry(), scenario_brute_force(), scenario_ddos(), scenario_exfiltration(), scenario_portscan(), scenario_ransomware(), send()

### Community 34 - "auth_service.py"
Cohesion: 0.15
Nodes (13): get_current_user_profile(), login(), logout(), LoginRequest, TokenResponse, UserCreate, UserResponse, Config (+5 more)

### Community 44 - "System Architecture: Multi-Agent AI Security Operations Center (SOC)"
Cohesion: 0.10
Nodes (20): 10.1 Authentication & Authorization, 10.2 Defense Against Adversarial Manipulation, 10.3 Network & Transport Security, 10. Security Considerations & Defenses, 1. Overall System Architecture, 3. Data Ingestion Pipeline, 4. Kafka Integration: Current vs. Planned, 5. Machine Learning Detection Pipeline (+12 more)

### Community 47 - "Project Context: Multi-Agent AI Security Operations Center (SOC)"
Cohesion: 0.10
Nodes (20): 10. Automated Test Results & Verification, 11. Known Limitations & Environmental Constraints, 1. Project Identification & Metadata, 2. Problem Statement & System Purpose, 3. End-to-End Operational Lifecycle & Flow, 5.1 Dual-Layer Detection Model, 5.2 Authentic Dataset Provenance, 5.3 Leak-Free Preprocessing Pipeline (`ml/preprocessing/pipeline.py`) (+12 more)

### Community 48 - "KNOWN LIMITATIONS & ENVIRONMENTAL CONSTRAINTS"
Cohesion: 0.11
Nodes (18): 1.1 Technical Constraint Description, 1.2 Status & Academic Honesty Verdict, 1.3 Verified Workaround & Demonstration, 1.4 Workstation Requirements for Full Three-VM Lab, 1. Hardware Virtualization & Three-VM Virtual Lab Constraint, 2.1 Technical Constraint Description, 2.2 Mitigation, 2. Actual Guest Firewall Containment vs Simulated Dry-Run (+10 more)

### Community 49 - "KNOWN LIMITATIONS & ENVIRONMENTAL CONSTRAINTS"
Cohesion: 0.11
Nodes (18): 1.1 Technical Constraint Description, 1.2 Status & Academic Honesty Verdict, 1.3 Verified Workaround & Demonstration, 1.4 Workstation Requirements for Full Three-VM Lab, 1. Hardware Virtualization & Three-VM Virtual Lab Constraint, 2.1 Technical Constraint Description, 2.2 Mitigation, 2. Actual Guest Firewall Containment vs Simulated Dry-Run (+10 more)

### Community 50 - "typing"
Cohesion: 0.12
Nodes (7): Settings, Config, global_websocket_endpoint(), healthcheck(), root(), BaseCollector, stream_db()

### Community 51 - "agents.py"
Cohesion: 0.21
Nodes (12): get_agent_findings(), get_agent_runs(), get_agents_status(), trigger_agent_execution(), AgentExecution, AgentFinding, AgentExecutionResponse, Config (+4 more)

### Community 52 - "threat_intel_service.py"
Cohesion: 0.24
Nodes (8): list_indicators(), lookup_threat(), ThreatIndicator, ThreatIndicatorResponse, Config, ThreatLookupRequest, ThreatLookupResponse, lookup_indicator()

### Community 53 - "Product Requirements Document (PRD)"
Cohesion: 0.17
Nodes (11): 1. Project Overview, 2. Problem Statement, 3. Objectives, 4. Target Users & Personas, 7. System Constraints, 8. Success Criteria, 9. Scope and Limitations, In-Scope (Implemented & Verified) (+3 more)

### Community 54 - "Running the Multi-Agent AI SOC Platform"
Cohesion: 0.12
Nodes (16): Architecture, Attack Simulation Feature (All Files Confirmed Present After Merge), Current Repository State (After Merge), Environment Configuration (`.env`), File Integrity Verification Script, File Map, Live VM Tunnel, Push to GitHub (+8 more)

### Community 55 - "api/evaluation.py"
Cohesion: 0.20
Nodes (8): evaluate_dataset(), get_evaluation_run(), list_evaluation_runs(), EvaluationRun, DatasetEvaluationRequest, EvaluationRunResponse, Config, run_dataset_evaluation()

### Community 56 - "Cybersecurity Dataset and Training Audit: Multi-Agent AI SOC"
Cohesion: 0.14
Nodes (13): 1. Required Benchmark Datasets Overview, 2. Dataset 1: UNSW-NB15 Provenance & Verification, 3. Dataset 2: CICIDS2017 Provenance & Verification, 5. Audit Conclusion, A. Official Metadata & Sources, A. Official Metadata & Sources, B. Local Authentic File Inspection, B. Local Authentic File Inspection (+5 more)

### Community 57 - "1. Development Lifecycle & Phase Breakdown"
Cohesion: 0.22
Nodes (9): 1. Development Lifecycle & Phase Breakdown, Phase 10: Virtual Lab, Adversary Emulation & Final Verification, Phase 1: Core Foundation & Data Modeling, Phase 2: Telemetry Ingestion Pipeline & Event Collectors, Phase 3: Dataset Acquisition & Leak-Free Preprocessing Pipeline, Phase 4: Machine Learning Model Development & Validation, Phase 5: Deterministic Detection Engine & MITRE ATT&CK Rules, Phase 8: Dynamic Risk Engine, SOAR Response & Verification (+1 more)

### Community 58 - "simulation_service.py"
Cohesion: 0.31
Nodes (8): stop_simulation(), SimulationConnectivityStatus, SimulationExecutionResponse, Config, SimulationLaunchRequest, SimulationScenario, SimulationStopRequest, VMNodeStatus

### Community 59 - "Comprehensive System Specification & Master Technical Overview: Multi-Agent AI Security Operations Center (SOC)"
Cohesion: 0.25
Nodes (7): 1.1 Formal Academic Abstract, 1.2 Executive Summary, 1. Abstract, 9. Automated Forensic Investigation: The 8 Canonical SOC Questions, Comprehensive System Specification & Master Technical Overview: Multi-Agent AI Security Operations Center (SOC), Concrete Output Example (from `backend/app/agents/investigation_agent.py`):, Table of Contents

### Community 60 - "SDMCET VII SEMESTER MAJOR PROJECT — FINAL SYNOPSIS COMPLIANCE & ACCEPTANCE REPORT"
Cohesion: 0.14
Nodes (13): 1. Executive Summary & Verdict, 3. Dataset Provenance & Machine Learning Audit, 5. End-to-End Test Execution Summary, 6. How to Run the Application & Verify, 7. Faculty Presentation & Academic Defense Summary, A. Run Full Test Suites, Authentic Datasets Evaluated, B. Train Supervised ML Models on Authentic Datasets (+5 more)

### Community 61 - "Scenario A: SSH Authentication Brute-Force Attack"
Cohesion: 0.14
Nodes (13): 1. Goal, 1. Goal, 1. Goal, 2. Execution from Attacker VM (`192.168.56.20`):, 2. Execution from Attacker VM (`192.168.56.20`):, 2. Execution from Attacker VM (`192.168.56.20`):, 3. Expected Telemetry & SOC Detection:, 3. Expected Telemetry & SOC Detection: (+5 more)

### Community 62 - "1. Synopsis Requirement Acceptance Checklist"
Cohesion: 0.14
Nodes (13): 1.1 Backend Architecture & API Layer, 1.2 Machine Learning & Benchmark Datasets, 1.3 Multi-Agent SOC Architecture (All 10 Agents), 1.4 SOAR Response & Verification Engine, 1.5 Frontend Dashboard, 1.6 Three-VM Virtual Enterprise Lab, 1. Synopsis Requirement Acceptance Checklist, 2. Features Verified vs Features Still Pending (+5 more)

### Community 63 - "1. Synopsis Requirement Acceptance Checklist"
Cohesion: 0.14
Nodes (13): 1.1 Backend Architecture & API Layer, 1.2 Machine Learning & Benchmark Datasets, 1.3 Multi-Agent SOC Architecture (All 10 Agents), 1.4 SOAR Response & Verification Engine, 1.5 Frontend Dashboard, 1.6 Three-VM Virtual Enterprise Lab, 1. Synopsis Requirement Acceptance Checklist, 2. Features Verified vs Features Still Pending (+5 more)

### Community 64 - "REST & Streaming API Documentation"
Cohesion: 0.17
Nodes (11): 1. Ingested Event Frame (`EVENT_INGESTED`), 2. Alert Generation Frame (`ALERT_RAISED`), 2. API Interaction Sequence Flows, 3. Agent Execution Log Frame (`AGENT_EXECUTION`), 4. Containment Action Update (`ACTION_STATUS_CHANGED`), 4. WebSocket Streaming Protocol (`/api/ws`), Connection Handshake, Flow A: Telemetry Ingestion to Real-Time Alert Broadcast (+3 more)

### Community 65 - "3. Complete Endpoint Reference"
Cohesion: 0.17
Nodes (12): 3.10 Historical Evaluation & ML Benchmark (`/api/evaluation`), 3.1 Authentication (`/api/auth`), 3.7 Threat Intelligence (`/api/intelligence`), 3. Complete Endpoint Reference, `GET /api/auth/me`, `GET /api/evaluation/runs`, `GET /api/evaluation/runs/{run_id}`, `GET /api/intelligence/indicators` (+4 more)

### Community 66 - "datetime"
Cohesion: 0.11
Nodes (3): set_sqlite_pragma(), CollectorConfig, RiskAssessment

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

### Community 72 - "6. Detailed Specifications of the 10 Autonomous SOC Agents"
Cohesion: 0.18
Nodes (11): 6.10 ResponseAgent, 6.1 NetworkMonitoringAgent, 6.2 AuthenticationAgent, 6.3 EndpointAgent, 6.4 AnomalyDetectionAgent, 6.5 MaliciousBehaviourAgent, 6.6 ThreatIntelligenceAgent, 6.7 CorrelationAgent (+3 more)

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
Cohesion: 0.17
Nodes (15): reset_lab(), trigger_scenario(), import_batch_events(), ingest_single_event(), SecurityEventCreate, _queue_scenario_events(), reset_demo_lab(), run_scenario_1_brute_force() (+7 more)

### Community 78 - "os"
Cohesion: 0.14
Nodes (4): load_or_create_reference_dataset(), extract_feature_importance(), build_preprocessing_metadata(), clean_dataset()

### Community 79 - "4. Novel Features & Key Technical Innovations"
Cohesion: 0.25
Nodes (8): 4.2 Novelty 2: Dual-Layer Detection Engine (Sliding-Window MITRE Rules + Zero-Leakage ML), 4.3 Novelty 3: Mathematically Calibrated 7-Factor Bounded Risk Scoring Engine, 4.4 Novelty 4: Dynamic Directed Acyclic Graph (DAG) Attack-Path Synthesis & Chokepoint Localization, 4.5 Novelty 5: Automated 8-Question Canonical SOC Forensic Root Cause Analysis (RCA), 4.6 Novelty 6: 7-State Evidence-Based SOAR Response Verification with Dry-Run & One-Click Rollback, 4.7 Novelty 7: Hybrid LLM Threat Reasoning Layer (Cloud Gemini 1.5 Flash + Deterministic Offline Expert), 4.9 Novelty 9: Three-Node Virtual Enterprise Lab with Bounded Adversary Emulation, 4. Novel Features & Key Technical Innovations

### Community 80 - "DATA AND MODEL FLOW ARCHITECTURE"
Cohesion: 0.29
Nodes (6): 1. High-Level Data Lifecycle, 2.1 Zero-Leakage Preprocessing & Training, 2. Machine Learning Training & Inference Flow, 3. Real-Time Telemetry & Collector Architecture, 4. 0–100 Incident Risk Scoring Formula, DATA AND MODEL FLOW ARCHITECTURE

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

### Community 99 - "5. End-to-End System Architecture"
Cohesion: 0.29
Nodes (7): 5.1 High-Level Architectural Blueprint, 5.2 Telemetry Ingestion Subsystem, 5.3 Telemetry Broker & Queue Subsystem, 5.4 Core Processing & Multi-Agent Blackboard Engine, 5.5 Persistence & Storage Subsystem, 5.6 Real-Time Presentation & WebSocket Fan-Out, 5. End-to-End System Architecture

### Community 100 - "2. Granular Feature Specifications"
Cohesion: 0.50
Nodes (3): 1. Feature Implementation Matrix, 2. Granular Feature Specifications, Comprehensive Features Catalog & Implementation Matrix

### Community 101 - "11. SOAR Containment & 7-State Response Verification Lifecycle"
Cohesion: 0.40
Nodes (5): 11.1 Automated & Gated Playbooks, 11.2 Blast-Radius Simulation (Dry-Run Mode), 11.3 One-Click Immediate Rollback, 11.4 The 7 Discrete Verification States, 11. SOAR Containment & 7-State Response Verification Lifecycle

### Community 102 - "12. Virtual Enterprise Lab & Attack Simulation Suite"
Cohesion: 0.40
Nodes (5): 12.1 Lab Topology & Network Architecture, 12.2 Guest Agent Telemetry Collector Daemon, 12.3 Safety-Bounded Attacker Toolkit & 8 Attack Scenarios, 12.4 Local Multi-Process Emulation Mode, 12. Virtual Enterprise Lab & Attack Simulation Suite

### Community 106 - "test_realtime_pipeline.py"
Cohesion: 0.19
Nodes (8): lifespan(), evaluate_event_with_rolling_window(), seed_detection_rules(), seed_threat_intelligence(), db_session(), db_session(), db_session(), setup_test_db()

### Community 107 - "2. Detailed Verification Test Suites"
Cohesion: 0.25
Nodes (7): 1. Test Suite Summary, 2. Detailed Verification Test Suites, 3. Real-Time Latency Benchmarks, End-to-End Test and Verification Report: Multi-Agent AI SOC, Test Suite 2: Frontend-Backend Integration & WebSocket Acceptance, Test Suite 3: Phase 10 Acceptance Verification, Test Suite 4: Dynamic Telemetry & False-Positive Acceptance

### Community 108 - "FINAL REAL-TIME IMPLEMENTATION VERIFICATION AND ACCEPTANCE REPORT"
Cohesion: 0.25
Nodes (7): 1. Overall Acceptance Decision, 3.1 Genuine Dataset Provenance & Record Statistics, 3.2 Leak-Free Preprocessing Pipeline, 3.3 Live Real-Time Ingestion Integration, 3. Machine Learning Training & Inference Rigor, 4. Latency & Performance Measurements, FINAL REAL-TIME IMPLEMENTATION VERIFICATION AND ACCEPTANCE REPORT

### Community 109 - "run_realtime_flow_inference"
Cohesion: 0.09
Nodes (16): extract_flow_features_from_event(), load_persisted_classifier(), run_realtime_flow_inference(), train_and_evaluate_pipeline(), 2.2 Real-Time Online Inference Flow, 4. Persisted Model Artifacts & Live Pipeline Integration, Live Ingestion Flow, 2. Requirement-by-Requirement Synopsis Compliance Matrix (+8 more)

### Community 110 - "2. Component Descriptions"
Cohesion: 0.33
Nodes (6): 2.1 Ingestion & Telemetry Sources, 2.2 Telemetry Broker & Queue, 2.3 Detection Engine & ML Pipeline, 2.5 Dynamic Risk Engine (`backend/app/services/risk_service.py`), 2.6 SOAR Verification Engine (`backend/app/services/verification_service.py`), 2. Component Descriptions

### Community 111 - "15. Frontend Dashboard & Visualization Architecture"
Cohesion: 0.40
Nodes (5): 15.1 UI Stack & Technology Foundation, 15.2 Catalog of Web Views & Interactive Features, 15.3 Attack Path DAG Visualizer Implementation, 15.4 ReportLab Executive PDF Generation, 15. Frontend Dashboard & Visualization Architecture

### Community 112 - "16. Empirical Verification & Test Execution Results"
Cohesion: 0.40
Nodes (5): 16.1 Pytest Backend Suite (16/16 Passed), 16.2 Frontend-Backend Integration Audit (12/12 Passed), 16.3 Comprehensive Acceptance & Resilience Verifications (24/24 Passed), 16.4 Summary Pass Matrix (52/52 Passed, 100%), 16. Empirical Verification & Test Execution Results

### Community 113 - "8. Machine Learning Pipeline & Empirical Benchmark Evaluation"
Cohesion: 0.40
Nodes (5): 8.1 Dataset Provenance & Schema Enforcement, 8.2 Zero-Data-Leakage Preprocessing Protocol, 8.3 Held-Out Benchmark Performance Metrics, 8.4 Inference Latency & Feature Contribution Vectors, 8. Machine Learning Pipeline & Empirical Benchmark Evaluation

### Community 114 - "10. Dynamic 7-Factor Mathematical Risk Scoring Model"
Cohesion: 0.50
Nodes (4): 10.1 Mathematical Formulation, 10.2 Factor Definitions, Weights & Justifications, 10.3 Severity Banding & Triage Escalation, 10. Dynamic 7-Factor Mathematical Risk Scoring Model

### Community 115 - "MultiAgentSOCEngine"
Cohesion: 0.14
Nodes (6): MultiAgentSOCEngine, trigger_incident_investigation(), calculate_incident_risk(), test_queue_processing_persists_distinct_processing_time(), 6.11 Blackboard Execution Stages & Selective Dispatch Logic, Authors & Individual Module Ownership

### Community 116 - "18. Project Governance, Team Ownership & Conclusion"
Cohesion: 0.50
Nodes (4): 18. Project Governance, Team Ownership & Conclusion, Academic Affiliation, Conclusion, Faculty Guide

### Community 117 - "2. Project Background, Problem Statement & Overall Explanation"
Cohesion: 0.50
Nodes (4): 2.1 The Enterprise Cyber Defense Dilemma, 2.2 The Multi-Agent AI SOC Paradigm, 2.3 Core Operating Principles & System Scope, 2. Project Background, Problem Statement & Overall Explanation

### Community 118 - "7. Dual-Layer Threat Detection Engine & 12 MITRE ATT&CK Rules"
Cohesion: 0.50
Nodes (4): 7.1 The 12 Deterministic Sliding-Window Detection Rules, 7.2 Unsupervised Multivariate Isolation Forest Engine, 7.3 Supervised Balanced Random Forest Intrusion Classifier, 7. Dual-Layer Threat Detection Engine & 12 MITRE ATT&CK Rules

### Community 120 - "3. Project Goals, Objectives & Performance Targets"
Cohesion: 0.67
Nodes (3): 3.1 Primary Engineering Objectives, 3.2 Key Performance Indicators (KPIs) & Target SLAs, 3. Project Goals, Objectives & Performance Targets

### Community 121 - "5. Functional Requirements"
Cohesion: 0.18
Nodes (11): 5. Functional Requirements, FR-10: Forensic Reporting & PDF Dossier Export, FR-1: Telemetry Ingestion & Normalization, FR-2: Dual-Layer Threat Detection Engine, FR-3: Multi-Agent Autonomous Orchestration, FR-4: Security Event Correlation & Incident Synthesis, FR-5: Bounded Mathematical Risk Scoring, FR-6: Dynamic Attack-Path Graph Reconstruction (+3 more)

### Community 122 - "run_local_virtual_nodes.py"
Cohesion: 0.36
Nodes (7): main(), read_guest_output(), _read_guest_output_guarded(), resolve_soc_url(), start_guest_node(), stop_guest_processes(), wait_for_guest_readiness()

### Community 124 - "analyze_threat_findings"
Cohesion: 0.32
Nodes (3): analyze_threat_findings(), _call_gemini_api(), _local_cybersecurity_expert_reasoning()

### Community 125 - "control_demo_stream"
Cohesion: 0.33
Nodes (4): control_demo_stream(), toggle_collector(), test_stream_control_endpoint_lifecycle(), exercise_endpoint()

### Community 126 - "Project Implementation Plan, Milestones & Roadmap"
Cohesion: 0.29
Nodes (6): 2. Feature Implementation Status Matrix, 3. Testing Strategy & Execution Results, 4. Future Enhancements & Product Roadmap, Automated Test Suite Execution Summary, Measured Real-Time Latency Benchmarks, Project Implementation Plan, Milestones & Roadmap

### Community 127 - "6. Non-Functional Requirements"
Cohesion: 0.33
Nodes (6): 6. Non-Functional Requirements, NFR-1: Performance & Latency SLAs, NFR-2: Reliability & Data Integrity, NFR-3: Security & Access Control, NFR-4: Auditability & Compliance, NFR-5: Model Accuracy & Leak-Free Machine Learning

### Community 132 - "13. REST & Streaming API Specifications"
Cohesion: 0.67
Nodes (3): 13.1 REST API Architecture (62 Endpoints, 16 Tags), 13.2 Real-Time WebSocket Protocol (`/api/ws`), 13. REST & Streaming API Specifications

### Community 133 - "14. Database Architecture & Relational Data Model"
Cohesion: 0.67
Nodes (3): 14.1 Relational Schema Overview, 14.2 Mermaid Entity-Relationship Diagram, 14. Database Architecture & Relational Data Model

### Community 134 - "17. Known Limitations, Operational Constraints & Future Roadmap"
Cohesion: 0.67
Nodes (3): 17.1 Documented Hardware & Resource Limitations, 17.2 Enterprise Kafka & Scalability Roadmap, 17. Known Limitations, Operational Constraints & Future Roadmap

## Knowledge Gaps
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `InvestigationAgent` connect `BaseAgent` to `SecurityEvent`, `detections.py`, `6. Detailed Specifications of the 10 Autonomous SOC Agents`, `run_realtime_flow_inference`, `Incident`, `4. Novel Features & Key Technical Innovations`, `3.5 Incident Management (`/api/incidents`)`, `MultiAgentSOCEngine`, `Product Requirements Document (PRD)`, `5. Functional Requirements`, `Comprehensive System Specification & Master Technical Overview: Multi-Agent AI Security Operations Center (SOC)`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._
- **Are the 30 inferred relationships involving `SecurityEvent` (e.g. with `AnomalyDetectionAgent` and `AttackPathAgent`) actually correct?**
  _`SecurityEvent` has 30 INFERRED edges - model-reasoned connections that need verification._
- **Should `Agent Orchestration & Analysis` be split into smaller, more focused modules?**
  _Cohesion score 0.05839317165695705 - nodes in this community are weakly interconnected._
- **Why does `MultiAgentSOCEngine` connect `MultiAgentSOCEngine` to `vm_service.py`, `SecurityEvent`, `database.py`, `schemas/__init__.py`, `run_realtime_flow_inference`, `Incident`, `SecurityEventCreate`, `BaseAgent`, `agents.py`, `Product Requirements Document (PRD)`, `Threat Detection & Rules (2)`, `5. Functional Requirements`, `1. Synopsis Requirement Acceptance Checklist`, `1. Synopsis Requirement Acceptance Checklist`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Should `database.py` be split into smaller, more focused modules?**
  _Cohesion score 0.09634551495016612 - nodes in this community are weakly interconnected._
- **Why does `SecurityEvent` connect `SecurityEvent` to `test_stream_scenarios_persist_normalized_events_and_enqueue`, `database.py`, `schemas/__init__.py`, `SimulationService`, `detections.py`, `generate_incident_pdf`, `Incident`, `BaseAgent`, `Frontend API Client (4)`, `LiveDemoStreamCollector`, `Threat Detection & Rules (2)`, `Frontend API Client (5)`, `vm_service.py`, `typing`, `simulation_service.py`, `datetime`, `SecurityEventCreate`, `test_realtime_pipeline.py`, `MultiAgentSOCEngine`, `analyze_threat_findings`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Should `schemas/__init__.py` be split into smaller, more focused modules?**
  _Cohesion score 0.11184939091915837 - nodes in this community are weakly interconnected._