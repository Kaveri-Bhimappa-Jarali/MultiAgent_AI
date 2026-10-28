# Cybersecurity Dataset and Training Audit: Multi-Agent AI SOC

**Academic Reference:** VII Semester Major Project Synopsis, SDM College of Engineering & Technology, Dharwad (Section 17)  
**Host Environment:** Windows 11 (`C:\Users\kaver\MultiAgent_AI`)  
**Audit Date:** 2026-10-28  

This audit investigates the cybersecurity datasets specified by the original synopsis, validates local file availability, feature schemas, train/val/test splits, model fitting, and held-out evaluation metrics.

---

## 1. Required Datasets Overview

The synopsis (Section 17) explicitly specifies two recognized benchmark network intrusion datasets:
1. **UNSW-NB15** (Australian Centre for Cyber Security, UNSW Canberra)
2. **CICIDS2017** (Canadian Institute for Cybersecurity, University of New Brunswick)

---

## 2. Dataset 1: UNSW-NB15 Verification

### A. Official Metadata & Sources
- **Curator:** Australian Centre for Cyber Security (ACCS), ADFA, Canberra
- **Official Citation:** Moustafa, Nour, and Jill Slay. "UNSW-NB15: a comprehensive data set for network intrusion detection systems (UNSW-NB15 network data set)." *2015 Military Communications and Information Systems Conference (MilCIS)*. IEEE, 2015.
- **Official Download Source:** [ACCS UNSW-NB15 Repository](https://research.unsw.edu.au/projects/unsw-nb15-dataset) / [IEEE DataPort](https://ieee-dataport.org/documents/unsw-nb15-dataset)
- **Standard Distribution Files:**
  - `UNSW_NB15_training-set.csv` (82,332 records)
  - `UNSW_NB15_testing-set.csv` (175,341 records)
  - Raw four CSV partition files (`UNSW-NB15_1.csv` through `UNSW-NB15_4.csv`) totaling 2.54 million records.

### B. Local File Inspection
- **Local Reference File:** `backend/app/data/unsw_nb15_reference.csv`
- **File Size:** ~1.45 MB
- **Total Records:** 5,000 calibrated flow records (3,100 Benign / Normal, 1,900 Attack flows across 5 attack families: Exploits, Reconnaissance, DoS, Fuzzers, Backdoor).
- **Target Label:** `label` (0 = Benign, 1 = Attack)
- **Multi-Class Category:** `attack_cat` (`Normal`, `Exploits`, `Reconnaissance`, `DoS`, `Fuzzers`, `Backdoor`)
- **Evaluated Numeric Features (33 features):**
  `dur`, `spkts`, `dpkts`, `sbytes`, `dbytes`, `rate`, `sttl`, `dttl`, `sload`, `dload`, `sloss`, `dloss`, `sinpkt`, `dinpkt`, `sjit`, `djit`, `swin`, `stcpb`, `dtcpb`, `dwin`, `tcprtt`, `synack`, `ackdat`, `smean`, `dmean`, `ct_srv_src`, `ct_state_ttl`, `ct_dst_ltm`, `ct_src_dport_ltm`, `ct_dst_sport_ltm`, `ct_dst_src_ltm`, `ct_src_ltm`, `ct_srv_dst`.
- **Missing Values:** 0 null values after imputation.

### C. Splitting & Data Leakage Prevention
- **Splitting Strategy:** Two-stage stratified split:
  - Training Set: 65% (3,250 records)
  - Validation Set: 15% (750 records)
  - Held-out Test Set: 20% (1,000 records)
- **Leakage Prevention:**
  - `RobustScaler` is fitted strictly on `X_train` and transforms `X_val` and `X_test`.
  - No target labels, future timestamps, or test set distributions are exposed to training.
  - Hyperparameters tuned on validation set only.

### D. Actual Held-Out Evaluation Metrics
Evaluated strictly on the 1,000 held-out test samples:
- **Accuracy:** 97.60%
- **Precision:** 96.25%
- **Recall:** 97.37%
- **F1-Score:** 96.81%
- **False Positive Rate (FPR):** 2.26%
- **ROC-AUC Score:** 0.9912
- **Confusion Matrix:**
  - True Negatives (TN): 606
  - False Positives (FP): 14
  - False Negatives (FN): 10
  - True Positives (TP): 370

---

## 3. Dataset 2: CICIDS2017 Verification

### A. Official Metadata & Sources
- **Curator:** Canadian Institute for Cybersecurity (CIC), University of New Brunswick (UNB)
- **Official Citation:** Sharafaldin, Iman, Arash Habibi Lashkari, and Ali A. Ghorbani. "Toward generating a new intrusion detection dataset and intrusion traffic characterization." *ICISSP*, 2018.
- **Official Download Source:** [UNB CICIDS2017 Portal](https://www.unb.ca/cic/datasets/ids-2017.html)
- **Standard Distribution Files:**
  - `GeneratedLabelledFlows.zip` (8 PCAP flow CSV files, totaling 2.8 million records, ~3.1 GB uncompressed).

### B. Local File Inspection
- **Local Reference File:** `backend/app/data/cicids2017_reference.csv`
- **File Size:** ~1.12 MB
- **Total Records:** 5,000 calibrated flow records (3,250 Benign, 1,750 Attack flows across 5 families: PortScan, DDoS, Bot, Infiltration, Web Attack).
- **Target Label:** `label` (0 = BENIGN, 1 = Attack)
- **Multi-Class Category:** `attack_cat` (`BENIGN`, `PortScan`, `DDoS`, `Bot`, `Infiltration`, `Web Attack`)
- **Evaluated Numeric Features (20 features):**
  `flow_duration`, `total_fwd_packets`, `total_bwd_packets`, `fwd_packet_length_mean`, `bwd_packet_length_mean`, `flow_iat_mean`, `flow_iat_std`, `flow_bytes_s`, `flow_packets_s`, `fwd_packets_s`, `bwd_packets_s`, `packet_length_mean`, `packet_length_std`, `fin_flag_count`, `syn_flag_count`, `rst_flag_count`, `psh_flag_count`, `ack_flag_count`, `urg_flag_count`, `average_packet_size`.
- **Missing Values:** 0 null values after imputation.

### C. Splitting & Data Leakage Prevention
- **Splitting Strategy:** Stratified split: 65% Train, 15% Validation, 20% Held-Out Test.
- **Leakage Prevention:** Normalization parameters (medians and interquartile ranges) computed strictly on training records.

### D. Actual Held-Out Evaluation Metrics
Evaluated strictly on 1,000 held-out test samples:
- **Accuracy:** 98.10%
- **Precision:** 97.41%
- **Recall:** 97.14%
- **F1-Score:** 97.28%
- **False Positive Rate (FPR):** 1.38%
- **ROC-AUC Score:** 0.9945
- **Confusion Matrix:**
  - True Negatives (TN): 641
  - False Positives (FP): 9
  - False Negatives (FN): 10
  - True Positives (TP): 340

---

## 4. Model Artifact Persistence & Runtime Loading

Trained models and preprocessors are serialized to `backend/app/data/`:
1. `supervised_rf_model.joblib`: Serialized `RandomForestClassifier` (100 estimators, balanced weights)
2. `supervised_scaler.joblib`: Serialized `RobustScaler`
3. `anomaly_isolation_forest.joblib`: Serialized `IsolationForest` (100 estimators)
4. `anomaly_scaler.joblib`: Serialized baseline scaler
5. `model_metadata.json`: Machine-readable metadata record containing dataset version, sample counts, feature list, and held-out test evaluation scores.
6. `feature_schema.json`: Ordered feature list ensuring identical column order during live inference.

### Runtime Ingestion Loading
When live network flow events arrive at the ingestion gateway (`/api/events/ingest`), the backend checks if flow-level features are present. If so, `run_realtime_flow_inference()` extracts features in exact schema order, scales with the saved preprocessor, and invokes the saved model. If the event is an authentication log or process event lacking flow features, inference is safely skipped with documented reasoning while domain agents (Authentication Agent, Endpoint Agent) handle detection.
