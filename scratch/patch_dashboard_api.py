path = 'backend/app/api/dashboard.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '    pending_approvals = db.query(ResponseAction).filter(ResponseAction.status.in_(["PENDING_APPROVAL", "RECOMMENDED"])).count()'

replacement = '''    unique_correlated_incidents = db.query(Incident).count()
    active_incidents = db.query(Incident).filter(Incident.status.in_(["NEW", "INVESTIGATING", "CONTAINED"])).count()
    historical_incidents = db.query(Incident).filter(Incident.status.in_(["RESOLVED", "CLOSED"])).count()
    correlation_matches = db.query(Incident).filter(Incident.correlation_reasons.isnot(None)).count()
    correlation_attempts = db.query(AgentExecution).filter(AgentExecution.agent_name.like("%Correlation%")).count()

    pending_approvals = db.query(ResponseAction).filter(ResponseAction.status.in_(["PENDING_APPROVAL", "RECOMMENDED"])).count()'''

if target in content:
    content = content.replace(target, replacement, 1)
else:
    print('Target not found')

target2 = '''        contained_threats=contained_threats,
        verification_failures=verification_failures
    )'''

replacement2 = '''        contained_threats=contained_threats,
        verification_failures=verification_failures,
        unique_correlated_incidents=unique_correlated_incidents,
        correlation_matches=correlation_matches,
        correlation_attempts=correlation_attempts,
        active_incidents=active_incidents,
        historical_incidents=historical_incidents
    )'''

if target2 in content:
    content = content.replace(target2, replacement2, 1)
else:
    print('Target2 not found')

with open(path, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print('Successfully updated backend/app/api/dashboard.py')
