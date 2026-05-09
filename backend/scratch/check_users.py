import sqlite3

conn = sqlite3.connect('cinema.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
table = cursor.fetchone()
print(f"Table 'users' exists: {table is not None}")
if table:
    cursor.execute("PRAGMA table_info(users)")
    for col in cursor.fetchall():
        print(col)
conn.close()
