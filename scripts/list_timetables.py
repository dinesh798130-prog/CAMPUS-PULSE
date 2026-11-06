import sqlite3
import json

conn = sqlite3.connect("prisma/dev.db")
c = conn.cursor()

query = """
SELECT d.code as department, g.year, g.name as group_name, g.section, COUNT(e.id) as entry_count
FROM "Group" g
JOIN "Department" d ON g.departmentId = d.id
LEFT JOIN "Entry" e ON e.groupId = g.id AND e.is_live = 1
GROUP BY g.id
ORDER BY d.code ASC, g.year ASC, g.name ASC;
"""

c.execute(query)
rows = c.fetchall()

result = []
empty_sections = []
for r in rows:
    item = {
        "department": r[0],
        "year": r[1],
        "group_name": r[2],
        "section": r[3],
        "entries": r[4]
    }
    result.append(item)
    if r[4] == 0:
        empty_sections.append(r[2])

print(f"Total Sections: {len(result)}")
print(f"Empty Sections: {len(empty_sections)}")
print(json.dumps(result, indent=2))

conn.close()

