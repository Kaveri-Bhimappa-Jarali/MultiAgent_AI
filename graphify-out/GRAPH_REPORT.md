# Graph Report - kaveri2  (2026-11-15)

## Corpus Check
- 292 files · ~210,300 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 44 file(s) not represented in the graph (top: .joblib 12, (none) 6, .csv 6)

## Summary
- 1912 nodes · 5569 edges · 114 communities (78 shown, 36 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 524 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9c1f38c3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- UTCBaseModel
- database.py
- simulation_service.py
- SecurityEvent
- .log
- incidents.py
- frontend/package.json
- typing
- run_realtime_flow_inference
- run_phase10_verification
- vm_service.py
- soc-frontend/package.json
- auth_service.py
- os
- datetime
- CollectorManager
- _make_event
- ref_react_router_dom
- Test Suite 1: Backend Pytest Unit & Integration Tests
- Running the Multi-Agent AI SOC Platform
- Multi-Agent AI Security Operations Center (SOC) for Real-Time Threat Detection
- ref_react
- 2. Step-by-Step Installation
- VMGuestCollector
- normalize_and_ingest_events
- ResponseAction
- main
- sqlalchemy_orm
- acquire_datasets.py
- Incidents.jsx
- time
- Project Context: Multi-Agent AI Security Operations Center (SOC)
- App.jsx
- SecurityEventCreate
- responses.py
- schemas/__init__.py
- LiveDemoStreamCollector
- RealtimeEventQueue
- KNOWN LIMITATIONS & ENVIRONMENTAL CONSTRAINTS
- KNOWN LIMITATIONS & ENVIRONMENTAL CONSTRAINTS
- FINAL SOC VERIFICATION & INDEPENDENT AUDIT REPORT
- compilerOptions
- api/dashboard.py
- sys
- FRESH ATTACK SIMULATION & DASHBOARD RECONCILIATION REPORT
- Correlation.jsx
- BroadcasterService
- json
- Cybersecurity Dataset and Training Audit: Multi-Agent AI SOC
- SDMCET VII SEMESTER MAJOR PROJECT — FINAL SYNOPSIS COMPLIANCE & ACCEPTANCE REPORT
- test_run_local_virtual_nodes.py
- api/simulation.py
- Scenario A: SSH Authentication Brute-Force Attack
- network_flow_sniffer.py
- 1. Synopsis Requirement Acceptance Checklist
- subprocess
- 1. Synopsis Requirement Acceptance Checklist
- 2. Detailed Test Results & Outputs
- 3. Verified Implementations & Reproducibility
- 2. Detailed Test Results & Outputs
- main.py
- 2. Step-by-Step Deployment Runbook
- 3. Useful Functionality Acquired from Reference Repository
- train_and_evaluate_model
- simulate_attacks.py
- run_local_virtual_nodes.py
- Guest Telemetry Collector Daemon Setup Guide
- get_system_and_sources_health_endpoint
- analyze_threat_findings
- 2. Detailed Verification Test Suites
- FINAL REAL-TIME IMPLEMENTATION VERIFICATION AND ACCEPTANCE REPORT
- test_analytics_and_health.py
- DATA AND MODEL FLOW ARCHITECTURE
- VirtualLab.jsx
- Navbar.jsx
- 5. Incident Response & SOAR Governance Verification
- 4. Fresh Attack Simulation Execution
- Virtual Enterprise Network Architecture & Lab Topology
- TermTooltip.tsx
- get_db
- api/evaluation.py
- test_25_e2e_websocket_broadcast_distinction
- PROJECT STRUCTURE DOCUMENTATION
- MetricCard.tsx
- SYNOPSIS_COMPLIANCE_MATRIX.md
- start_vm_tunnel.sh
- setup_attacker.sh
- setup_victim.sh
- threat_intel_service.py
- run_fresh_attack_simulation.py
- 2. In-Depth Cross-Questioning of Each Model
- MultiAgentSOCEngine
- AnomalyDetectionEngine
- FileWatcherCollector
- control_demo_stream
- Sidebar.tsx
- websocket_endpoint
- test_queue_processing_persists_distinct_processing_time

## God Nodes (most connected - your core abstractions)
1. `SecurityEvent` - 110 edges
2. `Incident` - 75 edges
3. `ResponseAction` - 58 edges
4. `SecurityEventCreate` - 43 edges
5. `AgentFinding` - 42 edges
6. `CorrelationAgent` - 37 edges
7. `Button()` - 35 edges
8. `normalize_and_ingest_events()` - 34 edges
9. `Badge()` - 34 edges
10. `IncidentEvent` - 33 edges

## Surprising Connections (you probably didn't know these)
- `1.3 Multi-Agent SOC Architecture (All 10 Agents)` --references--> `MultiAgentSOCEngine`  [INFERRED]
  docs/FINAL_ACCEPTANCE_CHECKLIST.md → backend/app/agents/orchestrator.py
- `1.3 Multi-Agent SOC Architecture (All 10 Agents)` --references--> `MultiAgentSOCEngine`  [INFERRED]
  FINAL_ACCEPTANCE_CHECKLIST.md → backend/app/agents/orchestrator.py
- `3. Investigation of Previous Exit-Code-1 Occurrences` --references--> `InvestigationAgent`  [INFERRED]
  FINAL_SOC_VERIFICATION_REPORT.md → backend/app/agents/investigation_agent.py
- `2. Eight Canonical Root Cause Analysis (RCA) Answers` --references--> `InvestigationAgent`  [INFERRED]
  FRESH_ATTACK_SIMULATION_REPORT.md → backend/app/agents/investigation_agent.py
- `3. Policy-Governed SOAR Response Execution` --references--> `ResponseAgent`  [INFERRED]
  FRESH_ATTACK_SIMULATION_REPORT.md → backend/app/agents/response_agent.py

## Import Cycles
- None detected.

## Communities (114 total, 36 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.06
Nodes (89): api, getAuthHeaders(), request(), App(), ProtectedRoute(), AttackPathGraph(), AttackPathGraphProps, Modal() (+81 more)

### Community 1 - "UTCBaseModel"
Cohesion: 0.12
Nodes (14): list_findings(), list_rules(), update_rule(), UTCBaseModel, DetectionFindingResponse, Config, DetectionRuleBase, DetectionRuleCreate (+6 more)

### Community 2 - "database.py"
Cohesion: 0.14
Nodes (8): trigger_evaluation(), set_sqlite_pragma(), CollectorConfig, DetectionFinding, DetectionRule, ThreatIndicator, evaluate_event_with_rolling_window(), evaluate_events_against_rules()

### Community 3 - "simulation_service.py"
Cohesion: 0.08
Nodes (14): AttackSimulationExecution, SimulationConnectivityStatus, SimulationLaunchRequest, SimulationScenario, SimulationStopRequest, VMNodeStatus, SimulationService, check() (+6 more)

### Community 4 - "SecurityEvent"
Cohesion: 0.06
Nodes (34): CorrelationAgent, AgentFinding, SecurityEvent, get_lab_activity(), test_10_correlation_multiple_related_findings_correlates(), test_11_correlation_brute_force_single_finding_not_counted_as_multiple_agent_findings(), test_12_correlation_unrelated_findings_remain_separate(), test_13_correlation_outside_900s_window_do_not_group() (+26 more)

### Community 6 - "incidents.py"
Cohesion: 0.09
Nodes (15): _extract_attack_category(), _format_stage_label(), get_correlation_detail(), get_incident_detail(), list_correlations(), list_incidents(), update_incident_status(), UTCDateTime (+7 more)

### Community 7 - "frontend/package.json"
Cohesion: 0.06
Nodes (43): dependencies, clsx@^2.1.1, framer-motion@^14.9.0, lucide-react@^0.469.0, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.28.1, recharts@^2.15.0 (+35 more)

### Community 9 - "run_realtime_flow_inference"
Cohesion: 0.22
Nodes (9): extract_flow_features_from_event(), load_persisted_classifier(), run_realtime_flow_inference(), train_and_evaluate_pipeline(), 2.2 Real-Time Online Inference Flow, Live Ingestion Flow, 5. Bugs Found During Audit & Fixes Applied, B. Random Forest Classifier (Supervised Intrusion Classifier) (+1 more)

### Community 10 - "run_phase10_verification"
Cohesion: 0.47
Nodes (16): AnomalyDetectionAgent, AttackPathAgent, AuthenticationAgent, BaseAgent, EndpointAgent, InvestigationAgent, MaliciousBehaviourAgent, NetworkMonitoringAgent (+8 more)

### Community 11 - "vm_service.py"
Cohesion: 0.13
Nodes (20): create_vm_action(), get_virtualization_diagnostics(), list_vm_nodes(), poll_pending_actions(), run_vm_scenario(), submit_action_result(), submit_vm_telemetry(), verify_vm_auth() (+12 more)

### Community 12 - "soc-frontend/package.json"
Cohesion: 0.07
Nodes (36): dependencies, clsx@^2.1.1, framer-motion@^11.5.4, lucide-react@^0.441.0, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.26.2, recharts@^2.12.7 (+28 more)

### Community 13 - "auth_service.py"
Cohesion: 0.15
Nodes (13): get_current_user_profile(), login(), logout(), LoginRequest, TokenResponse, UserCreate, UserResponse, Config (+5 more)

### Community 14 - "os"
Cohesion: 0.13
Nodes (5): load_or_create_reference_dataset(), extract_feature_importance(), build_preprocessing_metadata(), clean_dataset(), stream_events_to_soc()

### Community 15 - "datetime"
Cohesion: 0.17
Nodes (9): SecurityEventCreate, BaseCollector, SyslogCollector, generate_event_id(), normalize_and_ingest_events(), test_23_e2e_ingestion_queue_agent_pipeline_correlation_broadcast(), stream_db(), test_event_schema_normalizes_offset_and_legacy_database_timestamps() (+1 more)

### Community 17 - "_make_event"
Cohesion: 0.13
Nodes (6): _types_are_related(), _within_time_window(), _make_event(), _run_correlation(), TestCorrelationAgentScenarios, TestHelpers

### Community 18 - "ref_react_router_dom"
Cohesion: 0.17
Nodes (14): ActivityChart(), CustomTooltip(), FILTERS, MetricCard(), RecentEvents(), makeSegmentPath(), polarToXY(), RiskGauge() (+6 more)

### Community 19 - "Test Suite 1: Backend Pytest Unit & Integration Tests"
Cohesion: 0.15
Nodes (22): generate_incident_pdf(), generate_soc_summary_pdf(), test_broadcaster_event_dispatch(), test_collector_manager_and_freshness_warnings(), test_duplicate_event_handling(), test_event_driven_agent_orchestration_and_correlation(), test_response_workflow_and_verification(), test_rolling_window_brute_force_detection() (+14 more)

### Community 20 - "Running the Multi-Agent AI SOC Platform"
Cohesion: 0.07
Nodes (28): Active dashboard, Command Centre graphs, Command Centre update stability, Connected cloud VM lab — 14 November 2026, Deployed files, Dynamic correlation evidence, Services, Simulation fixes and network collection (+20 more)

### Community 21 - "Multi-Agent AI Security Operations Center (SOC) for Real-Time Threat Detection"
Cohesion: 0.07
Nodes (28): 10. Contributors & Academic Defense Team, 1. Introduction & Overview, 1. Real-Time Command Center (`/dashboard`), 2. Key Features, 2. Live Threat Map & Dynamic Attack Graph (`/incidents/{id}`), 3. Forensic Investigation Console (`/incidents/{id}/investigation`), 3. System Architecture Overview, 4. SOAR Containment & Verification Center (`/responses`) (+20 more)

### Community 22 - "ref_react"
Cohesion: 0.26
Nodes (7): SystemTourModalProps, api, getAuthHeaders(), request(), AttackPathGraph(), Modal(), AGENT_METADATA

### Community 23 - "2. Step-by-Step Installation"
Cohesion: 0.07
Nodes (27): 1.1 Minimum & Recommended Hardware, 1.2 Required Software Packages, 1. System Requirements & Prerequisites, 2. Step-by-Step Installation, 3. Running the Application, 4. Default Login Credentials, 5. Post-Installation Verification & Testing, 6. Message Broker Configuration: In-Memory vs. Apache Kafka (+19 more)

### Community 25 - "normalize_and_ingest_events"
Cohesion: 0.20
Nodes (9): export_events_csv(), get_event(), import_batch_events(), ingest_single_event(), list_events(), EventBatchIngest, IngestionResult, SecurityEventBase (+1 more)

### Community 26 - "ResponseAction"
Cohesion: 0.16
Nodes (18): AuditLog, Incident, ResponseAction, VerificationResult, create_and_run_verification(), create_simulation_verification(), _new_verification(), test_21_downstream_soar_approval_enforcement() (+10 more)

### Community 27 - "main"
Cohesion: 0.21
Nodes (8): seed_detection_rules(), seed_threat_intelligence(), db_session(), db_session(), db_session(), main(), run_tests(), setup_test_db()

### Community 28 - "sqlalchemy_orm"
Cohesion: 0.25
Nodes (8): AgentExecution, get_analytics_report(), get_ingestion_cumulative_stats(), get_system_and_sources_health(), ensure_utc(), format_ist(), utc_isoformat(), test_utc_timestamp_normalization_and_ist_format()

### Community 29 - "acquire_datasets.py"
Cohesion: 0.19
Nodes (6): compute_file_sha256(), download_dataset(), get_dataset_path(), load_genuine_dataset(), validate_dataset_schema(), main()

### Community 30 - "Incidents.jsx"
Cohesion: 0.15
Nodes (15): mapBackendIncident(), LLMAnalysis(), DECISION_CARDS, RecommendedActions(), SEVERITY_LEVELS, SeverityCard(), activityTimeSeries, correlatedIncidents (+7 more)

### Community 31 - "time"
Cohesion: 0.28
Nodes (8): download_file(), get_wheel_url(), main(), run_multi_stage_intrusion(), run_port_scan(), run_ssh_brute_force(), test_tcp_connect(), validate_lab_target()

### Community 32 - "Project Context: Multi-Agent AI Security Operations Center (SOC)"
Cohesion: 0.10
Nodes (20): 10. Automated Test Results & Verification, 11. Known Limitations & Environmental Constraints, 1. Project Identification & Metadata, 2. Problem Statement & System Purpose, 3. End-to-End Operational Lifecycle & Flow, 5.1 Dual-Layer Detection Model, 5.2 Authentic Dataset Provenance, 5.3 Leak-Free Preprocessing Pipeline (`ml/preprocessing/pipeline.py`) (+12 more)

### Community 33 - "App.jsx"
Cohesion: 0.19
Nodes (21): App(), EventDetails(), CATEGORIES, EventTable(), STATUS_OPTIONS, Badge(), Button(), SearchInput() (+13 more)

### Community 34 - "SecurityEventCreate"
Cohesion: 0.24
Nodes (8): reset_lab(), trigger_scenario(), _queue_scenario_events(), reset_demo_lab(), run_scenario_1_brute_force(), run_scenario_2_network_scan(), run_scenario_3_account_compromise(), run_scenario_4_endpoint_malware()

### Community 35 - "responses.py"
Cohesion: 0.14
Nodes (22): allow_action(), approve_action(), deny_action(), execute_action(), get_response(), list_responses(), list_verifications(), _require_soc_admin() (+14 more)

### Community 36 - "schemas/__init__.py"
Cohesion: 0.14
Nodes (19): get_agent_findings(), get_agent_runs(), get_agents_status(), trigger_agent_execution(), add_incident_note(), AgentExecutionResponse, Config, AgentFindingResponse (+11 more)

### Community 37 - "LiveDemoStreamCollector"
Cohesion: 0.16
Nodes (3): LiveDemoStreamCollector, test_stream_pause_resume_stop_and_duplicate_start(), test_stream_rejects_unknown_scenario_and_invalid_rate()

### Community 38 - "RealtimeEventQueue"
Cohesion: 0.16
Nodes (3): RealtimeEventQueue, 1.1 Backend Architecture & API Layer, 1.1 Backend Architecture & API Layer

### Community 39 - "KNOWN LIMITATIONS & ENVIRONMENTAL CONSTRAINTS"
Cohesion: 0.11
Nodes (18): 1.1 Technical Constraint Description, 1.2 Status & Academic Honesty Verdict, 1.3 Verified Workaround & Demonstration, 1.4 Workstation Requirements for Full Three-VM Lab, 1. Hardware Virtualization & Three-VM Virtual Lab Constraint, 2.1 Technical Constraint Description, 2.2 Mitigation, 2. Actual Guest Firewall Containment vs Simulated Dry-Run (+10 more)

### Community 40 - "KNOWN LIMITATIONS & ENVIRONMENTAL CONSTRAINTS"
Cohesion: 0.11
Nodes (18): 1.1 Technical Constraint Description, 1.2 Status & Academic Honesty Verdict, 1.3 Verified Workaround & Demonstration, 1.4 Workstation Requirements for Full Three-VM Lab, 1. Hardware Virtualization & Three-VM Virtual Lab Constraint, 2.1 Technical Constraint Description, 2.2 Mitigation, 2. Actual Guest Firewall Containment vs Simulated Dry-Run (+10 more)

### Community 41 - "FINAL SOC VERIFICATION & INDEPENDENT AUDIT REPORT"
Cohesion: 0.11
Nodes (17): 1. Executive Summary & Verification Outcomes, 2. Source Code & Test Integrity Confirmation, 3. Investigation of Previous Exit-Code-1 Occurrences, 4. Ten-Agent Independent Verification Matrix, 5. Correlation Requirements Recheck, 6. Machine Learning Model Inference Verification, 7. SOAR Safety, Containment Gating, and Credentials Security, 8. What is Ready for College Project Demonstration vs. Real VM Requirements (+9 more)

### Community 42 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 43 - "api/dashboard.py"
Cohesion: 0.32
Nodes (11): get_dashboard_summary(), lab_activity(), AgentHealthCard, AgentSummary, AttentionItem, CategoryCount, DashboardSummaryResponse, MetricSummary (+3 more)

### Community 44 - "sys"
Cohesion: 0.13
Nodes (5): clean_database(), get_scenario_events(), main(), run_integration_verification(), verify_initial_state()

### Community 45 - "FRESH ATTACK SIMULATION & DASHBOARD RECONCILIATION REPORT"
Cohesion: 0.12
Nodes (16): 10. Exact Commands to Reproduce the Fresh Test, 1. Original Database Backup Details, 2. Test Environment & Preserved Entities, 3. Initial Clean Database Verification (T0), 6. Duplicate and Replay Verification, 7. Dashboard-to-Database Reconciliation Matrix, 8. Defects Discovered and Resolved, 9. College Demonstration Readiness Checklist (+8 more)

### Community 46 - "Correlation.jsx"
Cohesion: 0.15
Nodes (14): CorrelationGraph(), CorrelationResult(), AGENT_METADATA, DEFAULT_AGENT_META, GLOSSARY_TERMS, MultiAgentPipeline(), SeverityBadge(), StatusBadge() (+6 more)

### Community 48 - "json"
Cohesion: 0.36
Nodes (5): capture_page(), get_auth_token(), main(), send_cdp(), wait_for_server()

### Community 49 - "Cybersecurity Dataset and Training Audit: Multi-Agent AI SOC"
Cohesion: 0.13
Nodes (14): 1. Required Benchmark Datasets Overview, 2. Dataset 1: UNSW-NB15 Provenance & Verification, 3. Dataset 2: CICIDS2017 Provenance & Verification, 4. Persisted Model Artifacts & Live Pipeline Integration, 5. Audit Conclusion, A. Official Metadata & Sources, A. Official Metadata & Sources, B. Local Authentic File Inspection (+6 more)

### Community 50 - "SDMCET VII SEMESTER MAJOR PROJECT — FINAL SYNOPSIS COMPLIANCE & ACCEPTANCE REPORT"
Cohesion: 0.13
Nodes (14): 1. Executive Summary & Verdict, 2. Requirement-by-Requirement Synopsis Compliance Matrix, 3. Dataset Provenance & Machine Learning Audit, 5. End-to-End Test Execution Summary, 6. How to Run the Application & Verify, 7. Faculty Presentation & Academic Defense Summary, A. Run Full Test Suites, Authentic Datasets Evaluated (+6 more)

### Community 51 - "test_run_local_virtual_nodes.py"
Cohesion: 0.19
Nodes (5): FakeProcess, test_read_guest_output_reads_stdout_and_detects_real_ack(), test_runner_stops_started_process_when_later_start_fails(), test_start_guest_node_captures_text_output_and_merges_stderr(), fake_popen()

### Community 52 - "api/simulation.py"
Cohesion: 0.18
Nodes (6): get_simulation_execution(), get_simulation_status(), get_supported_scenarios(), list_simulation_executions(), SimulationExecutionResponse, Config

### Community 53 - "Scenario A: SSH Authentication Brute-Force Attack"
Cohesion: 0.14
Nodes (13): 1. Goal, 1. Goal, 1. Goal, 2. Execution from Attacker VM (`192.168.56.20`):, 2. Execution from Attacker VM (`192.168.56.20`):, 2. Execution from Attacker VM (`192.168.56.20`):, 3. Expected Telemetry & SOC Detection:, 3. Expected Telemetry & SOC Detection: (+5 more)

### Community 55 - "1. Synopsis Requirement Acceptance Checklist"
Cohesion: 0.15
Nodes (12): 1.2 Machine Learning & Benchmark Datasets, 1.3 Multi-Agent SOC Architecture (All 10 Agents), 1.4 SOAR Response & Verification Engine, 1.5 Frontend Dashboard, 1.6 Three-VM Virtual Enterprise Lab, 1. Synopsis Requirement Acceptance Checklist, 2. Features Verified vs Features Still Pending, 3. Security & Repository Audit (+4 more)

### Community 56 - "subprocess"
Cohesion: 0.27
Nodes (4): get_wheel_info(), main(), install(), install_portable_node()

### Community 57 - "1. Synopsis Requirement Acceptance Checklist"
Cohesion: 0.15
Nodes (12): 1.2 Machine Learning & Benchmark Datasets, 1.3 Multi-Agent SOC Architecture (All 10 Agents), 1.4 SOAR Response & Verification Engine, 1.5 Frontend Dashboard, 1.6 Three-VM Virtual Enterprise Lab, 1. Synopsis Requirement Acceptance Checklist, 2. Features Verified vs Features Still Pending, 3. Security & Repository Audit (+4 more)

### Community 58 - "2. Detailed Test Results & Outputs"
Cohesion: 0.18
Nodes (10): 1. Test Execution Summary, 2.2 Frontend-Backend Integration Test Suite, 2.3 Phase 10 Acceptance Verification, 2.4 Final Acceptance Evidence Audit, 2.5 Dynamic Telemetry Audit, 2.6 Frontend Production Build, 2. Detailed Test Results & Outputs, 3. Real-Time Latency Benchmark Table (+2 more)

### Community 59 - "3. Verified Implementations & Reproducibility"
Cohesion: 0.17
Nodes (11): 1. Executive Summary & Academic Specification, 2. Host Environmental Audit, 3. Verified Implementations & Reproducibility, 3-VM Virtual Lab Acceptance & Environmental Audit Report, 4. Hardware Lab Deployment Guide, A. Vagrantfile Architecture, B. Guest Telemetry Collector Architecture, C. Controlled Attacker Toolkit Safety (+3 more)

### Community 60 - "2. Detailed Test Results & Outputs"
Cohesion: 0.18
Nodes (10): 1. Test Execution Summary, 2.2 Frontend-Backend Integration Test Suite, 2.3 Phase 10 Acceptance Verification, 2.4 Final Acceptance Evidence Audit, 2.5 Dynamic Telemetry Audit, 2.6 Frontend Production Build, 2. Detailed Test Results & Outputs, 3. Real-Time Latency Benchmark Table (+2 more)

### Community 61 - "main.py"
Cohesion: 0.11
Nodes (13): download_incident_report(), download_summary_report(), get_soc_analytics(), global_websocket_endpoint(), healthcheck(), lifespan(), root(), ensure_event_processed_at_column() (+5 more)

### Community 62 - "2. Step-by-Step Deployment Runbook"
Cohesion: 0.18
Nodes (10): 1. Executive Summary & Hardware Requirements, 2. Step-by-Step Deployment Runbook, GENUINE VIRTUAL ENTERPRISE NETWORK LAB — DEPLOYMENT & ACCEPTANCE GUIDE, Minimum Workstation Requirements for Hardware Kernel Virtualization, Step 1: Install Hypervisor & Tooling (PowerShell as Administrator), Step 2: Verify Host-Only Network Adapter, Step 3: Provision the 3 Isolated Guest VMs, Step 4: Start SOC Central Platform on Host (+2 more)

### Community 63 - "3. Useful Functionality Acquired from Reference Repository"
Cohesion: 0.20
Nodes (9): 1. Executive Summary, 2. Comprehensive Component Gap Matrix, 3. Useful Functionality Acquired from Reference Repository, 4. Features Preserved Exclusively from Kaveri's Implementation, A. Dataset Cleaning (`clean_dataset.py`), B. Preprocessing Metadata Extraction (`build_preprocessing_metadata.py`), C. Feature Importance Analysis (`feature_importance.py`), D. Continuous Event Stream Replay (`kafka/realtime_producer.py`, `realtime_wrapper.py`) (+1 more)

### Community 64 - "train_and_evaluate_model"
Cohesion: 0.11
Nodes (4): run_dataset_evaluation(), CybersecurityPreprocessingPipeline, generate_visualizations(), train_and_evaluate_model()

### Community 65 - "simulate_attacks.py"
Cohesion: 0.15
Nodes (10): frame(), test_observes_short_tcp_and_udp_but_excludes_other_peers(), now_iso(), post_telemetry(), scenario_brute_force(), scenario_ddos(), scenario_exfiltration(), scenario_portscan() (+2 more)

### Community 66 - "run_local_virtual_nodes.py"
Cohesion: 0.36
Nodes (7): main(), read_guest_output(), _read_guest_output_guarded(), resolve_soc_url(), start_guest_node(), stop_guest_processes(), wait_for_guest_readiness()

### Community 67 - "Guest Telemetry Collector Daemon Setup Guide"
Cohesion: 0.22
Nodes (8): 1. Prerequisites on the Guest VM, 2. Quick-Start Execution, 3. Running as a Persistent Systemd Service (Optional), 4. How the Guest Daemon Works, Guest Telemetry Collector Daemon Setup Guide, On Endpoint VM (192.168.56.10):, On Server VM (192.168.56.15):, Running Local Guest-Agent Processes

### Community 68 - "get_system_and_sources_health_endpoint"
Cohesion: 0.25
Nodes (3): get_collectors_health(), get_pipeline_health(), get_system_and_sources_health_endpoint()

### Community 69 - "analyze_threat_findings"
Cohesion: 0.27
Nodes (3): analyze_threat_findings(), _call_gemini_api(), _local_cybersecurity_expert_reasoning()

### Community 70 - "2. Detailed Verification Test Suites"
Cohesion: 0.25
Nodes (7): 1. Test Suite Summary, 2. Detailed Verification Test Suites, 3. Real-Time Latency Benchmarks, End-to-End Test and Verification Report: Multi-Agent AI SOC, Test Suite 2: Frontend-Backend Integration & WebSocket Acceptance, Test Suite 3: Phase 10 Acceptance Verification, Test Suite 4: Dynamic Telemetry & False-Positive Acceptance

### Community 71 - "FINAL REAL-TIME IMPLEMENTATION VERIFICATION AND ACCEPTANCE REPORT"
Cohesion: 0.25
Nodes (7): 1. Overall Acceptance Decision, 3.1 Genuine Dataset Provenance & Record Statistics, 3.2 Leak-Free Preprocessing Pipeline, 3.3 Live Real-Time Ingestion Integration, 3. Machine Learning Training & Inference Rigor, 4. Latency & Performance Measurements, FINAL REAL-TIME IMPLEMENTATION VERIFICATION AND ACCEPTANCE REPORT

### Community 73 - "DATA AND MODEL FLOW ARCHITECTURE"
Cohesion: 0.29
Nodes (6): 1. High-Level Data Lifecycle, 2.1 Zero-Leakage Preprocessing & Training, 2. Machine Learning Training & Inference Flow, 3. Real-Time Telemetry & Collector Architecture, 4. 0–100 Incident Risk Scoring Formula, DATA AND MODEL FLOW ARCHITECTURE

### Community 74 - "VirtualLab.jsx"
Cohesion: 0.71
Nodes (4): VMReporting(), isVMConnected(), useVMNodes(), VirtualLab()

### Community 75 - "Navbar.jsx"
Cohesion: 0.47
Nodes (4): DashboardLayout(), MODULE_GROUPS, NAV_LINKS, Navbar()

### Community 76 - "5. Incident Response & SOAR Governance Verification"
Cohesion: 0.40
Nodes (5): 1. Attack-Path DAG Topology, 2. Eight Canonical Root Cause Analysis (RCA) Answers, 3. Policy-Governed SOAR Response Execution, 4. Approval Desk Security Verification, 5. Incident Response & SOAR Governance Verification

### Community 77 - "4. Fresh Attack Simulation Execution"
Cohesion: 0.40
Nodes (5): 4. Fresh Attack Simulation Execution, Stage 1: Brute-Force Authentication Attempt, Stage 2: Suspicious Endpoint Activity, Stage 3: Network Port Sweep Activity, Stage 4: Multi-Stage Privilege Escalation

### Community 78 - "Virtual Enterprise Network Architecture & Lab Topology"
Cohesion: 0.40
Nodes (4): 1. Enterprise Network Lab Topology, 2. IP Addressing & Component Roles, 3. Network Isolation Guarantee, Virtual Enterprise Network Architecture & Lab Topology

### Community 81 - "get_db"
Cohesion: 0.14
Nodes (6): get_audit_logs(), get_policies(), update_policies(), Settings, Config, get_db()

### Community 82 - "api/evaluation.py"
Cohesion: 0.26
Nodes (7): evaluate_dataset(), get_evaluation_run(), list_evaluation_runs(), EvaluationRun, DatasetEvaluationRequest, EvaluationRunResponse, Config

### Community 101 - "threat_intel_service.py"
Cohesion: 0.30
Nodes (7): list_indicators(), lookup_threat(), ThreatIndicatorResponse, Config, ThreatLookupRequest, ThreatLookupResponse, lookup_indicator()

### Community 102 - "run_fresh_attack_simulation.py"
Cohesion: 0.21
Nodes (5): run_audit(), wait_for_queue(), get_db_counts(), run_simulation(), wait_for_queue()

### Community 103 - "2. In-Depth Cross-Questioning of Each Model"
Cohesion: 0.17
Nodes (7): 1. Summary of Evaluated Models & Algorithms, 2. In-Depth Cross-Questioning of Each Model, C. Decision Tree Classifier (Supervised Comparative Baseline), D. Multi-Agent Correlation Algorithm, E. Topological Attack-Path Analysis, F. Calibrated Multi-Factor Risk Engine, Model and Algorithm Audit: Multi-Agent AI SOC

### Community 107 - "control_demo_stream"
Cohesion: 0.33
Nodes (4): control_demo_stream(), toggle_collector(), test_stream_control_endpoint_lifecycle(), exercise_endpoint()

## Knowledge Gaps
- **36 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SecurityEvent` connect `SecurityEvent` to `database.py`, `simulation_service.py`, `incidents.py`, `typing`, `run_phase10_verification`, `vm_service.py`, `datetime`, `_make_event`, `Test Suite 1: Backend Pytest Unit & Integration Tests`, `normalize_and_ingest_events`, `ResponseAction`, `main`, `sqlalchemy_orm`, `SecurityEventCreate`, `LiveDemoStreamCollector`, `RealtimeEventQueue`, `api/dashboard.py`, `run_fresh_attack_simulation.py`, `test_queue_processing_persists_distinct_processing_time`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Are the 41 inferred relationships involving `SecurityEvent` (e.g. with `AnomalyDetectionAgent` and `AttackPathAgent`) actually correct?**
  _`SecurityEvent` has 41 INFERRED edges - model-reasoned connections that need verification._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05561804774403199 - nodes in this community are weakly interconnected._
- **Why does `RealtimeEventQueue` connect `RealtimeEventQueue` to `SecurityEvent`, `KNOWN LIMITATIONS & ENVIRONMENTAL CONSTRAINTS`, `MultiAgentSOCEngine`, `FINAL SOC VERIFICATION & INDEPENDENT AUDIT REPORT`, `KNOWN LIMITATIONS & ENVIRONMENTAL CONSTRAINTS`, `FRESH ATTACK SIMULATION & DASHBOARD RECONCILIATION REPORT`, `4. Fresh Attack Simulation Execution`, `test_queue_processing_persists_distinct_processing_time`, `sqlalchemy_orm`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Are the 39 inferred relationships involving `Incident` (e.g. with `AttackPathAgent` and `CorrelationAgent`) actually correct?**
  _`Incident` has 39 INFERRED edges - model-reasoned connections that need verification._
- **Should `UTCBaseModel` be split into smaller, more focused modules?**
  _Cohesion score 0.1168091168091168 - nodes in this community are weakly interconnected._
- **Why does `SecurityEventCreate` connect `datetime` to `SecurityEventCreate`, `schemas/__init__.py`, `LiveDemoStreamCollector`, `SecurityEvent`, `FileWatcherCollector`, `vm_service.py`, `run_phase10_verification`, `os`, `Test Suite 1: Backend Pytest Unit & Integration Tests`, `network_flow_sniffer.py`, `normalize_and_ingest_events`, `main`, `sqlalchemy_orm`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._