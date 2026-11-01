import os
import sys
from datetime import datetime, timezone

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.api.responses import router as responses_router
from app.api.virtual_lab import router as virtual_lab_router
from app.database import Base, get_db
from app.models.audit import AuditLog
from app.models.incident import Incident
from app.models.response import ResponseAction, VerificationResult
from app.models.vm_node import VMAction, VMNode
from app.models.user import User
from app.services.auth_service import get_current_user


@pytest.fixture
def soar_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    test_session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    app = FastAPI()
    app.include_router(responses_router, prefix="/api")
    app.include_router(virtual_lab_router, prefix="/api")

    def override_db():
        with test_session() as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: User(
        id=1,
        username="admin",
        role="SOC Admin",
        is_active=True,
    )
    client = TestClient(app)
    yield client, test_session, app
    app.dependency_overrides.clear()
    engine.dispose()


def _create_action(session_factory, action_type: str, target: str) -> str:
    now = datetime.now(timezone.utc)
    with session_factory() as db:
        incident = Incident(
            incident_id=f"INC-{action_type}",
            title="SOAR simulation test",
            severity="HIGH",
            risk_score=90,
            status="INVESTIGATING",
            response_status="PENDING_APPROVAL",
            first_seen=now,
            last_seen=now,
            affected_users=[target] if action_type == "DISABLE_USER" else [],
            affected_hosts=[target] if action_type == "ISOLATE_ENDPOINT" else [],
            affected_ips=[target] if action_type == "BLOCK_IP" else [],
        )
        db.add(incident)
        db.flush()
        action = ResponseAction(
            action_id=f"ACT-{action_type}",
            incident_id=incident.incident_id,
            action_type=action_type,
            target_type={
                "BLOCK_IP": "IP",
                "ISOLATE_ENDPOINT": "ENDPOINT",
                "DISABLE_USER": "USER",
            }[action_type],
            target_value=target,
            reason="SOAR policy test",
            expected_effect=f"Expected effect for {action_type}",
            status="PENDING_APPROVAL",
            is_dry_run=True,
            requires_approval=True,
            created_at=now,
        )
        db.add(action)
        db.commit()
        return action.action_id


@pytest.mark.parametrize(
    ("action_type", "target"),
    [
        ("BLOCK_IP", "203.0.113.42"),
        ("ISOLATE_ENDPOINT", "vm-endpoint-01"),
        ("DISABLE_USER", "test.user"),
    ],
)
def test_simulation_records_independent_evidence_without_system_changes(
    soar_client, action_type, target
):
    client, session_factory, _ = soar_client
    action_id = _create_action(session_factory, action_type, target)

    response = client.post(f"/api/responses/{action_id}/simulate")

    assert response.status_code == 200
    assert response.json()["status"] == "SIMULATED"
    assert response.json()["execution_result"]["actual_system_changes"] is False
    assert response.json()["execution_result"]["execution_dispatched"] is False
    with session_factory() as db:
        action = db.query(ResponseAction).filter_by(action_id=action_id).one()
        incident = db.query(Incident).filter_by(incident_id=action.incident_id).one()
        verification = db.query(VerificationResult).filter_by(action_id=action_id).one()
        assert action.status == "SIMULATED"
        assert incident.status == "INVESTIGATING"
        assert incident.response_status == "PENDING_APPROVAL"
        assert db.query(VMAction).count() == 0
        assert db.query(VMNode).count() == 0
        assert verification.verification_status == "SIMULATED"
        assert "not actual containment" in verification.evidence_summary.lower()
        assert all(check["passed"] for check in verification.checks_performed)
        assert db.query(AuditLog).filter_by(action="SIMULATE_RESPONSE_ACTION").count() == 1


def test_approval_requires_authenticated_soc_admin_and_audits_denial(soar_client):
    client, session_factory, app = soar_client
    action_id = _create_action(session_factory, "BLOCK_IP", "203.0.113.43")

    app.dependency_overrides[get_current_user] = lambda: User(
        id=2,
        username="analyst",
        role="SOC Analyst",
        is_active=True,
    )
    denied = client.post(f"/api/responses/{action_id}/approve")
    assert denied.status_code == 403
    with session_factory() as db:
        action = db.query(ResponseAction).filter_by(action_id=action_id).one()
        assert action.status == "PENDING_APPROVAL"
        assert db.query(AuditLog).filter_by(
            action="APPROVE_RESPONSE_ACTION_DENIED",
            actor="analyst",
            status="FAILED",
        ).count() == 1

    app.dependency_overrides.pop(get_current_user)
    unauthenticated = client.post(f"/api/responses/{action_id}/approve")
    assert unauthenticated.status_code == 401


def test_admin_approval_only_changes_approval_state(soar_client):
    client, session_factory, _ = soar_client
    action_id = _create_action(session_factory, "ISOLATE_ENDPOINT", "vm-endpoint-01")

    response = client.post(f"/api/responses/{action_id}/approve")

    assert response.status_code == 200
    assert response.json()["status"] == "APPROVED"
    assert response.json()["approved_by"] == "admin"
    assert response.json()["execution_result"] is None
    with session_factory() as db:
        action = db.query(ResponseAction).filter_by(action_id=action_id).one()
        assert db.query(VMAction).count() == 0
        assert db.query(VerificationResult).count() == 0
        assert db.query(AuditLog).filter_by(action="APPROVE_RESPONSE_ACTION").count() == 1


def test_each_simulation_creates_a_separate_verification_log_entry(soar_client):
    client, session_factory, _ = soar_client
    action_id = _create_action(session_factory, "BLOCK_IP", "203.0.113.44")

    first = client.post(f"/api/responses/{action_id}/simulate")
    second = client.post(f"/api/responses/{action_id}/simulate")

    assert first.status_code == second.status_code == 200
    with session_factory() as db:
        results = db.query(VerificationResult).filter_by(action_id=action_id).all()
        assert len(results) == 2
        assert len({result.verification_id for result in results}) == 2
        assert all(result.verification_status == "SIMULATED" for result in results)


def test_execute_dry_run_alias_cannot_dispatch_or_mark_incident_contained(soar_client):
    client, session_factory, _ = soar_client
    action_id = _create_action(session_factory, "DISABLE_USER", "test.user")

    response = client.post(f"/api/responses/{action_id}/execute", json={"dry_run": True})

    assert response.status_code == 200
    assert response.json()["status"] == "SIMULATED"
    with session_factory() as db:
        action = db.query(ResponseAction).filter_by(action_id=action_id).one()
        incident = db.query(Incident).filter_by(incident_id=action.incident_id).one()
        assert db.query(VMAction).count() == 0
        assert incident.status == "INVESTIGATING"
        assert db.query(VerificationResult).filter_by(
            action_id=action_id,
            verification_status="SIMULATED",
        ).count() == 1


def test_real_dispatch_waits_for_matching_registered_lab_endpoint(soar_client):
    client, session_factory, _ = soar_client
    action_id = _create_action(session_factory, "ISOLATE_ENDPOINT", "vm-endpoint-real")
    with session_factory() as db:
        db.add(VMNode(
            vm_id="vm-endpoint-real",
            name="Registered Test Endpoint",
            role="ENDPOINT",
            ip_address="192.0.2.12",
            api_key="TEST-REAL-KEY",
        ))
        db.commit()

    approved = client.post(f"/api/responses/{action_id}/approve")
    assert approved.status_code == 200
    dispatched = client.post(
        f"/api/responses/{action_id}/execute",
        json={"dry_run": False},
    )
    assert dispatched.status_code == 200
    assert dispatched.json()["status"] == "PENDING_VERIFICATION"

    with session_factory() as db:
        action = db.query(ResponseAction).filter_by(action_id=action_id).one()
        vm_action = db.query(VMAction).one()
        incident = db.query(Incident).filter_by(incident_id=action.incident_id).one()
        result = db.query(VerificationResult).filter_by(action_id=action_id).one()
        assert vm_action.status == "PENDING_VM_PULL"
        assert action.execution_result["vm_action_id"] == vm_action.action_id
        assert incident.status == "INVESTIGATING"
        assert result.verification_status == "PENDING_VERIFICATION"


def test_guest_simulation_result_requires_vm_auth_and_is_not_containment(soar_client):
    client, session_factory, _ = soar_client
    now = datetime.now(timezone.utc)
    with session_factory() as db:
        incident = Incident(
            incident_id="INC-GUEST-SIM",
            title="Guest simulation callback test",
            severity="HIGH",
            risk_score=90,
            status="INVESTIGATING",
            response_status="PENDING_VERIFICATION",
            first_seen=now,
            last_seen=now,
        )
        db.add(incident)
        db.flush()
        node = VMNode(
            vm_id="vm-endpoint-test",
            name="Test Endpoint",
            role="ENDPOINT",
            ip_address="192.0.2.10",
            api_key="TEST-VM-KEY",
        )
        db.add(node)
        db.flush()
        vm_action = VMAction(
            action_id="VMACT-GUEST-SIM",
            incident_id=incident.incident_id,
            vm_id=node.vm_id,
            action_type="ISOLATE_ENDPOINT",
            target_value=node.vm_id,
            command_to_run="iptables -P INPUT DROP",
            status="PENDING_VM_PULL",
        )
        db.add(vm_action)
        response_action = ResponseAction(
            action_id="ACT-GUEST-SIM",
            incident_id=incident.incident_id,
            action_type="ISOLATE_ENDPOINT",
            target_type="ENDPOINT",
            target_value=node.vm_id,
            reason="Guest simulation test",
            expected_effect="Restrict endpoint network access",
            status="PENDING_VERIFICATION",
            is_dry_run=False,
            requires_approval=True,
            execution_result={"vm_action_id": vm_action.action_id, "execution_dispatched": True},
        )
        db.add(response_action)
        db.commit()

    callback = "/api/vm/actions/VMACT-GUEST-SIM/result"
    payload = {
        "success": True,
        "simulated": True,
        "actual_execution": False,
        "stdout": "[SIMULATED ONLY] No host command was run",
    }
    assert client.post(callback, json=payload).status_code == 401
    response = client.post(callback, json=payload, headers={"X-VM-Key": "TEST-VM-KEY"})
    assert response.status_code == 200
    assert response.json()["action_status"] == "SIMULATED_ON_VM"

    with session_factory() as db:
        action = db.query(ResponseAction).filter_by(action_id="ACT-GUEST-SIM").one()
        result = db.query(VerificationResult).filter_by(action_id=action.action_id).one()
        incident = db.query(Incident).filter_by(incident_id=action.incident_id).one()
        assert action.status == "SIMULATED"
        assert incident.status == "INVESTIGATING"
        assert result.verification_status == "SIMULATED"
        assert "not actual containment" in result.evidence_summary.lower()

    poll = client.get("/api/vm/actions/pending?vm_id=vm-endpoint-test")
    assert poll.status_code == 401


def test_vm_action_dispatch_requires_admin_and_rejects_custom_commands(soar_client):
    client, session_factory, app = soar_client
    with session_factory() as db:
        db.add(VMNode(
            vm_id="vm-endpoint-create",
            name="Create Test Endpoint",
            role="ENDPOINT",
            ip_address="192.0.2.11",
            api_key="TEST-CREATE-KEY",
        ))
        db.commit()

    app.dependency_overrides[get_current_user] = lambda: User(
        id=2,
        username="analyst",
        role="SOC Analyst",
        is_active=True,
    )
    denied = client.post("/api/vm/actions/create", json={
        "vm_id": "vm-endpoint-create",
        "action_type": "ISOLATE_ENDPOINT",
        "target_value": "vm-endpoint-create",
    })
    assert denied.status_code == 403

    app.dependency_overrides[get_current_user] = lambda: User(
        id=1,
        username="admin",
        role="SOC Admin",
        is_active=True,
    )
    custom_command = client.post("/api/vm/actions/create", json={
        "vm_id": "vm-endpoint-create",
        "action_type": "ISOLATE_ENDPOINT",
        "target_value": "vm-endpoint-create",
        "command": "echo unsafe",
    })
    assert custom_command.status_code == 400
    with session_factory() as db:
        assert db.query(VMAction).count() == 0
