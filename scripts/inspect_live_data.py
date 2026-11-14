import sqlite3
import json

con = sqlite3.connect("soc_enterprise.db")
cur = con.cursor()

print("--- SECURITY EVENTS ---")
for row in cur.execute("SELECT event_id, event_type, severity, source_ip, destination_ip, is_simulated, timestamp FROM security_events ORDER BY id DESC LIMIT 5").fetchall():
    print(" ", row)

print("\n--- DETECTION FINDINGS ---")
for row in cur.execute("SELECT finding_id, rule_name, severity, event_id FROM detection_findings ORDER BY id DESC LIMIT 5").fetchall():
    print(" ", row)

print("\n--- AGENT FINDINGS ---")
for row in cur.execute("SELECT finding_id, agent_name, severity, confidence, incident_id FROM agent_findings ORDER BY id DESC LIMIT 5").fetchall():
    print(" ", row)

print("\n--- CORRELATED INCIDENTS ---")
for row in cur.execute("SELECT incident_id, title, severity, risk_score, affected_hosts, status FROM incidents ORDER BY id DESC LIMIT 5").fetchall():
    print(" ", row)

print("\n--- RESPONSE ACTIONS ---")
for row in cur.execute("SELECT action_id, incident_id, action_type, target_value, status, requires_approval FROM response_actions ORDER BY id DESC LIMIT 5").fetchall():
    print(" ", row)
