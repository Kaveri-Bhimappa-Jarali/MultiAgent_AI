import sys
sys.path.insert(0, '.')
sys.path.insert(0, 'backend')
import sqlite3
from scripts.clean_test_database import clean_database

clean_database('soc_enterprise.db')

from app.database import engine, Base, SessionLocal
from app.services.auth_service import seed_default_users
from app.services.detection_service import seed_detection_rules
from app.services.threat_intel_service import seed_threat_intelligence
from app.services.vm_service import seed_default_vm_nodes
from app.services.database_migrations import ensure_event_processed_at_column

Base.metadata.create_all(bind=engine)
ensure_event_processed_at_column(engine)
db = SessionLocal()
seed_default_users(db)
seed_detection_rules(db)
seed_threat_intelligence(db)
seed_default_vm_nodes(db)
db.close()

conn = sqlite3.connect('soc_enterprise.db')
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in c.fetchall() if not r[0].startswith('sqlite_')]
print('\n=== TABLE COUNTS AFTER SEEDING ===')
for t in sorted(tables):
    c.execute(f"SELECT COUNT(*) FROM `{t}`")
    print(f'{t}: {c.fetchone()[0]}')
conn.close()

# Now test what the API returns on clean state:
from app.api.dashboard import get_dashboard_summary
from app.api.incidents import list_incidents
from app.api.agents import get_agents_status, get_agent_findings

db = SessionLocal()
try:
    summary = get_dashboard_summary(db=db)
    print('\n=== DASHBOARD SUMMARY ON CLEAN DB ===')
    print('total_events:', summary.metrics.total_events)
    print('open_incidents:', summary.metrics.open_incidents)
    print('critical_high_incidents:', summary.metrics.critical_high_incidents)
    print('actions_pending_approval:', summary.metrics.actions_pending_approval)

    incidents = list_incidents(severity=None, status=None, is_simulated=None, limit=50, db=db)
    print('\n=== INCIDENTS COUNT ===')
    print('incidents:', len(incidents))

    statuses = get_agents_status(db=db)
    total_findings = sum(s.total_findings for s in statuses)
    print('\n=== AGENT STATUSES ===')
    print('total_agent_findings across all agents:', total_findings)
    corr_agent = next((s for s in statuses if s.name == 'Correlation Agent'), None)
    if corr_agent:
        print('Correlation Agent findings:', corr_agent.total_findings)

    findings = get_agent_findings(uncorrelated=None, agent_name=None, incident_id=None, limit=50, db=db)
    print('\n=== AGENT FINDINGS ===')
    print('findings count:', len(findings))
finally:
    db.close()
