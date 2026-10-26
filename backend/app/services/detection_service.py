from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
import uuid
import json

from app.models.detection import DetectionRule, DetectionFinding
from app.models.event import SecurityEvent
from app.models.threat_intel import ThreatIndicator

DEFAULT_RULES = [
    {
        "rule_id": "RULE-AUTH-001",
        "name": "Repeated Failed Login Attempts (Brute Force)",
        "description": "Detects multiple consecutive authentication failures within a short time window from a single IP or user account.",
        "category": "Authentication",
        "severity": "HIGH",
        "mitre_technique": "T1110",
        "threshold": 3,
        "time_window_seconds": 300,
        "conditions": {
            "event_type": "authentication",
            "file_action": "FAILED"  # or severity >= MEDIUM or status failed
        },
        "enabled": True
    },
    {
        "rule_id": "RULE-AUTH-002",
        "name": "Successful Login Post Failure Burst (Account Takeover)",
        "description": "Detects a successful authentication event immediately following multiple failed login attempts on the same account.",
        "category": "Authentication",
        "severity": "CRITICAL",
        "mitre_technique": "T1078",
        "threshold": 1,
        "time_window_seconds": 600,
        "conditions": {
            "event_type": "authentication",
            "file_action": "SUCCESS_POST_BURST"
        },
        "enabled": True
    },
    {
        "rule_id": "RULE-NET-001",
        "name": "Network Scanning & Port Sweeping",
        "description": "Detects a single source address establishing multiple rapid connections across diverse destination ports.",
        "category": "Network",
        "severity": "MEDIUM",
        "mitre_technique": "T1046",
        "threshold": 5,
        "time_window_seconds": 180,
        "conditions": {
            "event_type": "network_connection",
            "protocol": "TCP"
        },
        "enabled": True
    },
    {
        "rule_id": "RULE-NET-002",
        "name": "Suspicious External C2 Communication",
        "description": "Detects outbound traffic to external destinations associated with Command and Control infrastructure.",
        "category": "Network",
        "severity": "CRITICAL",
        "mitre_technique": "T1071",
        "threshold": 1,
        "time_window_seconds": 300,
        "conditions": {
            "event_type": "network_connection",
            "is_c2": True
        },
        "enabled": True
    },
    {
        "rule_id": "RULE-PROC-001",
        "name": "Suspicious Process Execution (LOLBin)",
        "description": "Detects invocation of administrative utilities or script interpreters with suspicious command arguments (e.g. powershell -enc, vssadmin, certutil).",
        "category": "Endpoint",
        "severity": "HIGH",
        "mitre_technique": "T1059.001",
        "threshold": 1,
        "time_window_seconds": 60,
        "conditions": {
            "event_type": "process_execution",
            "suspicious_binaries": ["powershell.exe", "cmd.exe", "certutil.exe", "vssadmin.exe", "mimikatz.exe"]
        },
        "enabled": True
    },
    {
        "rule_id": "RULE-PROC-002",
        "name": "Privilege Escalation Activity",
        "description": "Detects commands attempting token impersonation, sudo execution without password, or adding accounts to local Administrators.",
        "category": "Privilege",
        "severity": "CRITICAL",
        "mitre_technique": "T1548",
        "threshold": 1,
        "time_window_seconds": 120,
        "conditions": {
            "event_type": "privilege_escalation"
        },
        "enabled": True
    },
    {
        "rule_id": "RULE-FILE-001",
        "name": "Abnormal Sensitive File Access",
        "description": "Detects unauthorized access or bulk read operations on sensitive repositories, database backups, or credential caches.",
        "category": "Endpoint",
        "severity": "HIGH",
        "mitre_technique": "T1005",
        "threshold": 2,
        "time_window_seconds": 300,
        "conditions": {
            "event_type": "file_access",
            "sensitive_paths": ["/etc/shadow", "C:\\Windows\\System32\\config\\SAM", "credentials.db", "customers_backup.sql"]
        },
        "enabled": True
    },
    {
        "rule_id": "RULE-FILE-002",
        "name": "Ransomware Inhibit System Recovery Indicator",
        "description": "Detects attempts to delete volume shadow copies or backup storage via vssadmin or wbadmin.",
        "category": "Endpoint",
        "severity": "CRITICAL",
        "mitre_technique": "T1490",
        "threshold": 1,
        "time_window_seconds": 60,
        "conditions": {
            "event_type": "process_execution",
            "command_indicators": ["delete shadows", "resize shadowstorage", "wbadmin delete catalog"]
        },
        "enabled": True
    }
]

def seed_detection_rules(db: Session):
    for r in DEFAULT_RULES:
        existing = db.query(DetectionRule).filter(DetectionRule.rule_id == r["rule_id"]).first()
        if not existing:
            rule = DetectionRule(
                rule_id=r["rule_id"],
                name=r["name"],
                description=r["description"],
                category=r["category"],
                severity=r["severity"],
                mitre_technique=r["mitre_technique"],
                threshold=r["threshold"],
                time_window_seconds=r["time_window_seconds"],
                conditions=r["conditions"],
                enabled=r["enabled"],
                created_at=datetime.now(timezone.utc)
            )
            db.add(rule)
    db.commit()

def evaluate_events_against_rules(db: Session, events: List[SecurityEvent]) -> List[DetectionFinding]:
    """
    Evaluates newly ingested events against active detection rules.
    Returns generated detection findings.
    """
    rules = db.query(DetectionRule).filter(DetectionRule.enabled == True).all()
    findings = []
    
    # Group events by source_ip and username for windowed threshold checks
    by_ip = {}
    by_user = {}
    
    for evt in events:
        if evt.source_ip:
            by_ip.setdefault(evt.source_ip, []).append(evt)
        if evt.username:
            by_user.setdefault(evt.username, []).append(evt)

    for rule in rules:
        cond = rule.conditions
        
        # 1. Repeated Failed Login Attempts (Brute Force)
        if rule.rule_id == "RULE-AUTH-001":
            for ip, ip_events in by_ip.items():
                failed_auths = [
                    e for e in ip_events 
                    if e.event_type == "authentication" and (e.severity in ["MEDIUM", "HIGH", "CRITICAL"] or "failed" in (e.command_line or "").lower() or (e.file_action and "fail" in e.file_action.lower()))
                ]
                if len(failed_auths) >= rule.threshold:
                    event_ids = [e.event_id for e in failed_auths]
                    finding = DetectionFinding(
                        finding_id=f"FIND-{uuid.uuid4().hex[:8].upper()}",
                        rule_id=rule.rule_id,
                        rule_name=rule.name,
                        detection_method="RULE_BASED",
                        severity=rule.severity,
                        confidence=0.92,
                        explanation=f"Observed {len(failed_auths)} consecutive failed authentication attempts from IP address {ip}.",
                        evidence={
                            "event_ids": event_ids,
                            "source_ip": ip,
                            "attempt_count": len(failed_auths),
                            "target_users": list({e.username for e in failed_auths if e.username}),
                            "mitre_technique": rule.mitre_technique
                        },
                        next_step=f"Block source IP {ip} and review affected user accounts for credential stuffing.",
                        timestamp=datetime.now(timezone.utc)
                    )
                    db.add(finding)
                    findings.append(finding)

        # 2. Successful Login Post Failure Burst (Account Takeover)
        elif rule.rule_id == "RULE-AUTH-002":
            for user, user_events in by_user.items():
                auth_evts = [e for e in user_events if e.event_type == "authentication"]
                failed_evts = [
                    e for e in auth_evts
                    if e.severity in ["MEDIUM", "HIGH", "CRITICAL"] or "fail" in (e.file_action or "").lower() or "fail" in (e.command_line or "").lower()
                ]
                success_evts = [
                    e for e in auth_evts
                    if (e.file_action and any(k in e.file_action.upper() for k in ["SUCCESS", "ACCEPTED"])) or
                       (e.severity == "INFO" and any(k in (e.command_line or "").lower() for k in ["success", "accepted", "session opened"]))
                ]
                if len(failed_evts) >= 2 and len(success_evts) >= 1:
                    event_ids = [e.event_id for e in auth_evts]
                    finding = DetectionFinding(
                        finding_id=f"FIND-{uuid.uuid4().hex[:8].upper()}",
                        rule_id=rule.rule_id,
                        rule_name=rule.name,
                        detection_method="RULE_BASED",
                        severity=rule.severity,
                        confidence=0.95,
                        explanation=f"User account '{user}' experienced {len(failed_evts)} failed login attempt(s) followed by successful session authentication.",
                        evidence={
                            "event_ids": event_ids,
                            "compromised_user": user,
                            "prior_failures_count": len(failed_evts),
                            "mitre_technique": rule.mitre_technique
                        },
                        next_step=f"Temporarily disable account '{user}' and revoke active session tokens.",
                        timestamp=datetime.now(timezone.utc)
                    )
                    db.add(finding)
                    findings.append(finding)

        # 3. Network Scanning & Port Sweeping
        elif rule.rule_id == "RULE-NET-001":
            for ip, ip_events in by_ip.items():
                net_events = [e for e in ip_events if e.event_type == "network_connection"]
                ports = {e.destination_port for e in net_events if e.destination_port is not None}
                if len(net_events) >= rule.threshold or len(ports) >= 3:
                    event_ids = [e.event_id for e in net_events]
                    finding = DetectionFinding(
                        finding_id=f"FIND-{uuid.uuid4().hex[:8].upper()}",
                        rule_id=rule.rule_id,
                        rule_name=rule.name,
                        detection_method="RULE_BASED",
                        severity=rule.severity,
                        confidence=0.88,
                        explanation=f"IP address {ip} probed {len(ports)} distinct ports across network assets.",
                        evidence={
                            "event_ids": event_ids,
                            "source_ip": ip,
                            "ports_scanned": sorted(list(ports))[:10],
                            "total_probes": len(net_events),
                            "mitre_technique": rule.mitre_technique
                        },
                        next_step=f"Add perimeter firewall drop rule for {ip}.",
                        timestamp=datetime.now(timezone.utc)
                    )
                    db.add(finding)
                    findings.append(finding)

        # 4. Suspicious External C2 Communication (Dynamic Threat Intelligence Lookup)
        elif rule.rule_id == "RULE-NET-002":
            for evt in events:
                if evt.event_type == "network_connection":
                    ti_match = None
                    if evt.destination_ip:
                        ti_match = db.query(ThreatIndicator).filter(
                            ThreatIndicator.indicator_type == "IP",
                            ThreatIndicator.indicator_value == evt.destination_ip
                        ).first()
                    if not ti_match and evt.source_ip:
                        ti_match = db.query(ThreatIndicator).filter(
                            ThreatIndicator.indicator_type == "IP",
                            ThreatIndicator.indicator_value == evt.source_ip
                        ).first()

                    is_c2 = ti_match is not None or (evt.raw_payload and "c2" in evt.raw_payload.lower())
                    if is_c2:
                        actor = ti_match.threat_actor if ti_match else "Unknown C2 Cluster"
                        tname = ti_match.threat_name if ti_match else "External Command & Control Node"
                        conf = ti_match.confidence if ti_match else 0.90

                        finding = DetectionFinding(
                            finding_id=f"FIND-{uuid.uuid4().hex[:8].upper()}",
                            rule_id=rule.rule_id,
                            rule_name=rule.name,
                            detection_method="RULE_BASED",
                            severity="CRITICAL",
                            confidence=conf,
                            explanation=f"Outbound communication detected to known Command & Control destination {evt.destination_ip or evt.source_ip} ({tname} / {actor}) from {evt.host or 'internal asset'}.",
                            evidence={
                                "event_ids": [evt.event_id],
                                "destination_ip": evt.destination_ip,
                                "source_ip": evt.source_ip,
                                "host": evt.host,
                                "threat_name": tname,
                                "threat_actor": actor,
                                "mitre_technique": rule.mitre_technique
                            },
                            next_step=f"Isolate host {evt.host} and block external address {evt.destination_ip or evt.source_ip}.",
                            timestamp=datetime.now(timezone.utc)
                        )
                        db.add(finding)
                        findings.append(finding)

        # 5. Suspicious Process Execution (LOLBin)
        elif rule.rule_id == "RULE-PROC-001":
            for evt in events:
                if evt.event_type == "process_execution":
                    pname = (evt.process_name or "").lower()
                    cmd = (evt.command_line or "").lower()
                    suspicious = any(b in pname for b in ["powershell", "cmd.exe", "certutil", "vssadmin", "mimikatz"])
                    cmd_flags = any(f in cmd for f in ["-enc", "downloadstring", "urlcache", "shadows", "sekurlsa"])
                    if suspicious and (cmd_flags or evt.severity in ["HIGH", "CRITICAL"]):
                        finding = DetectionFinding(
                            finding_id=f"FIND-{uuid.uuid4().hex[:8].upper()}",
                            rule_id=rule.rule_id,
                            rule_name=rule.name,
                            detection_method="RULE_BASED",
                            severity=rule.severity,
                            confidence=0.93,
                            explanation=f"Suspicious binary execution observed on host {evt.host}: {evt.process_name} with parameters '{evt.command_line}'.",
                            evidence={
                                "event_ids": [evt.event_id],
                                "process_name": evt.process_name,
                                "command_line": evt.command_line,
                                "host": evt.host,
                                "mitre_technique": rule.mitre_technique
                            },
                            next_step=f"Isolate endpoint {evt.host} and inspect parent process tree.",
                            timestamp=datetime.now(timezone.utc)
                        )
                        db.add(finding)
                        findings.append(finding)

        # 6. Privilege Escalation Activity
        elif rule.rule_id == "RULE-PROC-002":
            for evt in events:
                if evt.event_type == "privilege_escalation" or ("sudo" in (evt.command_line or "").lower() and "root" in (evt.raw_payload or "").lower()):
                    finding = DetectionFinding(
                        finding_id=f"FIND-{uuid.uuid4().hex[:8].upper()}",
                        rule_id=rule.rule_id,
                        rule_name=rule.name,
                        detection_method="RULE_BASED",
                        severity=rule.severity,
                        confidence=0.94,
                        explanation=f"Privilege escalation event detected for user {evt.username} on {evt.host}.",
                        evidence={
                            "event_ids": [evt.event_id],
                            "username": evt.username,
                            "host": evt.host,
                            "command": evt.command_line,
                            "mitre_technique": rule.mitre_technique
                        },
                        next_step=f"Revoke elevated privileges for {evt.username} and lock active sessions.",
                        timestamp=datetime.now(timezone.utc)
                    )
                    db.add(finding)
                    findings.append(finding)

        # 7. Sensitive File Access
        elif rule.rule_id == "RULE-FILE-001":
            for evt in events:
                if evt.event_type == "file_access":
                    fpath = (evt.file_path or "").lower()
                    if any(sp.lower() in fpath for sp in ["/etc/shadow", "sam", "backup", "credential", "payroll", "secret"]):
                        finding = DetectionFinding(
                            finding_id=f"FIND-{uuid.uuid4().hex[:8].upper()}",
                            rule_id=rule.rule_id,
                            rule_name=rule.name,
                            detection_method="RULE_BASED",
                            severity=rule.severity,
                            confidence=0.89,
                            explanation=f"Unauthorized access to sensitive file asset '{evt.file_path}' by user {evt.username}.",
                            evidence={
                                "event_ids": [evt.event_id],
                                "file_path": evt.file_path,
                                "username": evt.username,
                                "host": evt.host,
                                "mitre_technique": rule.mitre_technique
                            },
                            next_step=f"Audit access control lists and verify data exfiltration risk.",
                            timestamp=datetime.now(timezone.utc)
                        )
                        db.add(finding)
                        findings.append(finding)

    db.commit()
    return findings

def evaluate_event_with_rolling_window(db: Session, evt: SecurityEvent) -> List[DetectionFinding]:
    """
    Evaluates a single incoming event against detection rules using a dynamic
    rolling time window over historical database records to detect progressive threats
    (e.g. repeated failed logins, port scans) even when events arrive one-by-one.
    """
    from app.services.anomaly_model import anomaly_engine

    rules = db.query(DetectionRule).filter(DetectionRule.enabled == True).all()
    findings: List[DetectionFinding] = []
    now = evt.timestamp or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    def is_finding_duplicated(rule_id: str, pivot_entity: str, window_seconds: int = 60) -> bool:
        recent_cutoff = datetime.now(timezone.utc) - timedelta(seconds=window_seconds)
        existing = db.query(DetectionFinding).filter(
            DetectionFinding.rule_id == rule_id,
            DetectionFinding.timestamp >= recent_cutoff
        ).all()
        for f in existing:
            if pivot_entity in str(f.evidence):
                return True
        return False

    for rule in rules:
        window_start = now - timedelta(seconds=rule.time_window_seconds)

        # 1. Repeated Failed Login Attempts (Brute Force)
        if rule.rule_id == "RULE-AUTH-001" and evt.event_type == "authentication":
            if evt.source_ip:
                # Query historical failed authentication events in the window
                historical_fails = db.query(SecurityEvent).filter(
                    SecurityEvent.event_type == "authentication",
                    SecurityEvent.source_ip == evt.source_ip,
                    SecurityEvent.timestamp >= window_start,
                    SecurityEvent.timestamp <= now,
                    (
                        (SecurityEvent.severity.in_(["MEDIUM", "HIGH", "CRITICAL"])) |
                        (SecurityEvent.file_action.ilike("%fail%")) |
                        (SecurityEvent.command_line.ilike("%fail%")) |
                        (SecurityEvent.raw_payload.ilike("%fail%"))
                    )
                ).all()

                if len(historical_fails) >= rule.threshold:
                    if not is_finding_duplicated(rule.rule_id, evt.source_ip, window_seconds=45):
                        event_ids = [e.event_id for e in historical_fails]
                        finding = DetectionFinding(
                            finding_id=f"FIND-{uuid.uuid4().hex[:8].upper()}",
                            rule_id=rule.rule_id,
                            rule_name=rule.name,
                            detection_method="RULE_BASED",
                            severity=rule.severity,
                            confidence=0.92,
                            explanation=f"Observed {len(historical_fails)} consecutive failed authentication attempts from IP address {evt.source_ip} within rolling window of {rule.time_window_seconds}s.",
                            evidence={
                                "event_ids": event_ids,
                                "source_ip": evt.source_ip,
                                "attempt_count": len(historical_fails),
                                "target_users": list({e.username for e in historical_fails if e.username}),
                                "mitre_technique": rule.mitre_technique
                            },
                            next_step=f"Block source IP {evt.source_ip} and review targeted accounts for credential stuffing.",
                            timestamp=datetime.now(timezone.utc)
                        )
                        db.add(finding)
                        findings.append(finding)

        # 2. Successful Login Post Failure Burst (Account Takeover)
        elif rule.rule_id == "RULE-AUTH-002" and evt.event_type == "authentication":
            is_success = (
                (evt.file_action and any(k in evt.file_action.upper() for k in ["SUCCESS", "ACCEPTED"])) or
                (evt.severity == "INFO" and any(k in (evt.command_line or "").lower() for k in ["success", "accepted", "session opened"]))
            )
            if is_success and evt.username:
                # Query recent failures for the same user in dynamic rolling window
                recent_fails = db.query(SecurityEvent).filter(
                    SecurityEvent.event_type == "authentication",
                    SecurityEvent.username == evt.username,
                    SecurityEvent.timestamp >= window_start,
                    SecurityEvent.timestamp < now,
                    (
                        (SecurityEvent.severity.in_(["MEDIUM", "HIGH", "CRITICAL"])) |
                        (SecurityEvent.file_action.ilike("%fail%")) |
                        (SecurityEvent.command_line.ilike("%fail%"))
                    )
                ).all()

                if len(recent_fails) >= 2 or (evt.file_action and "BURST" in evt.file_action.upper()):
                    if not is_finding_duplicated(rule.rule_id, evt.username, window_seconds=60):
                        event_ids = [e.event_id for e in recent_fails] + [evt.event_id]
                        finding = DetectionFinding(
                            finding_id=f"FIND-{uuid.uuid4().hex[:8].upper()}",
                            rule_id=rule.rule_id,
                            rule_name=rule.name,
                            detection_method="RULE_BASED",
                            severity=rule.severity,
                            confidence=0.95,
                            explanation=f"User account '{evt.username}' successfully authenticated following {len(recent_fails)} failed login attempts in rolling window.",
                            evidence={
                                "event_ids": event_ids,
                                "compromised_user": evt.username,
                                "prior_failures": len(recent_fails),
                                "mitre_technique": rule.mitre_technique
                            },
                            next_step=f"Temporarily disable account '{evt.username}' and revoke active session tokens.",
                            timestamp=datetime.now(timezone.utc)
                        )
                        db.add(finding)
                        findings.append(finding)

        # 3. Network Scanning & Port Sweeping
        elif rule.rule_id == "RULE-NET-001" and evt.event_type == "network_connection":
            if evt.source_ip:
                recent_conns = db.query(SecurityEvent).filter(
                    SecurityEvent.event_type == "network_connection",
                    SecurityEvent.source_ip == evt.source_ip,
                    SecurityEvent.timestamp >= window_start,
                    SecurityEvent.timestamp <= now
                ).all()

                ports = {e.destination_port for e in recent_conns if e.destination_port is not None}
                if len(recent_conns) >= rule.threshold or len(ports) >= 3:
                    if not is_finding_duplicated(rule.rule_id, evt.source_ip, window_seconds=45):
                        event_ids = [e.event_id for e in recent_conns]
                        finding = DetectionFinding(
                            finding_id=f"FIND-{uuid.uuid4().hex[:8].upper()}",
                            rule_id=rule.rule_id,
                            rule_name=rule.name,
                            detection_method="RULE_BASED",
                            severity=rule.severity,
                            confidence=0.89,
                            explanation=f"Source IP {evt.source_ip} probed {len(ports)} distinct ports across network assets ({len(recent_conns)} connection probes).",
                            evidence={
                                "event_ids": event_ids,
                                "source_ip": evt.source_ip,
                                "ports_scanned": sorted(list(ports))[:10],
                                "total_probes": len(recent_conns),
                                "mitre_technique": rule.mitre_technique
                            },
                            next_step=f"Deploy perimeter firewall drop rule for {evt.source_ip}.",
                            timestamp=datetime.now(timezone.utc)
                        )
                        db.add(finding)
                        findings.append(finding)

        # 4. External C2 Communication (Dynamic Threat Intelligence Lookup)
        elif rule.rule_id == "RULE-NET-002" and evt.event_type == "network_connection":
            ti_match = None
            if evt.destination_ip:
                ti_match = db.query(ThreatIndicator).filter(
                    ThreatIndicator.indicator_type == "IP",
                    ThreatIndicator.indicator_value == evt.destination_ip
                ).first()
            if not ti_match and evt.source_ip:
                ti_match = db.query(ThreatIndicator).filter(
                    ThreatIndicator.indicator_type == "IP",
                    ThreatIndicator.indicator_value == evt.source_ip
                ).first()

            is_c2 = ti_match is not None or (evt.raw_payload and "c2" in evt.raw_payload.lower())
            if is_c2:
                actor = ti_match.threat_actor if ti_match else "Unknown C2 Cluster"
                tname = ti_match.threat_name if ti_match else "External Command & Control Destination"
                conf = ti_match.confidence if ti_match else 0.90

                finding = DetectionFinding(
                    finding_id=f"FIND-{uuid.uuid4().hex[:8].upper()}",
                    rule_id=rule.rule_id,
                    rule_name=rule.name,
                    detection_method="RULE_BASED",
                    severity="CRITICAL",
                    confidence=conf,
                    explanation=f"Outbound communication detected to Command & Control destination {evt.destination_ip or evt.source_ip} ({tname} / {actor}) from {evt.host or evt.source_ip}.",
                    evidence={
                        "event_ids": [evt.event_id],
                        "destination_ip": evt.destination_ip,
                        "source_ip": evt.source_ip,
                        "host": evt.host,
                        "threat_name": tname,
                        "threat_actor": actor,
                        "mitre_technique": rule.mitre_technique
                    },
                    next_step=f"Isolate host {evt.host} and block external address {evt.destination_ip or evt.source_ip}.",
                    timestamp=datetime.now(timezone.utc)
                )
                db.add(finding)
                findings.append(finding)

        # 5. Suspicious Process Execution (LOLBin)
        elif rule.rule_id == "RULE-PROC-001" and evt.event_type == "process_execution":
            pname = (evt.process_name or "").lower()
            cmd = (evt.command_line or "").lower()
            suspicious = any(b in pname for b in ["powershell", "cmd.exe", "certutil", "vssadmin", "mimikatz"])
            cmd_flags = any(f in cmd for f in ["-enc", "downloadstring", "urlcache", "shadows", "sekurlsa"])
            if suspicious and (cmd_flags or evt.severity in ["HIGH", "CRITICAL"]):
                finding = DetectionFinding(
                    finding_id=f"FIND-{uuid.uuid4().hex[:8].upper()}",
                    rule_id=rule.rule_id,
                    rule_name=rule.name,
                    detection_method="RULE_BASED",
                    severity=rule.severity,
                    confidence=0.93,
                    explanation=f"Suspicious binary execution observed on host {evt.host}: {evt.process_name} with command '{evt.command_line}'.",
                    evidence={
                        "event_ids": [evt.event_id],
                        "process_name": evt.process_name,
                        "command_line": evt.command_line,
                        "host": evt.host,
                        "mitre_technique": rule.mitre_technique
                    },
                    next_step=f"Isolate endpoint {evt.host} and inspect parent process tree.",
                    timestamp=datetime.now(timezone.utc)
                )
                db.add(finding)
                findings.append(finding)

        # 6. Privilege Escalation
        elif rule.rule_id == "RULE-PROC-002" and (evt.event_type == "privilege_escalation" or "sudo" in (evt.command_line or "").lower()):
            finding = DetectionFinding(
                finding_id=f"FIND-{uuid.uuid4().hex[:8].upper()}",
                rule_id=rule.rule_id,
                rule_name=rule.name,
                detection_method="RULE_BASED",
                severity=rule.severity,
                confidence=0.94,
                explanation=f"Privilege escalation event detected for user '{evt.username}' on host '{evt.host}'.",
                evidence={
                    "event_ids": [evt.event_id],
                    "username": evt.username,
                    "host": evt.host,
                    "command": evt.command_line,
                    "mitre_technique": rule.mitre_technique
                },
                next_step=f"Revoke elevated privileges for '{evt.username}' and lock active sessions.",
                timestamp=datetime.now(timezone.utc)
            )
            db.add(finding)
            findings.append(finding)

        # 7. Sensitive File Access
        elif rule.rule_id == "RULE-FILE-001" and evt.event_type == "file_access":
            fpath = (evt.file_path or "").lower()
            if any(sp in fpath for sp in ["/etc/shadow", "sam", "backup", "credential", "payroll", "secret"]):
                finding = DetectionFinding(
                    finding_id=f"FIND-{uuid.uuid4().hex[:8].upper()}",
                    rule_id=rule.rule_id,
                    rule_name=rule.name,
                    detection_method="RULE_BASED",
                    severity=rule.severity,
                    confidence=0.89,
                    explanation=f"Unauthorized access to sensitive protected file '{evt.file_path}' by user '{evt.username}'.",
                    evidence={
                        "event_ids": [evt.event_id],
                        "file_path": evt.file_path,
                        "username": evt.username,
                        "host": evt.host,
                        "mitre_technique": rule.mitre_technique
                    },
                    next_step=f"Audit access control lists and verify data exfiltration risk.",
                    timestamp=datetime.now(timezone.utc)
                )
                db.add(finding)
                findings.append(finding)

    # 8. Unsupervised Isolation Forest ML Anomaly Detection on incoming event
    try:
        is_anom, anom_score, anom_indicators = anomaly_engine.score_event(evt)
        if (is_anom or anom_score > 68.0) and not is_finding_duplicated("RULE-ANOM-001", evt.event_id, window_seconds=30):
            finding = DetectionFinding(
                finding_id=f"FIND-{uuid.uuid4().hex[:8].upper()}",
                rule_id="RULE-ANOM-001",
                rule_name="Isolation Forest Multivariate Anomaly",
                detection_method="ANOMALY_DETECTION",
                severity="HIGH" if anom_score > 80 else "MEDIUM",
                confidence=round(min(0.95, anom_score / 100), 2),
                explanation=f"Machine learning anomaly model flagged multivariate telemetry deviation (Score: {anom_score}/100) on host {evt.host or 'network'}.",
                evidence={
                    "event_ids": [evt.event_id],
                    "anomaly_score": anom_score,
                    "indicators": anom_indicators,
                    "model_version": anomaly_engine.model_version
                },
                next_step="Correlate with concurrent user host baseline to rule out administrative maintenance.",
                timestamp=datetime.now(timezone.utc)
            )
            db.add(finding)
            findings.append(finding)
    except Exception as e:
        print(f"Error during ML anomaly scoring: {e}")

    db.commit()
    return findings
