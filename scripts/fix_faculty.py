import sqlite3
conn = sqlite3.connect('prisma/dev.db')
c = conn.cursor()
c.execute('UPDATE Entry SET facultyId = NULL WHERE groupId != (SELECT id FROM "Group" WHERE name = "II AIML-J")')
conn.commit()
print('Updated entries:', c.rowcount)
conn.close()

