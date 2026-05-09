import sqlite3

conn = sqlite3.connect('cinema.db')
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE bookings ADD COLUMN customer_name VARCHAR")
    print("Added customer_name")
except Exception as e:
    print(f"Error adding customer_name: {e}")

try:
    cursor.execute("ALTER TABLE bookings ADD COLUMN customer_phone VARCHAR")
    print("Added customer_phone")
except Exception as e:
    print(f"Error adding customer_phone: {e}")

try:
    cursor.execute("ALTER TABLE bookings ADD COLUMN screenshot_filename VARCHAR")
    print("Added screenshot_filename")
except Exception as e:
    print(f"Error adding screenshot_filename: {e}")

conn.commit()
conn.close()
print("Migration complete.")
