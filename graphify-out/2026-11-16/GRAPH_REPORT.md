# Graph Report - kaveri2  (2026-11-15)

## Corpus Check
- 296 files · ~211,435 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 42 file(s) not represented in the graph (top: .joblib 12, (none) 6, .csv 6)

## Summary
- 2003 nodes · 5696 edges · 112 communities (77 shown, 35 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 556 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `126e8968`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- UTCBaseModel
- datetime
- simulation_service.py
- SecurityEvent
- .log
- Incident
- frontend/package.json
- run_phase10_verification
- orchestrator.py
- vm_service.py
- soc-frontend/package.json
- auth_service.py
- os
- typing
- CollectorManager
- _make_event
- IMPLEMENTATION ROADMAP: Multi-Agent AI Security Operations Center (SOC)
- Test Suite 1: Backend Pytest Unit & Integration Tests
- Running the Multi-Agent AI SOC Platform
- Multi-Agent AI Security Operations Center (SOC) for Real-Time Threat Detection
- dataset_pipeline.py
- 2. Step-by-Step Installation
- VMGuestCollector
- normalize_and_ingest_events
- ResponseAction
- SecurityEvent
- test_soar_simulation.py
- acquire_datasets.py
- mockSecurityData.js
- sys
- Project Context: Multi-Agent AI Security Operations Center (SOC)
- ref_react
- SecurityEventCreate
- responses.py
- schemas/__init__.py
- LiveDemoStreamCollector
- RealtimeEventQueue
- KNOWN LIMITATIONS & ENVIRONMENTAL CONSTRAINTS
- KNOWN LIMITATIONS & ENVIRONMENTAL CONSTRAINTS
- FINAL SOC VERIFICATION & INDEPENDENT AUDIT REPORT
- compilerOptions
- vm_service.py
- sys
- FRESH ATTACK SIMULATION & DASHBOARD RECONCILIATION REPORT
- api/dashboard.py
- BroadcasterService
- json
- Cybersecurity Dataset and Training Audit: Multi-Agent AI SOC
- SDMCET VII SEMESTER MAJOR PROJECT — FINAL SYNOPSIS COMPLIANCE & ACCEPTANCE REPORT
- test_run_local_virtual_nodes.py
- schemas/__init__.py
- Scenario A: SSH Authentication Brute-Force Attack
- network_flow_sniffer.py
- 1. Synopsis Requirement Acceptance Checklist
- time
- 1. Synopsis Requirement Acceptance Checklist
- 2. Detailed Test Results & Outputs
- 3. Verified Implementations & Reproducibility
- 2. Detailed Test Results & Outputs
- get_db
- 2. Step-by-Step Deployment Runbook
- 3. Useful Functionality Acquired from Reference Repository
- train_and_evaluate_model
- simulate_attacks.py
- run_local_virtual_nodes.py
- Guest Telemetry Collector Daemon Setup Guide
- test_virtual_lab.py
- analyze_threat_findings
- 2. Detailed Verification Test Suites
- FINAL REAL-TIME IMPLEMENTATION VERIFICATION AND ACCEPTANCE REPORT
- test_analytics_and_health.py
- DATA AND MODEL FLOW ARCHITECTURE
- PROJECT AUDIT: Multi-Agent AI Security Operations Center (SOC)
- TARGET ARCHITECTURE: Multi-Agent AI Security Operations Center (SOC)
- Virtual Enterprise Network Architecture & Lab Topology
- correlation_agent.py
- main.py
- api/evaluation.py
- PROJECT STRUCTURE DOCUMENTATION
- agents.py
- SYNOPSIS_COMPLIANCE_MATRIX.md
- start_vm_tunnel.sh
- setup_attacker.sh
- setup_victim.sh
- threat_intel_service.py
- FileWatcherCollector
- control_demo_stream
- generate_incident_pdf
- db
- Gap Analysis Matrix

## God Nodes (most connected - your core abstractions)
1. `SecurityEvent` - 109 edges
2. `Incident` - 73 edges
3. `ResponseAction` - 54 edges
4. `SecurityEventCreate` - 44 edges
5. `AgentFinding` - 42 edges
6. `CorrelationAgent` - 40 edges
7. `IncidentEvent` - 35 edges
8. `Button()` - 35 edges
9. `normalize_and_ingest_events()` - 34 edges
10. `Badge()` - 34 edges

## Surprising Connections (you probably didn't know these)
- `1.3 Multi-Agent SOC Architecture (All 10 Agents)` --references--> `MultiAgentSOCEngine`  [INFERRED]
  docs/FINAL_ACCEPTANCE_CHECKLIST.md → backend/app/agents/orchestrator.py
- `1.3 Multi-Agent SOC Architecture (All 10 Agents)` --references--> `MultiAgentSOCEngine`  [INFERRED]
  FINAL_ACCEPTANCE_CHECKLIST.md → backend/app/agents/orchestrator.py
- `Files to Modify` --references--> `execute_response_action()`  [INFERRED]
  IMPLEMENTATION_ROADMAP.md → backend/app/services/response_service.py
- `1.4 SOAR Response & Verification Engine` --references--> `rollback_response_action()`  [INFERRED]
  docs/FINAL_ACCEPTANCE_CHECKLIST.md → backend/app/services/response_service.py
- `1.4 SOAR Response & Verification Engine` --references--> `rollback_response_action()`  [INFERRED]
  FINAL_ACCEPTANCE_CHECKLIST.md → backend/app/services/response_service.py

## Import Cycles
- None detected.

## Communities (112 total, 35 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.05
Nodes (89): api, getAuthHeaders(), request(), App(), ProtectedRoute(), AttackPathGraph(), AttackPathGraphProps, Modal() (+81 more)

### Community 1 - "UTCBaseModel"
Cohesion: 0.16
Nodes (13): list_findings(), list_rules(), trigger_evaluation(), update_rule(), DetectionRule, DetectionFindingResponse, Config, DetectionRuleBase (+5 more)

### Community 2 - "datetime"
Cohesion: 0.14
Nodes (6): set_sqlite_pragma(), AgentExecution, CollectorConfig, DetectionFinding, make_execution(), test_linkage_excludes_simulated_and_unrelated_traffic()

### Community 3 - "simulation_service.py"
Cohesion: 0.06
Nodes (21): get_simulation_execution(), get_simulation_status(), get_supported_scenarios(), launch_simulation(), list_simulation_executions(), stop_simulation(), AttackSimulationExecution, SimulationConnectivityStatus (+13 more)

### Community 4 - "SecurityEvent"
Cohesion: 0.13
Nodes (17): CorrelationAgent, AgentFinding, test_10_correlation_multiple_related_findings_correlates(), test_11_correlation_brute_force_single_finding_not_counted_as_multiple_agent_findings(), test_12_correlation_unrelated_findings_remain_separate(), test_13_correlation_outside_900s_window_do_not_group(), test_14_correlation_delayed_finding_updates_existing_incident(), test_15_correlation_idempotency_no_duplicate_links_or_incidents() (+9 more)

### Community 5 - ".log"
Cohesion: 0.06
Nodes (10): AnomalyDetectionEngine, 1. Summary of Evaluated Models & Algorithms, 2. In-Depth Cross-Questioning of Each Model, A. Isolation Forest (Unsupervised Anomaly Detector), C. Decision Tree Classifier (Supervised Comparative Baseline), D. Multi-Agent Correlation Algorithm, E. Topological Attack-Path Analysis, F. Calibrated Multi-Factor Risk Engine (+2 more)

### Community 6 - "Incident"
Cohesion: 0.11
Nodes (20): add_incident_note(), get_correlation_detail(), get_incident_detail(), list_correlations(), list_incidents(), trigger_incident_investigation(), update_incident_status(), UTCDateTime (+12 more)

### Community 7 - "frontend/package.json"
Cohesion: 0.06
Nodes (43): dependencies, clsx@^2.1.1, framer-motion@^14.9.0, lucide-react@^0.469.0, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.28.1, recharts@^2.15.0 (+35 more)

### Community 9 - "run_phase10_verification"
Cohesion: 0.15
Nodes (23): AnomalyDetectionAgent, AttackPathAgent, AuthenticationAgent, EndpointAgent, InvestigationAgent, MaliciousBehaviourAgent, NetworkMonitoringAgent, MultiAgentSOCEngine (+15 more)

### Community 11 - "vm_service.py"
Cohesion: 0.15
Nodes (13): create_vm_action(), get_virtualization_diagnostics(), list_vm_nodes(), poll_pending_actions(), run_vm_scenario(), submit_action_result(), submit_vm_telemetry(), verify_vm_auth() (+5 more)

### Community 12 - "soc-frontend/package.json"
Cohesion: 0.07
Nodes (36): dependencies, clsx@^2.1.1, framer-motion@^11.5.4, lucide-react@^0.441.0, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.26.2, recharts@^2.12.7 (+28 more)

### Community 13 - "auth_service.py"
Cohesion: 0.18
Nodes (10): get_current_user_profile(), login(), logout(), UserResponse, Config, create_access_token(), get_current_user(), get_password_hash() (+2 more)

### Community 14 - "os"
Cohesion: 0.16
Nodes (5): load_or_create_reference_dataset(), extract_feature_importance(), build_preprocessing_metadata(), clean_dataset(), stream_events_to_soc()

### Community 15 - "typing"
Cohesion: 0.15
Nodes (6): get_collectors_health(), get_pipeline_health(), get_system_and_sources_health_endpoint(), websocket_endpoint(), BaseCollector, stream_db()

### Community 16 - "CollectorManager"
Cohesion: 0.18
Nodes (3): CollectorManager, SyslogCollector, SyslogProtocol

### Community 17 - "_make_event"
Cohesion: 0.13
Nodes (6): _types_are_related(), _within_time_window(), _make_event(), _run_correlation(), TestCorrelationAgentScenarios, TestHelpers

### Community 18 - "IMPLEMENTATION ROADMAP: Multi-Agent AI Security Operations Center (SOC)"
Cohesion: 0.04
Nodes (45): Acceptance Criteria, Acceptance Criteria, Acceptance Criteria, Acceptance Criteria, Acceptance Criteria, Deliverables, Dependencies, Dependencies (+37 more)

### Community 19 - "Test Suite 1: Backend Pytest Unit & Integration Tests"
Cohesion: 0.17
Nodes (20): test_broadcaster_event_dispatch(), test_collector_manager_and_freshness_warnings(), test_duplicate_event_handling(), test_event_driven_agent_orchestration_and_correlation(), test_response_workflow_and_verification(), test_rolling_window_brute_force_detection(), test_anomaly_detection_model(), test_auth_and_seed_users() (+12 more)

### Community 20 - "Running the Multi-Agent AI SOC Platform"
Cohesion: 0.05
Nodes (35): lifespan(), ensure_event_processed_at_column(), ensure_incident_event_unique_constraint(), ensure_schema_migrations(), recalculate_incident_event_counts(), test_existing_event_migration_preserves_historical_timestamp(), Active dashboard, Command Centre graphs (+27 more)

### Community 21 - "Multi-Agent AI Security Operations Center (SOC) for Real-Time Threat Detection"
Cohesion: 0.07
Nodes (28): 10. Contributors & Academic Defense Team, 1. Introduction & Overview, 1. Real-Time Command Center (`/dashboard`), 2. Key Features, 2. Live Threat Map & Dynamic Attack Graph (`/incidents/{id}`), 3. Forensic Investigation Console (`/incidents/{id}/investigation`), 3. System Architecture Overview, 4. SOAR Containment & Verification Center (`/responses`) (+20 more)

### Community 22 - "dataset_pipeline.py"
Cohesion: 0.13
Nodes (9): extract_flow_features_from_event(), load_persisted_classifier(), run_realtime_flow_inference(), train_and_evaluate_pipeline(), 2.2 Real-Time Online Inference Flow, Live Ingestion Flow, 5. Bugs Found During Audit & Fixes Applied, B. Random Forest Classifier (Supervised Intrusion Classifier) (+1 more)

### Community 23 - "2. Step-by-Step Installation"
Cohesion: 0.07
Nodes (27): 1.1 Minimum & Recommended Hardware, 1.2 Required Software Packages, 1. System Requirements & Prerequisites, 2. Step-by-Step Installation, 3. Running the Application, 4. Default Login Credentials, 5. Post-Installation Verification & Testing, 6. Message Broker Configuration: In-Memory vs. Apache Kafka (+19 more)

### Community 25 - "normalize_and_ingest_events"
Cohesion: 0.16
Nodes (14): export_events_csv(), get_event(), import_batch_events(), ingest_single_event(), list_events(), EventBatchIngest, IngestionResult, SecurityEventBase (+6 more)

### Community 26 - "ResponseAction"
Cohesion: 0.20
Nodes (14): ResponseAction, log_audit_entry(), approve_response_action(), execute_response_action(), rollback_response_action(), simulate_response_action(), create_and_run_verification(), create_simulation_verification() (+6 more)

### Community 27 - "SecurityEvent"
Cohesion: 0.10
Nodes (12): SecurityEvent, test_1_auth_failed_login_finding(), test_2_auth_brute_force_burst_finding(), test_4_network_port_sweep_finding(), test_5_endpoint_lolbin_process_execution(), test_6_anomaly_scoring_numeric_without_incident(), test_7_threat_intel_enrichment_without_incident(), event() (+4 more)

### Community 28 - "test_soar_simulation.py"
Cohesion: 0.22
Nodes (14): AuditLog, VerificationResult, VMAction, VMNode, _create_action(), soar_client(), test_admin_approval_only_changes_approval_state(), test_approval_requires_authenticated_soc_admin_and_audits_denial() (+6 more)

### Community 29 - "acquire_datasets.py"
Cohesion: 0.18
Nodes (6): compute_file_sha256(), download_dataset(), get_dataset_path(), load_genuine_dataset(), validate_dataset_schema(), main()

### Community 30 - "mockSecurityData.js"
Cohesion: 0.29
Nodes (6): activityTimeSeries, correlatedIncidents, miniSparklines, rawSecurityEvents, summaryMetrics, workflowStages

### Community 31 - "sys"
Cohesion: 0.15
Nodes (4): get_scenario_events(), main(), run_integration_verification(), verify_initial_state()

### Community 32 - "Project Context: Multi-Agent AI Security Operations Center (SOC)"
Cohesion: 0.10
Nodes (20): 10. Automated Test Results & Verification, 11. Known Limitations & Environmental Constraints, 1. Project Identification & Metadata, 2. Problem Statement & System Purpose, 3. End-to-End Operational Lifecycle & Flow, 5.1 Dual-Layer Detection Model, 5.2 Authentic Dataset Provenance, 5.3 Leak-Free Preprocessing Pipeline (`ml/preprocessing/pipeline.py`) (+12 more)

### Community 33 - "ref_react"
Cohesion: 0.05
Nodes (78): MetricCardProps, SystemTourModalProps, GLOSSARY, TermTooltipProps, NavSection, SidebarProps, api, getAuthHeaders() (+70 more)

### Community 34 - "SecurityEventCreate"
Cohesion: 0.26
Nodes (8): reset_lab(), trigger_scenario(), _queue_scenario_events(), reset_demo_lab(), run_scenario_1_brute_force(), run_scenario_2_network_scan(), run_scenario_3_account_compromise(), run_scenario_4_endpoint_malware()

### Community 35 - "responses.py"
Cohesion: 0.30
Nodes (13): allow_action(), approve_action(), deny_action(), execute_action(), get_response(), list_responses(), list_verifications(), _require_soc_admin() (+5 more)

### Community 36 - "schemas/__init__.py"
Cohesion: 0.19
Nodes (9): AgentExecutionResponse, Config, AgentFindingResponse, Config, UTCBaseModel, VerificationResultResponse, Config, RiskAssessmentResponse (+1 more)

### Community 37 - "LiveDemoStreamCollector"
Cohesion: 0.13
Nodes (4): LiveDemoStreamCollector, test_stream_pause_resume_stop_and_duplicate_start(), test_stream_rejects_unknown_scenario_and_invalid_rate(), test_stream_scenarios_persist_normalized_events_and_enqueue()

### Community 38 - "RealtimeEventQueue"
Cohesion: 0.13
Nodes (4): RealtimeEventQueue, test_queue_processing_persists_distinct_processing_time(), 1.1 Backend Architecture & API Layer, 1.1 Backend Architecture & API Layer

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

### Community 43 - "vm_service.py"
Cohesion: 0.18
Nodes (9): get_analytics_report(), get_ingestion_cumulative_stats(), get_lab_activity(), get_system_and_sources_health(), ensure_utc(), format_ist(), utc_isoformat(), get_lab_nodes_status() (+1 more)

### Community 44 - "sys"
Cohesion: 0.15
Nodes (5): clean_database(), get_wheel_info(), main(), install(), install_portable_node()

### Community 45 - "FRESH ATTACK SIMULATION & DASHBOARD RECONCILIATION REPORT"
Cohesion: 0.07
Nodes (26): 10. Exact Commands to Reproduce the Fresh Test, 1. Attack-Path DAG Topology, 1. Original Database Backup Details, 2. Eight Canonical Root Cause Analysis (RCA) Answers, 2. Test Environment & Preserved Entities, 3. Initial Clean Database Verification (T0), 3. Policy-Governed SOAR Response Execution, 4. Approval Desk Security Verification (+18 more)

### Community 46 - "api/dashboard.py"
Cohesion: 0.32
Nodes (11): get_dashboard_summary(), lab_activity(), AgentHealthCard, AgentSummary, AttentionItem, CategoryCount, DashboardSummaryResponse, MetricSummary (+3 more)

### Community 48 - "json"
Cohesion: 0.26
Nodes (7): capture_page(), get_auth_token(), main(), send_cdp(), wait_for_server(), http_req(), main()

### Community 49 - "Cybersecurity Dataset and Training Audit: Multi-Agent AI SOC"
Cohesion: 0.13
Nodes (14): 1. Required Benchmark Datasets Overview, 2. Dataset 1: UNSW-NB15 Provenance & Verification, 3. Dataset 2: CICIDS2017 Provenance & Verification, 4. Persisted Model Artifacts & Live Pipeline Integration, 5. Audit Conclusion, A. Official Metadata & Sources, A. Official Metadata & Sources, B. Local Authentic File Inspection (+6 more)

### Community 50 - "SDMCET VII SEMESTER MAJOR PROJECT — FINAL SYNOPSIS COMPLIANCE & ACCEPTANCE REPORT"
Cohesion: 0.14
Nodes (13): 1. Executive Summary & Verdict, 3. Dataset Provenance & Machine Learning Audit, 5. End-to-End Test Execution Summary, 6. How to Run the Application & Verify, 7. Faculty Presentation & Academic Defense Summary, A. Run Full Test Suites, Authentic Datasets Evaluated, B. Train Supervised ML Models on Authentic Datasets (+5 more)

### Community 51 - "test_run_local_virtual_nodes.py"
Cohesion: 0.19
Nodes (5): FakeProcess, test_read_guest_output_reads_stdout_and_detects_real_ack(), test_runner_stops_started_process_when_later_start_fails(), test_start_guest_node_captures_text_output_and_merges_stderr(), fake_popen()

### Community 52 - "schemas/__init__.py"
Cohesion: 0.20
Nodes (12): LoginRequest, TokenResponse, UserCreate, IncidentBase, IncidentDetailResponse, IncidentNoteCreate, IncidentNoteResponse, Config (+4 more)

### Community 53 - "Scenario A: SSH Authentication Brute-Force Attack"
Cohesion: 0.14
Nodes (13): 1. Goal, 1. Goal, 1. Goal, 2. Execution from Attacker VM (`192.168.56.20`):, 2. Execution from Attacker VM (`192.168.56.20`):, 2. Execution from Attacker VM (`192.168.56.20`):, 3. Expected Telemetry & SOC Detection:, 3. Expected Telemetry & SOC Detection: (+5 more)

### Community 55 - "1. Synopsis Requirement Acceptance Checklist"
Cohesion: 0.15
Nodes (12): 1.2 Machine Learning & Benchmark Datasets, 1.3 Multi-Agent SOC Architecture (All 10 Agents), 1.4 SOAR Response & Verification Engine, 1.5 Frontend Dashboard, 1.6 Three-VM Virtual Enterprise Lab, 1. Synopsis Requirement Acceptance Checklist, 2. Features Verified vs Features Still Pending, 3. Security & Repository Audit (+4 more)

### Community 56 - "time"
Cohesion: 0.17
Nodes (10): frame(), test_observes_short_tcp_and_udp_but_excludes_other_peers(), download_file(), get_wheel_url(), main(), run_multi_stage_intrusion(), run_port_scan(), run_ssh_brute_force() (+2 more)

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

### Community 61 - "get_db"
Cohesion: 0.33
Nodes (4): download_incident_report(), download_summary_report(), get_soc_analytics(), get_db()

### Community 62 - "2. Step-by-Step Deployment Runbook"
Cohesion: 0.18
Nodes (10): 1. Executive Summary & Hardware Requirements, 2. Step-by-Step Deployment Runbook, GENUINE VIRTUAL ENTERPRISE NETWORK LAB — DEPLOYMENT & ACCEPTANCE GUIDE, Minimum Workstation Requirements for Hardware Kernel Virtualization, Step 1: Install Hypervisor & Tooling (PowerShell as Administrator), Step 2: Verify Host-Only Network Adapter, Step 3: Provision the 3 Isolated Guest VMs, Step 4: Start SOC Central Platform on Host (+2 more)

### Community 63 - "3. Useful Functionality Acquired from Reference Repository"
Cohesion: 0.20
Nodes (9): 1. Executive Summary, 2. Comprehensive Component Gap Matrix, 3. Useful Functionality Acquired from Reference Repository, 4. Features Preserved Exclusively from Kaveri's Implementation, A. Dataset Cleaning (`clean_dataset.py`), B. Preprocessing Metadata Extraction (`build_preprocessing_metadata.py`), C. Feature Importance Analysis (`feature_importance.py`), D. Continuous Event Stream Replay (`kafka/realtime_producer.py`, `realtime_wrapper.py`) (+1 more)

### Community 64 - "train_and_evaluate_model"
Cohesion: 0.11
Nodes (3): CybersecurityPreprocessingPipeline, generate_visualizations(), train_and_evaluate_model()

### Community 65 - "simulate_attacks.py"
Cohesion: 0.36
Nodes (8): now_iso(), post_telemetry(), scenario_brute_force(), scenario_ddos(), scenario_exfiltration(), scenario_portscan(), scenario_ransomware(), send()

### Community 66 - "run_local_virtual_nodes.py"
Cohesion: 0.36
Nodes (7): main(), read_guest_output(), _read_guest_output_guarded(), resolve_soc_url(), start_guest_node(), stop_guest_processes(), wait_for_guest_readiness()

### Community 67 - "Guest Telemetry Collector Daemon Setup Guide"
Cohesion: 0.22
Nodes (8): 1. Prerequisites on the Guest VM, 2. Quick-Start Execution, 3. Running as a Persistent Systemd Service (Optional), 4. How the Guest Daemon Works, Guest Telemetry Collector Daemon Setup Guide, On Endpoint VM (192.168.56.10):, On Server VM (192.168.56.15):, Running Local Guest-Agent Processes

### Community 68 - "test_virtual_lab.py"
Cohesion: 0.22
Nodes (8): seed_detection_rules(), seed_threat_intelligence(), seed_default_vm_nodes(), db_session(), db_session(), db_session(), db_session(), setup_test_db()

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

### Community 74 - "PROJECT AUDIT: Multi-Agent AI Security Operations Center (SOC)"
Cohesion: 0.14
Nodes (13): 1. Actual System Architecture, 4. Telemetry Collection & VM Infrastructure Audit, 5. API & Database Integrity Audit, 6. Frontend Dashboard Audit, 7. Bug & Reliability Summary, Attacker VM (`45.74.156.44 / 10.0.0.19`), Clean & Functional Pages, Database Deficiencies Identified (+5 more)

### Community 75 - "TARGET ARCHITECTURE: Multi-Agent AI Security Operations Center (SOC)"
Cohesion: 0.14
Nodes (13): 1. Laboratory & Infrastructure Topology (Two-VM Model), 2. End-to-End Security Data Flow, 3. The Ten Specialized Agents: Responsibilities & Dependencies, 4.1 Security Event Lifecycle, 4.2 Agent Finding Lifecycle, 4.3 Incident Lifecycle, 4.4 SOAR Response Action Lifecycle, 4. Lifecycles & State Transitions (+5 more)

### Community 78 - "Virtual Enterprise Network Architecture & Lab Topology"
Cohesion: 0.40
Nodes (4): 1. Enterprise Network Lab Topology, 2. IP Addressing & Component Roles, 3. Network Isolation Guarantee, Virtual Enterprise Network Architecture & Lab Topology

### Community 81 - "main.py"
Cohesion: 0.11
Nodes (8): get_audit_logs(), get_policies(), update_policies(), Settings, Config, global_websocket_endpoint(), healthcheck(), root()

### Community 82 - "api/evaluation.py"
Cohesion: 0.21
Nodes (8): evaluate_dataset(), get_evaluation_run(), list_evaluation_runs(), EvaluationRun, DatasetEvaluationRequest, EvaluationRunResponse, Config, run_dataset_evaluation()

### Community 85 - "agents.py"
Cohesion: 0.31
Nodes (6): get_agent_findings(), get_agent_runs(), get_agents_status(), trigger_agent_execution(), AgentRunRequest, AgentStatusItem

### Community 101 - "threat_intel_service.py"
Cohesion: 0.23
Nodes (10): create_or_update_indicator(), list_indicators(), lookup_threat(), ThreatIndicator, ThreatIndicatorCreate, ThreatIndicatorResponse, Config, ThreatLookupRequest (+2 more)

### Community 104 - "control_demo_stream"
Cohesion: 0.33
Nodes (4): control_demo_stream(), toggle_collector(), test_stream_control_endpoint_lifecycle(), exercise_endpoint()

### Community 106 - "db"
Cohesion: 0.40
Nodes (4): db(), test_one_shot_scenarios_enqueue_persisted_security_events(), test_empty_window_returns_zeroes_without_sample_values(), test_lab_counts_real_events_by_received_time_and_bucket()

## Knowledge Gaps
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SecurityEvent` connect `SecurityEvent` to `UTCBaseModel`, `datetime`, `simulation_service.py`, `SecurityEvent`, `Incident`, `run_phase10_verification`, `orchestrator.py`, `typing`, `_make_event`, `Test Suite 1: Backend Pytest Unit & Integration Tests`, `normalize_and_ingest_events`, `ResponseAction`, `SecurityEventCreate`, `LiveDemoStreamCollector`, `RealtimeEventQueue`, `vm_service.py`, `api/dashboard.py`, `correlation_agent.py`, `generate_incident_pdf`, `db`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Are the 40 inferred relationships involving `SecurityEvent` (e.g. with `AnomalyDetectionAgent` and `AttackPathAgent`) actually correct?**
  _`SecurityEvent` has 40 INFERRED edges - model-reasoned connections that need verification._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05296535525543159 - nodes in this community are weakly interconnected._
- **Why does `RealtimeEventQueue` connect `RealtimeEventQueue` to `KNOWN LIMITATIONS & ENVIRONMENTAL CONSTRAINTS`, `KNOWN LIMITATIONS & ENVIRONMENTAL CONSTRAINTS`, `run_phase10_verification`, `FINAL SOC VERIFICATION & INDEPENDENT AUDIT REPORT`, `FRESH ATTACK SIMULATION & DASHBOARD RECONCILIATION REPORT`, `typing`, `SecurityEvent`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Are the 37 inferred relationships involving `Incident` (e.g. with `AttackPathAgent` and `CorrelationAgent`) actually correct?**
  _`Incident` has 37 INFERRED edges - model-reasoned connections that need verification._
- **Should `datetime` be split into smaller, more focused modules?**
  _Cohesion score 0.13598519888991675 - nodes in this community are weakly interconnected._
- **Should `simulation_service.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05641025641025641 - nodes in this community are weakly interconnected._