import sqlite3
import json
import os

db_path = 'prisma/dev.db'
if not os.path.exists(db_path):
    print("Database file not found at", db_path)
    exit(1)

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

backup = {}
tables = ['Department', 'Group', 'Room', 'Faculty', 'Entry', 'SourceFile']
for t in tables:
    cur.execute(f"SELECT * FROM \"{t}\"")
    rows = [dict(r) for r in cur.fetchall()]
    backup[t] = rows
    print(f"Backed up {len(rows)} records from table {t}")

with open('server/data/production_timetables_backup.json', 'w') as f:
    json.dump(backup, f, indent=2)

print("Export completed successfully to server/data/production_timetables_backup.json")
