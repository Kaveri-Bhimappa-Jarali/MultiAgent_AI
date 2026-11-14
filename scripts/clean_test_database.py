import sqlite3
import os
import sys

def clean_database(db_path: str = "soc_enterprise.db"):
    print(f"Connecting to database: {db_path}")
    if not os.path.exists(db_path):
        print(f"Error: {db_path} does not exist.")
        sys.exit(1)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Enable foreign keys
    cursor.execute("PRAGMA foreign_keys = ON;")

    # Tables to clear (strictly test/simulation data)
    test_tables = [
        "verification_results",
        "incident_findings",
        "incident_events",
        "incident_audits",
        "incident_notes",
        "response_actions",
        "risk_assessments",
        "incidents",
        "agent_findings",
        "agent_executions",
        "detection_findings",
        "security_events",
        "audit_logs",
        "attack_simulations",
        "evaluation_runs",
        "vm_actions"
    ]

    # Tables to preserve
    preserved_tables = [
        "users",
        "threat_indicators",
        "detection_rules",
        "vm_nodes",
        "collector_configs"
    ]

    print("\n--- Clearing Historical Test Data ---")
    for table in test_tables:
        try:
            cursor.execute(f"DELETE FROM `{table}`;")
            conn.commit()
            print(f"Cleared table: {table}")
        except sqlite3.OperationalError as e:
            print(f"Notice: Table {table} skipped or not present: {e}")

    # Vacuum to reclaim space and reset WAL
    print("\nRunning VACUUM...")
    cursor.execute("VACUUM;")
    conn.commit()

    print("\n--- Verifying Row Counts Post-Clean ---")
    all_zero = True
    for table in test_tables:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM `{table}`;")
            cnt = cursor.fetchone()[0]
            print(f"  {table:<25}: {cnt} rows")
            if cnt != 0:
                all_zero = False
        except sqlite3.OperationalError:
            pass

    print("\n--- Verifying Preserved Tables ---")
    for table in preserved_tables:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM `{table}`;")
            cnt = cursor.fetchone()[0]
            print(f"  {table:<25}: {cnt} rows (PRESERVED)")
        except sqlite3.OperationalError:
            pass

    conn.close()

    if all_zero:
        print("\nSUCCESS: Database successfully cleaned. All historical test tables are 0.")
    else:
        print("\nWARNING: Some test tables still have rows!")
        sys.exit(1)

if __name__ == "__main__":
    db_file = sys.argv[1] if len(sys.argv) > 1 else "soc_enterprise.db"
    clean_database(db_file)
