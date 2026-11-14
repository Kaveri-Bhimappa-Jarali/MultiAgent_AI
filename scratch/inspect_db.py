import sqlite3
import json

db_path = "soc_enterprise.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
tables = [row[0] for row in cursor.fetchall()]

table_info = {}
print(f"Database: {db_path}")
print(f"Total tables: {len(tables)}\n")

for t in tables:
    cursor.execute(f"SELECT COUNT(*) FROM `{t}`")
    cnt = cursor.fetchone()[0]
    
    cursor.execute(f"PRAGMA foreign_key_list(`{t}`)")
    fks = cursor.fetchall()
    fk_list = []
    for fk in fks:
        fk_list.append({
            "id": fk[0],
            "seq": fk[1],
            "table": fk[2],
            "from": fk[3],
            "to": fk[4],
            "on_update": fk[5],
            "on_delete": fk[6]
        })
        
    table_info[t] = {
        "count": cnt,
        "foreign_keys": fk_list
    }
    print(f"Table: {t:<35} Rows: {cnt:<6} FKs: {len(fk_list)}")

conn.close()

with open("scratch/db_inventory.json", "w", encoding="utf-8") as f:
    json.dump(table_info, f, indent=2)

print("\nInventory saved to scratch/db_inventory.json")
