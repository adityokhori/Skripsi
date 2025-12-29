import sqlite3
import os

# Check if database exists
if not os.path.exists('sentiment_analysis.db'):
    print("❌ Database file not found!")
    print("   Run: python create_admin.py")
    exit()

print("✅ Database found!")
print("=" * 60)

# Connect
conn = sqlite3.connect('sentiment_analysis.db')
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

print(f"\n📊 Total Tables: {len(tables)}\n")

for table in tables:
    table_name = table[0]
    
    # Count rows
    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
    count = cursor.fetchone()[0]
    
    print(f"✅ {table_name}")
    print(f"   Rows: {count}")
    
    # Get columns
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = cursor.fetchall()
    
    print(f"   Columns: {', '.join([col[1] for col in columns])}")
    print()

# Show users
print("=" * 60)
print("👤 Users in database:")
print("=" * 60)

cursor.execute("SELECT id, username, role, created_at FROM users")
users = cursor.fetchall()

if users:
    for user in users:
        print(f"ID: {user[0]}")
        print(f"Username: {user[1]}")
        print(f"Role: {user[2]}")
        print(f"Created: {user[3]}")
        print("-" * 40)
else:
    print("❌ No users found!")
    print("   Run: python create_admin.py")

conn.close()

print("\n✅ Done!")
