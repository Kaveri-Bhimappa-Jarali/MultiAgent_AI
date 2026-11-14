import sqlite3
import os

db_path = "soc_enterprise.db"
con = sqlite3.connect(db_path)
cur = con.cursor()

tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';").fetchall()]
print(f"Total tables in {db_path}: {len(tables)}")
for t in tables:
    cnt = cur.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
    print(f"  {t}: {cnt}")
