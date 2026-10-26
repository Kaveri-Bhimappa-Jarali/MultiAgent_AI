import os
import joblib
import numpy as np
from typing import List, Dict, Any, Tuple
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import RobustScaler
from datetime import datetime

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
MODEL_PATH = os.path.join(MODEL_DIR, "anomaly_isolation_forest.joblib")
SCALER_PATH = os.path.join(MODEL_DIR, "anomaly_scaler.joblib")

class AnomalyDetectionEngine:
    def __init__(self):
        self.model_version = "v1.2.0-IsolationForest"
        self.model: IsolationForest = None
        self.scaler: RobustScaler = None
        self.is_trained = False
        self._load_or_initialize_model()

    def _extract_features(self, event: Any) -> np.ndarray:
        """
        Extract numerical and statistical features:
        1. port: destination port (0 if None)
        2. is_priv_port: 1 if port < 1024 else 0
        3. hour: timestamp hour (0-23)
        4. is_off_hours: 1 if hour < 7 or hour > 19 else 0
        5. cmd_len: len(command_line or '')
        6. is_failed: 1 if 'fail' or 'err' in action or payload else 0
        7. sev_weight: INFO=0, LOW=1, MEDIUM=2, HIGH=3, CRITICAL=4
        """
        port = getattr(event, 'destination_port', 0) or 0
        is_priv = 1.0 if (port and port < 1024) else 0.0
        
        ts = getattr(event, 'timestamp', None)
        if isinstance(ts, datetime):
            hour = float(ts.hour)
        else:
            hour = 12.0
            
        off_hours = 1.0 if (hour < 7 or hour > 19) else 0.0
        
        cmd = getattr(event, 'command_line', '') or ''
        cmd_len = float(len(cmd))
        
        action = (getattr(event, 'file_action', '') or '').lower()
        payload = (getattr(event, 'raw_payload', '') or '').lower()
        is_failed = 1.0 if ("fail" in action or "fail" in payload or "err" in payload) else 0.0
        
        sev = (getattr(event, 'severity', 'INFO') or 'INFO').upper()
        sev_map = {"INFO": 0.0, "LOW": 1.0, "MEDIUM": 2.0, "HIGH": 3.0, "CRITICAL": 4.0}
        sev_weight = sev_map.get(sev, 0.0)

        return np.array([port, is_priv, hour, off_hours, cmd_len, is_failed, sev_weight], dtype=float)

    def _load_or_initialize_model(self):
        os.makedirs(MODEL_DIR, exist_ok=True)
        if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
                self.scaler = joblib.load(SCALER_PATH)
                self.is_trained = True
                return
            except Exception as e:
                print(f"Failed to load cached anomaly model: {e}")

        # Train initial robust baseline model on representative normal enterprise telemetry
        self._train_baseline_synthetic()

    def _train_baseline_synthetic(self):
        """
        Train on 1,500 representative baseline normal events:
        - Regular business hours (08:00 - 18:00)
        - Standard enterprise ports (80, 443, 53, 389, 445, 22)
        - Low error rates and typical command lengths
        """
        np.random.seed(42)
        n_samples = 1500
        
        normal_ports = np.random.choice([80, 443, 53, 8080, 22, 389], size=n_samples)
        normal_is_priv = (normal_ports < 1024).astype(float)
        normal_hours = np.random.normal(loc=13.0, scale=2.5, size=n_samples).clip(8, 18)
        normal_off_hours = np.zeros(n_samples)
        normal_cmd_len = np.random.exponential(scale=25, size=n_samples).clip(0, 100)
        normal_failed = (np.random.rand(n_samples) < 0.02).astype(float)
        normal_sev = np.random.choice([0.0, 1.0], size=n_samples, p=[0.9, 0.1])
        
        X_train = np.column_stack([
            normal_ports,
            normal_is_priv,
            normal_hours,
            normal_off_hours,
            normal_cmd_len,
            normal_failed,
            normal_sev
        ])
        
        self.scaler = RobustScaler()
        X_scaled = self.scaler.fit_transform(X_train)
        
        self.model = IsolationForest(
            n_estimators=100,
            contamination=0.03,
            random_state=42
        )
        self.model.fit(X_scaled)
        self.is_trained = True
        
        # Save artifacts
        try:
            joblib.dump(self.model, MODEL_PATH)
            joblib.dump(self.scaler, SCALER_PATH)
        except Exception as e:
            print(f"Failed to save baseline anomaly model: {e}")

    def score_event(self, event: Any) -> Tuple[bool, float, List[str]]:
        """
        Performs anomaly inference.
        Returns:
            is_anomaly: bool
            anomaly_score: float (0.0 to 100.0)
            explainable_indicators: List[str]
        """
        features = self._extract_features(event).reshape(1, -1)
        scaled = self.scaler.transform(features)
        
        raw_pred = self.model.predict(scaled)[0]  # 1 for normal, -1 for anomaly
        decision_val = self.model.decision_function(scaled)[0]  # lower = more anomalous
        
        # Normalize decision function to 0-100 anomaly scale
        # decision_function is roughly between -0.5 and 0.5
        norm_score = float(np.clip((0.2 - decision_val) * 100, 0, 100))
        is_anomaly = bool(raw_pred == -1 or norm_score > 60)
        
        indicators = []
        if features[0][3] == 1.0:
            indicators.append(f"Event observed during off-hours (Hour: {int(features[0][2])}:00 UTC)")
        if features[0][4] > 120:
            indicators.append(f"Unusually long command-line invocation ({int(features[0][4])} characters)")
        if features[0][5] == 1.0:
            indicators.append("Event contains error/failure indicators in execution payload")
        if features[0][6] >= 3.0:
            indicators.append(f"High base severity classification assigned ({getattr(event, 'severity', 'HIGH')})")
        if features[0][0] > 10000:
            indicators.append(f"High non-standard destination port probed (Port {int(features[0][0])})")

        if not indicators and is_anomaly:
            indicators.append("Multivariate feature distance deviates significantly from normal enterprise baseline")

        return is_anomaly, round(norm_score, 2), indicators

anomaly_engine = AnomalyDetectionEngine()
