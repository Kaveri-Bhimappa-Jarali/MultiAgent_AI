import time
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.agent import AgentExecution, AgentFinding

class BaseAgent:
    name: str = "BaseAgent"
    role: str = "Security Operations Agent"
    description: str = "Base SOC autonomous agent"

    def __init__(self, db: Session):
        self.db = db
        self.run_id: str = f"RUN-{uuid.uuid4().hex[:8].upper()}"
        self.logs: List[Dict[str, Any]] = []
        self.findings: List[AgentFinding] = []

    def log(self, level: str, message: str, details: Optional[Dict[str, Any]] = None):
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": level.upper(),
            "message": message,
            "details": details or {}
        }
        self.logs.append(entry)

    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Template method that executes the agent's core reasoning logic with full telemetry.
        """
        start_time = datetime.now(timezone.utc)
        start_perf = time.perf_counter()
        
        execution_record = AgentExecution(
            run_id=self.run_id,
            agent_name=self.name,
            status="RUNNING",
            start_time=start_time,
            input_summary=str(context.get("summary", "Standard batch evaluation context")),
            findings_count=0,
            execution_log=self.logs,
            error_message=None
        )
        self.db.add(execution_record)
        self.db.commit()

        try:
            self.log("INFO", f"Agent '{self.name}' started execution cycle")
            results = self.analyze(context)
            duration_ms = int((time.perf_counter() - start_perf) * 1000)
            
            execution_record.status = "COMPLETED"
            execution_record.end_time = datetime.now(timezone.utc)
            execution_record.duration_ms = duration_ms
            execution_record.findings_count = len(self.findings)
            execution_record.execution_log = self.logs
            self.db.commit()
            
            self.log("INFO", f"Agent '{self.name}' completed cycle in {duration_ms}ms with {len(self.findings)} findings")
            return {
                "run_id": self.run_id,
                "agent_name": self.name,
                "status": "COMPLETED",
                "duration_ms": duration_ms,
                "findings": [f.finding_id for f in self.findings],
                "data": results
            }
        except Exception as e:
            duration_ms = int((time.perf_counter() - start_perf) * 1000)
            self.log("ERROR", f"Agent '{self.name}' encountered error: {str(e)}")
            execution_record.status = "FAILED"
            execution_record.end_time = datetime.now(timezone.utc)
            execution_record.duration_ms = duration_ms
            execution_record.execution_log = self.logs
            execution_record.error_message = str(e)
            self.db.commit()
            
            return {
                "run_id": self.run_id,
                "agent_name": self.name,
                "status": "FAILED",
                "duration_ms": duration_ms,
                "error": str(e),
                "findings": [],
                "data": {}
            }

    def record_finding(
        self,
        title: str,
        severity: str,
        confidence: float,
        description: str,
        evidence: Dict[str, Any],
        recommendations: List[str]
    ) -> AgentFinding:
        fid = f"AFIND-{uuid.uuid4().hex[:8].upper()}"
        finding = AgentFinding(
            finding_id=fid,
            run_id=self.run_id,
            agent_name=self.name,
            title=title,
            severity=severity.upper(),
            confidence=confidence,
            description=description,
            evidence=evidence,
            recommendations=recommendations,
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(finding)
        self.db.commit()
        self.findings.append(finding)
        self.log("INFO", f"Registered finding {fid}: {title} [{severity}]")
        return finding

    def analyze(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Subclasses override this to implement domain-specific agent reasoning."""
        raise NotImplementedError
