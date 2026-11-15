# Graph Report - kaveri2  (2026-11-15)

## Corpus Check
- 301 files · ~212,123 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 44 file(s) not represented in the graph (top: .joblib 12, (none) 6, .csv 6)

## Summary
- 1922 nodes · 5490 edges · 110 communities (70 shown, 40 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 562 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `78149ddd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Agent Orchestration & Analysis
- test_audit_and_correlation.py
- SecurityEvent
- incidents.py
- App.jsx
- simulation_service.py
- detections.py
- Frontend Dependencies
- time
- Frontend Dependencies (2)
- generate_incident_pdf
- run_simulation
- Machine Learning & Telemetry Pipeline (3)
- CollectorManager
- Incident
- responses.py
- orchestrator.py
- Frontend API Client (4)
- Agent Orchestration & Analysis (5)
- Multi-Agent AI SOC: Friend's Real VM Setup & Compatibility Guide
- Attack Simulation Engine (3)
- LiveDemoStreamCollector
- REAL VM INTEGRATION & INITIAL CORRELATION AUDIT REPORT
- Threat Detection & Rules (2)
- tsconfig.json / compilerOptions
- schemas/__init__.py
- Frontend API Client (5)
- BroadcasterService / .broadcast()
- test_run_local_virtual_nodes.py / FakePr
- Multi-Agent AI Security Operations Center (SOC) for Real-Time Threat Detection
- 2. Step-by-Step Installation
- AnomalyDetectionEngine
- Test Suite 1: Backend Pytest Unit & Integration Tests
- json
- User
- start_vm_tunnel.sh / start_vm_tunnel.sh 
- SecurityEventCreate
- .record_finding
- get_collectors_health
- Project Context: Multi-Agent AI Security Operations Center (SOC)
- KNOWN LIMITATIONS & ENVIRONMENTAL CONSTRAINTS
- KNOWN LIMITATIONS & ENVIRONMENTAL CONSTRAINTS
- datetime
- agents.py
- threat_intel_service.py
- ref_react_router_dom
- Running the Multi-Agent AI SOC Platform
- api/evaluation.py
- Cybersecurity Dataset and Training Audit: Multi-Agent AI SOC
- ref_react
- FINAL SOC VERIFICATION & INDEPENDENT AUDIT REPORT
- FRESH ATTACK SIMULATION & DASHBOARD RECONCILIATION REPORT
- SDMCET VII SEMESTER MAJOR PROJECT — FINAL SYNOPSIS COMPLIANCE & ACCEPTANCE REPORT
- Scenario A: SSH Authentication Brute-Force Attack
- 1. Synopsis Requirement Acceptance Checklist
- 1. Synopsis Requirement Acceptance Checklist
- Correlation.jsx
- ref_lucide_react
- database.py
- 3. Verified Implementations & Reproducibility
- EventTable.jsx
- 2. Detailed Test Results & Outputs
- 2. Step-by-Step Deployment Runbook
- 2. In-Depth Cross-Questioning of Each Model
- MultiAgentPipeline.jsx
- VirtualLab.jsx
- 3. Useful Functionality Acquired from Reference Repository
- Guest Telemetry Collector Daemon Setup Guide
- SecurityEventCreate
- os
- config.py
- DATA AND MODEL FLOW ARCHITECTURE
- 5. Incident Response & SOAR Governance Verification
- 4. Fresh Attack Simulation Execution
- test_25_e2e_websocket_broadcast_distinction
- request
- Virtual Enterprise Network Architecture & Lab Topology
- PROJECT STRUCTURE DOCUMENTATION
- SYNOPSIS_COMPLIANCE_MATRIX.md
- main.py
- run_realtime_flow_inference
- models/incident.py
- NetworkFlowSniffer
- DetectionFinding

## God Nodes (most connected - your core abstractions)
1. `SecurityEvent` - 107 edges
2. `Incident` - 92 edges
3. `ResponseAction` - 57 edges
4. `MultiAgentSOCEngine` - 44 edges
5. `SecurityEventCreate` - 43 edges
6. `AgentFinding` - 41 edges
7. `CorrelationAgent` - 35 edges
8. `Button()` - 35 edges
9. `normalize_and_ingest_events()` - 34 edges
10. `Badge()` - 34 edges

## Surprising Connections (you probably didn't know these)
- `3. Investigation of Previous Exit-Code-1 Occurrences` --references--> `InvestigationAgent`  [INFERRED]
  FINAL_SOC_VERIFICATION_REPORT.md → backend/app/agents/investigation_agent.py
- `2. Eight Canonical Root Cause Analysis (RCA) Answers` --references--> `InvestigationAgent`  [INFERRED]
  FRESH_ATTACK_SIMULATION_REPORT.md → backend/app/agents/investigation_agent.py
- `1.3 Multi-Agent SOC Architecture (All 10 Agents)` --references--> `MultiAgentSOCEngine`  [INFERRED]
  docs/FINAL_ACCEPTANCE_CHECKLIST.md → backend/app/agents/orchestrator.py
- `1.3 Multi-Agent SOC Architecture (All 10 Agents)` --references--> `MultiAgentSOCEngine`  [INFERRED]
  FINAL_ACCEPTANCE_CHECKLIST.md → backend/app/agents/orchestrator.py
- `3. Policy-Governed SOAR Response Execution` --references--> `ResponseAgent`  [INFERRED]
  FRESH_ATTACK_SIMULATION_REPORT.md → backend/app/agents/response_agent.py

## Import Cycles
- None detected.

## Communities (110 total, 40 thin omitted)

### Community 0 - "Agent Orchestration & Analysis"
Cohesion: 0.06
Nodes (89): api, getAuthHeaders(), request(), App(), ProtectedRoute(), AttackPathGraph(), AttackPathGraphProps, Modal() (+81 more)

### Community 1 - "test_audit_and_correlation.py"
Cohesion: 0.10
Nodes (25): CorrelationAgent, AgentFinding, Incident, IncidentAudit, IncidentFinding, test_10_correlation_multiple_related_findings_correlates(), test_11_correlation_brute_force_single_finding_not_counted_as_multiple_agent_findings(), test_12_correlation_unrelated_findings_remain_separate() (+17 more)

### Community 2 - "SecurityEvent"
Cohesion: 0.14
Nodes (12): SecurityEvent, get_lab_activity(), ensure_utc(), format_ist(), utc_isoformat(), test_5_endpoint_lolbin_process_execution(), test_6_anomaly_scoring_numeric_without_incident(), test_empty_window_returns_zeroes_without_sample_values() (+4 more)

### Community 3 - "incidents.py"
Cohesion: 0.18
Nodes (17): add_incident_note(), get_correlation_detail(), get_incident_detail(), list_correlations(), list_incidents(), trigger_incident_investigation(), update_incident_status(), IncidentNote (+9 more)

### Community 4 - "App.jsx"
Cohesion: 0.26
Nodes (17): api, App(), Badge(), Button(), Modal(), AGENT_METADATA, Agents(), AttackSimulation() (+9 more)

### Community 5 - "simulation_service.py"
Cohesion: 0.08
Nodes (17): AttackSimulationExecution, SimulationConnectivityStatus, SimulationExecutionResponse, Config, SimulationLaunchRequest, SimulationScenario, SimulationStopRequest, VMNodeStatus (+9 more)

### Community 6 - "detections.py"
Cohesion: 0.17
Nodes (13): list_findings(), list_rules(), trigger_evaluation(), update_rule(), DetectionRule, DetectionFindingResponse, Config, DetectionRuleBase (+5 more)

### Community 7 - "Frontend Dependencies"
Cohesion: 0.06
Nodes (43): dependencies, clsx@^2.1.1, framer-motion@^14.9.0, lucide-react@^0.469.0, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.28.1, recharts@^2.15.0 (+35 more)

### Community 8 - "time"
Cohesion: 0.11
Nodes (14): wait_for_queue(), run_multi_stage_intrusion(), run_port_scan(), run_ssh_brute_force(), test_tcp_connect(), validate_lab_target(), parse_arguments(), main() (+6 more)

### Community 9 - "Frontend Dependencies (2)"
Cohesion: 0.07
Nodes (36): dependencies, clsx@^2.1.1, framer-motion@^11.5.4, lucide-react@^0.441.0, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.26.2, recharts@^2.12.7 (+28 more)

### Community 10 - "generate_incident_pdf"
Cohesion: 0.21
Nodes (4): download_incident_report(), download_summary_report(), generate_incident_pdf(), generate_soc_summary_pdf()

### Community 11 - "run_simulation"
Cohesion: 0.32
Nodes (4): run_simulation(), wait_for_queue(), get_scenario_events(), main()

### Community 12 - "Machine Learning & Telemetry Pipeline (3)"
Cohesion: 0.12
Nodes (3): CybersecurityPreprocessingPipeline, generate_visualizations(), train_and_evaluate_model()

### Community 13 - "CollectorManager"
Cohesion: 0.11
Nodes (4): CollectorManager, FileWatcherCollector, SyslogCollector, SyslogProtocol

### Community 14 - "Incident"
Cohesion: 0.18
Nodes (16): ResponseAction, log_audit_entry(), approve_response_action(), execute_response_action(), rollback_response_action(), simulate_response_action(), create_and_run_verification(), create_simulation_verification() (+8 more)

### Community 15 - "responses.py"
Cohesion: 0.29
Nodes (12): allow_action(), approve_action(), deny_action(), execute_action(), get_response(), list_responses(), list_verifications(), _require_soc_admin() (+4 more)

### Community 16 - "orchestrator.py"
Cohesion: 0.21
Nodes (18): AnomalyDetectionAgent, AttackPathAgent, AuthenticationAgent, BaseAgent, EndpointAgent, InvestigationAgent, MaliciousBehaviourAgent, NetworkMonitoringAgent (+10 more)

### Community 17 - "Frontend API Client (4)"
Cohesion: 0.12
Nodes (15): create_vm_action(), get_virtualization_diagnostics(), list_vm_nodes(), poll_pending_actions(), register_or_update_node(), run_vm_scenario(), submit_action_result(), submit_vm_telemetry() (+7 more)

### Community 19 - "Multi-Agent AI SOC: Friend's Real VM Setup & Compatibility Guide"
Cohesion: 0.06
Nodes (32): healthcheck(), root(), 10. Summary Checklist for Handover, 1. Required Software & Dependencies, 2. VM Network Architecture & Subnet Setup, 3. Host Step 1: Discover Host-Only IP & Open Firewall, 4. Host Step 2: Configure & Start Backend and Frontend, 5. Guest VM Setup: Install & Start Guest Collector (+24 more)

### Community 20 - "Attack Simulation Engine (3)"
Cohesion: 0.13
Nodes (17): get_audit_logs(), get_policies(), update_policies(), AuditLog, VerificationResult, VMAction, VMNode, _create_action() (+9 more)

### Community 21 - "LiveDemoStreamCollector"
Cohesion: 0.14
Nodes (4): LiveDemoStreamCollector, test_stream_pause_resume_stop_and_duplicate_start(), test_stream_rejects_unknown_scenario_and_invalid_rate(), test_stream_scenarios_persist_normalized_events_and_enqueue()

### Community 22 - "REAL VM INTEGRATION & INITIAL CORRELATION AUDIT REPORT"
Cohesion: 0.06
Nodes (32): 10. Remaining Limitations & Prerequisites, 11. Exact Commands to Configure and Start Real VMs, 12. Exact Commands to Start SOC Backend & Frontend, 13. Step-by-Step Instructions to Reproduce the Verification, 1. Host Virtualization Capability, 1. Root Cause Analysis: Why Initial Correlation Showed "2", 2. Metric Disambiguation Matrix, 2. Network Transport & Port Bindings (+24 more)

### Community 24 - "tsconfig.json / compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 25 - "schemas/__init__.py"
Cohesion: 0.14
Nodes (17): AgentExecutionResponse, Config, AgentFindingResponse, Config, AgentRunRequest, AgentStatusItem, LoginRequest, TokenResponse (+9 more)

### Community 26 - "Frontend API Client (5)"
Cohesion: 0.32
Nodes (11): get_dashboard_summary(), lab_activity(), AgentHealthCard, AgentSummary, AttentionItem, CategoryCount, DashboardSummaryResponse, MetricSummary (+3 more)

### Community 28 - "test_run_local_virtual_nodes.py / FakePr"
Cohesion: 0.15
Nodes (7): frame(), test_observes_short_tcp_and_udp_but_excludes_other_peers(), FakeProcess, test_read_guest_output_reads_stdout_and_detects_real_ack(), test_runner_stops_started_process_when_later_start_fails(), test_start_guest_node_captures_text_output_and_merges_stderr(), fake_popen()

### Community 29 - "Multi-Agent AI Security Operations Center (SOC) for Real-Time Threat Detection"
Cohesion: 0.07
Nodes (28): 10. Contributors & Academic Defense Team, 1. Introduction & Overview, 1. Real-Time Command Center (`/dashboard`), 2. Key Features, 2. Live Threat Map & Dynamic Attack Graph (`/incidents/{id}`), 3. Forensic Investigation Console (`/incidents/{id}/investigation`), 3. System Architecture Overview, 4. SOAR Containment & Verification Center (`/responses`) (+20 more)

### Community 30 - "2. Step-by-Step Installation"
Cohesion: 0.07
Nodes (27): 1.1 Minimum & Recommended Hardware, 1.2 Required Software Packages, 1. System Requirements & Prerequisites, 2. Step-by-Step Installation, 3. Running the Application, 4. Default Login Credentials, 5. Post-Installation Verification & Testing, 6. Message Broker Configuration: In-Memory vs. Apache Kafka (+19 more)

### Community 32 - "Test Suite 1: Backend Pytest Unit & Integration Tests"
Cohesion: 0.06
Nodes (43): test_broadcaster_event_dispatch(), test_collector_manager_and_freshness_warnings(), test_duplicate_event_handling(), test_event_driven_agent_orchestration_and_correlation(), test_rolling_window_brute_force_detection(), test_anomaly_detection_model(), test_auth_and_seed_users(), test_multi_agent_pipeline_and_correlation() (+35 more)

### Community 33 - "json"
Cohesion: 0.10
Nodes (20): capture_page(), get_auth_token(), main(), send_cdp(), wait_for_server(), get_wheel_info(), main(), download_file() (+12 more)

### Community 34 - "User"
Cohesion: 0.10
Nodes (16): get_current_user_profile(), login(), logout(), get_simulation_execution(), get_simulation_status(), get_supported_scenarios(), launch_simulation(), list_simulation_executions() (+8 more)

### Community 44 - "SecurityEventCreate"
Cohesion: 0.16
Nodes (14): export_events_csv(), get_event(), import_batch_events(), ingest_single_event(), list_events(), EventBatchIngest, IngestionResult, SecurityEventBase (+6 more)

### Community 47 - "Project Context: Multi-Agent AI Security Operations Center (SOC)"
Cohesion: 0.10
Nodes (20): 10. Automated Test Results & Verification, 11. Known Limitations & Environmental Constraints, 1. Project Identification & Metadata, 2. Problem Statement & System Purpose, 3. End-to-End Operational Lifecycle & Flow, 5.1 Dual-Layer Detection Model, 5.2 Authentic Dataset Provenance, 5.3 Leak-Free Preprocessing Pipeline (`ml/preprocessing/pipeline.py`) (+12 more)

### Community 48 - "KNOWN LIMITATIONS & ENVIRONMENTAL CONSTRAINTS"
Cohesion: 0.11
Nodes (18): 1.1 Technical Constraint Description, 1.2 Status & Academic Honesty Verdict, 1.3 Verified Workaround & Demonstration, 1.4 Workstation Requirements for Full Three-VM Lab, 1. Hardware Virtualization & Three-VM Virtual Lab Constraint, 2.1 Technical Constraint Description, 2.2 Mitigation, 2. Actual Guest Firewall Containment vs Simulated Dry-Run (+10 more)

### Community 49 - "KNOWN LIMITATIONS & ENVIRONMENTAL CONSTRAINTS"
Cohesion: 0.11
Nodes (18): 1.1 Technical Constraint Description, 1.2 Status & Academic Honesty Verdict, 1.3 Verified Workaround & Demonstration, 1.4 Workstation Requirements for Full Three-VM Lab, 1. Hardware Virtualization & Three-VM Virtual Lab Constraint, 2.1 Technical Constraint Description, 2.2 Mitigation, 2. Actual Guest Firewall Containment vs Simulated Dry-Run (+10 more)

### Community 50 - "datetime"
Cohesion: 0.19
Nodes (7): control_demo_stream(), toggle_collector(), websocket_endpoint(), BaseCollector, stream_db(), test_stream_control_endpoint_lifecycle(), exercise_endpoint()

### Community 51 - "agents.py"
Cohesion: 0.18
Nodes (7): get_agent_findings(), get_agent_runs(), get_agents_status(), trigger_agent_execution(), AgentExecution, CollectorConfig, UTCDateTime

### Community 52 - "threat_intel_service.py"
Cohesion: 0.27
Nodes (8): list_indicators(), lookup_threat(), ThreatIndicator, ThreatIndicatorResponse, Config, ThreatLookupRequest, ThreatLookupResponse, lookup_indicator()

### Community 53 - "ref_react_router_dom"
Cohesion: 0.13
Nodes (17): ActivityChart(), CustomTooltip(), FILTERS, MetricCard(), RecentEvents(), makeSegmentPath(), polarToXY(), RiskGauge() (+9 more)

### Community 54 - "Running the Multi-Agent AI SOC Platform"
Cohesion: 0.06
Nodes (31): ensure_event_processed_at_column(), ensure_schema_migrations(), test_existing_event_migration_preserves_historical_timestamp(), Active dashboard, Command Centre graphs, Command Centre update stability, Connected cloud VM lab — 14 November 2026, Deployed files (+23 more)

### Community 55 - "api/evaluation.py"
Cohesion: 0.21
Nodes (8): evaluate_dataset(), get_evaluation_run(), list_evaluation_runs(), EvaluationRun, DatasetEvaluationRequest, EvaluationRunResponse, Config, run_dataset_evaluation()

### Community 56 - "Cybersecurity Dataset and Training Audit: Multi-Agent AI SOC"
Cohesion: 0.14
Nodes (13): 1. Required Benchmark Datasets Overview, 2. Dataset 1: UNSW-NB15 Provenance & Verification, 3. Dataset 2: CICIDS2017 Provenance & Verification, 5. Audit Conclusion, A. Official Metadata & Sources, A. Official Metadata & Sources, B. Local Authentic File Inspection, B. Local Authentic File Inspection (+5 more)

### Community 57 - "ref_react"
Cohesion: 0.09
Nodes (11): MetricCardProps, SystemTourModalProps, GLOSSARY, TermTooltipProps, NavSection, SidebarProps, AttackPathGraph(), DashboardLayout() (+3 more)

### Community 58 - "FINAL SOC VERIFICATION & INDEPENDENT AUDIT REPORT"
Cohesion: 0.11
Nodes (17): 1. Executive Summary & Verification Outcomes, 2. Source Code & Test Integrity Confirmation, 3. Investigation of Previous Exit-Code-1 Occurrences, 4. Ten-Agent Independent Verification Matrix, 5. Correlation Requirements Recheck, 6. Machine Learning Model Inference Verification, 7. SOAR Safety, Containment Gating, and Credentials Security, 8. What is Ready for College Project Demonstration vs. Real VM Requirements (+9 more)

### Community 59 - "FRESH ATTACK SIMULATION & DASHBOARD RECONCILIATION REPORT"
Cohesion: 0.12
Nodes (16): 10. Exact Commands to Reproduce the Fresh Test, 1. Original Database Backup Details, 2. Test Environment & Preserved Entities, 3. Initial Clean Database Verification (T0), 6. Duplicate and Replay Verification, 7. Dashboard-to-Database Reconciliation Matrix, 8. Defects Discovered and Resolved, 9. College Demonstration Readiness Checklist (+8 more)

### Community 60 - "SDMCET VII SEMESTER MAJOR PROJECT — FINAL SYNOPSIS COMPLIANCE & ACCEPTANCE REPORT"
Cohesion: 0.14
Nodes (13): 1. Executive Summary & Verdict, 3. Dataset Provenance & Machine Learning Audit, 5. End-to-End Test Execution Summary, 6. How to Run the Application & Verify, 7. Faculty Presentation & Academic Defense Summary, A. Run Full Test Suites, Authentic Datasets Evaluated, B. Train Supervised ML Models on Authentic Datasets (+5 more)

### Community 61 - "Scenario A: SSH Authentication Brute-Force Attack"
Cohesion: 0.14
Nodes (13): 1. Goal, 1. Goal, 1. Goal, 2. Execution from Attacker VM (`192.168.56.20`):, 2. Execution from Attacker VM (`192.168.56.20`):, 2. Execution from Attacker VM (`192.168.56.20`):, 3. Expected Telemetry & SOC Detection:, 3. Expected Telemetry & SOC Detection: (+5 more)

### Community 62 - "1. Synopsis Requirement Acceptance Checklist"
Cohesion: 0.15
Nodes (12): 1.1 Backend Architecture & API Layer, 1.2 Machine Learning & Benchmark Datasets, 1.3 Multi-Agent SOC Architecture (All 10 Agents), 1.5 Frontend Dashboard, 1.6 Three-VM Virtual Enterprise Lab, 1. Synopsis Requirement Acceptance Checklist, 2. Features Verified vs Features Still Pending, 3. Security & Repository Audit (+4 more)

### Community 63 - "1. Synopsis Requirement Acceptance Checklist"
Cohesion: 0.17
Nodes (11): 1.2 Machine Learning & Benchmark Datasets, 1.3 Multi-Agent SOC Architecture (All 10 Agents), 1.5 Frontend Dashboard, 1.6 Three-VM Virtual Enterprise Lab, 1. Synopsis Requirement Acceptance Checklist, 2. Features Verified vs Features Still Pending, 3. Security & Repository Audit, 4. Fresh Clone Setup & Reproduction Commands (+3 more)

### Community 64 - "Correlation.jsx"
Cohesion: 0.24
Nodes (7): CorrelationGraph(), CorrelationResult(), Correlation(), deriveCorrelationData(), utcMilliseconds(), formatSocTimestamp(), formatter

### Community 65 - "ref_lucide_react"
Cohesion: 0.22
Nodes (10): mapBackendIncident(), LLMAnalysis(), DECISION_CARDS, RecommendedActions(), SEVERITY_LEVELS, SeverityCard(), AIAnalysis(), loadBackendIncidents() (+2 more)

### Community 67 - "3. Verified Implementations & Reproducibility"
Cohesion: 0.17
Nodes (11): 1. Executive Summary & Academic Specification, 2. Host Environmental Audit, 3. Verified Implementations & Reproducibility, 3-VM Virtual Lab Acceptance & Environmental Audit Report, 4. Hardware Lab Deployment Guide, A. Vagrantfile Architecture, B. Guest Telemetry Collector Architecture, C. Controlled Attacker Toolkit Safety (+3 more)

### Community 68 - "EventTable.jsx"
Cohesion: 0.25
Nodes (9): EventDetails(), CATEGORIES, EventTable(), STATUS_OPTIONS, SearchInput(), mapBackendEvent(), useLiveEvents(), loadBackendEvents() (+1 more)

### Community 69 - "2. Detailed Test Results & Outputs"
Cohesion: 0.18
Nodes (10): 1. Test Execution Summary, 2.2 Frontend-Backend Integration Test Suite, 2.3 Phase 10 Acceptance Verification, 2.4 Final Acceptance Evidence Audit, 2.5 Dynamic Telemetry Audit, 2.6 Frontend Production Build, 2. Detailed Test Results & Outputs, 3. Real-Time Latency Benchmark Table (+2 more)

### Community 70 - "2. Step-by-Step Deployment Runbook"
Cohesion: 0.18
Nodes (10): 1. Executive Summary & Hardware Requirements, 2. Step-by-Step Deployment Runbook, GENUINE VIRTUAL ENTERPRISE NETWORK LAB — DEPLOYMENT & ACCEPTANCE GUIDE, Minimum Workstation Requirements for Hardware Kernel Virtualization, Step 1: Install Hypervisor & Tooling (PowerShell as Administrator), Step 2: Verify Host-Only Network Adapter, Step 3: Provision the 3 Isolated Guest VMs, Step 4: Start SOC Central Platform on Host (+2 more)

### Community 71 - "2. In-Depth Cross-Questioning of Each Model"
Cohesion: 0.17
Nodes (7): 1. Summary of Evaluated Models & Algorithms, 2. In-Depth Cross-Questioning of Each Model, C. Decision Tree Classifier (Supervised Comparative Baseline), D. Multi-Agent Correlation Algorithm, E. Topological Attack-Path Analysis, F. Calibrated Multi-Factor Risk Engine, Model and Algorithm Audit: Multi-Agent AI SOC

### Community 72 - "MultiAgentPipeline.jsx"
Cohesion: 0.33
Nodes (7): AGENT_METADATA, DEFAULT_AGENT_META, GLOSSARY_TERMS, MultiAgentPipeline(), SeverityBadge(), StatusBadge(), PipelinePage()

### Community 73 - "VirtualLab.jsx"
Cohesion: 0.71
Nodes (4): VMReporting(), isVMConnected(), useVMNodes(), VirtualLab()

### Community 74 - "3. Useful Functionality Acquired from Reference Repository"
Cohesion: 0.20
Nodes (9): 1. Executive Summary, 2. Comprehensive Component Gap Matrix, 3. Useful Functionality Acquired from Reference Repository, 4. Features Preserved Exclusively from Kaveri's Implementation, A. Dataset Cleaning (`clean_dataset.py`), B. Preprocessing Metadata Extraction (`build_preprocessing_metadata.py`), C. Feature Importance Analysis (`feature_importance.py`), D. Continuous Event Stream Replay (`kafka/realtime_producer.py`, `realtime_wrapper.py`) (+1 more)

### Community 76 - "Guest Telemetry Collector Daemon Setup Guide"
Cohesion: 0.22
Nodes (8): 1. Prerequisites on the Guest VM, 2. Quick-Start Execution, 3. Running as a Persistent Systemd Service (Optional), 4. How the Guest Daemon Works, Guest Telemetry Collector Daemon Setup Guide, On Endpoint VM (192.168.56.10):, On Server VM (192.168.56.15):, Running Local Guest-Agent Processes

### Community 77 - "SecurityEventCreate"
Cohesion: 0.22
Nodes (9): reset_lab(), trigger_scenario(), _queue_scenario_events(), reset_demo_lab(), run_scenario_1_brute_force(), run_scenario_2_network_scan(), run_scenario_3_account_compromise(), run_scenario_4_endpoint_malware() (+1 more)

### Community 78 - "os"
Cohesion: 0.07
Nodes (13): load_or_create_reference_dataset(), extract_feature_importance(), compute_file_sha256(), download_dataset(), get_dataset_path(), load_genuine_dataset(), validate_dataset_schema(), build_preprocessing_metadata() (+5 more)

### Community 80 - "DATA AND MODEL FLOW ARCHITECTURE"
Cohesion: 0.25
Nodes (7): 1. High-Level Data Lifecycle, 2.1 Zero-Leakage Preprocessing & Training, 2.2 Real-Time Online Inference Flow, 2. Machine Learning Training & Inference Flow, 3. Real-Time Telemetry & Collector Architecture, 4. 0–100 Incident Risk Scoring Formula, DATA AND MODEL FLOW ARCHITECTURE

### Community 81 - "5. Incident Response & SOAR Governance Verification"
Cohesion: 0.40
Nodes (5): 1. Attack-Path DAG Topology, 2. Eight Canonical Root Cause Analysis (RCA) Answers, 3. Policy-Governed SOAR Response Execution, 4. Approval Desk Security Verification, 5. Incident Response & SOAR Governance Verification

### Community 82 - "4. Fresh Attack Simulation Execution"
Cohesion: 0.40
Nodes (5): 4. Fresh Attack Simulation Execution, Stage 1: Brute-Force Authentication Attempt, Stage 2: Suspicious Endpoint Activity, Stage 3: Network Port Sweep Activity, Stage 4: Multi-Stage Privilege Escalation

### Community 97 - "Virtual Enterprise Network Architecture & Lab Topology"
Cohesion: 0.40
Nodes (4): 1. Enterprise Network Lab Topology, 2. IP Addressing & Component Roles, 3. Network Isolation Guarantee, Virtual Enterprise Network Architecture & Lab Topology

### Community 106 - "main.py"
Cohesion: 0.13
Nodes (11): global_websocket_endpoint(), lifespan(), seed_detection_rules(), seed_threat_intelligence(), seed_default_vm_nodes(), db_session(), db_session(), db_session() (+3 more)

### Community 109 - "run_realtime_flow_inference"
Cohesion: 0.21
Nodes (9): extract_flow_features_from_event(), load_persisted_classifier(), run_realtime_flow_inference(), train_and_evaluate_pipeline(), 4. Persisted Model Artifacts & Live Pipeline Integration, Live Ingestion Flow, 5. Bugs Found During Audit & Fixes Applied, B. Random Forest Classifier (Supervised Intrusion Classifier) (+1 more)

### Community 115 - "models/incident.py"
Cohesion: 0.12
Nodes (9): IncidentEvent, evaluate_event_with_rolling_window(), calculate_incident_risk(), test_18_downstream_attack_path_only_on_incident_and_evidence_based(), test_19_downstream_investigation_answers_8_canonical_questions(), test_20_downstream_risk_scoring_stages_and_updates(), test_3_auth_suspicious_successful_login_post_burst(), main() (+1 more)

### Community 124 - "DetectionFinding"
Cohesion: 0.14
Nodes (6): DetectionFinding, analyze_threat_findings(), _call_gemini_api(), _local_cybersecurity_expert_reasoning(), test_23_e2e_ingestion_queue_agent_pipeline_correlation_broadcast(), test_8_correlation_single_raw_event_no_incident()

## Knowledge Gaps
- **40 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SecurityEvent` connect `SecurityEvent` to `test_audit_and_correlation.py`, `incidents.py`, `simulation_service.py`, `detections.py`, `time`, `generate_incident_pdf`, `run_simulation`, `Incident`, `orchestrator.py`, `Frontend API Client (4)`, `LiveDemoStreamCollector`, `Threat Detection & Rules (2)`, `Frontend API Client (5)`, `Test Suite 1: Backend Pytest Unit & Integration Tests`, `SecurityEventCreate`, `datetime`, `agents.py`, `SecurityEventCreate`, `models/incident.py`, `DetectionFinding`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Are the 41 inferred relationships involving `SecurityEvent` (e.g. with `AnomalyDetectionAgent` and `AttackPathAgent`) actually correct?**
  _`SecurityEvent` has 41 INFERRED edges - model-reasoned connections that need verification._
- **Should `Agent Orchestration & Analysis` be split into smaller, more focused modules?**
  _Cohesion score 0.05638095238095238 - nodes in this community are weakly interconnected._
- **Why does `RealtimeEventQueue` connect `Threat Detection & Rules (2)` to `SecurityEvent`, `orchestrator.py`, `KNOWN LIMITATIONS & ENVIRONMENTAL CONSTRAINTS`, `datetime`, `4. Fresh Attack Simulation Execution`, `KNOWN LIMITATIONS & ENVIRONMENTAL CONSTRAINTS`, `FINAL SOC VERIFICATION & INDEPENDENT AUDIT REPORT`, `FRESH ATTACK SIMULATION & DASHBOARD RECONCILIATION REPORT`, `1. Synopsis Requirement Acceptance Checklist`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Are the 60 inferred relationships involving `Incident` (e.g. with `AttackPathAgent` and `CorrelationAgent`) actually correct?**
  _`Incident` has 60 INFERRED edges - model-reasoned connections that need verification._
- **Should `test_audit_and_correlation.py` be split into smaller, more focused modules?**
  _Cohesion score 0.10352941176470588 - nodes in this community are weakly interconnected._
- **Why does `MultiAgentSOCEngine` connect `orchestrator.py` to `Test Suite 1: Backend Pytest Unit & Integration Tests`, `test_audit_and_correlation.py`, `SecurityEvent`, `incidents.py`, `2. In-Depth Cross-Questioning of Each Model`, `Incident`, `os`, `DATA AND MODEL FLOW ARCHITECTURE`, `datetime`, `models/incident.py`, `agents.py`, `Threat Detection & Rules (2)`, `DetectionFinding`, `1. Synopsis Requirement Acceptance Checklist`, `1. Synopsis Requirement Acceptance Checklist`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._