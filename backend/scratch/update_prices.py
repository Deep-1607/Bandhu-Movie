import sqlite3

conn = sqlite3.connect('cinema.db')
cursor = conn.cursor()

# Update Lounger prices to 150
cursor.execute("UPDATE seats SET price = 150 WHERE section = 'lounger'")
print(f"Updated {cursor.rowcount} lounger seats to 150rs")

conn.commit()
conn.close()
print("Price update complete.")
