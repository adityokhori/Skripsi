# migrate_remove_role.py
from sqlalchemy import create_engine, text
import shutil
import os
from datetime import datetime

# Backup database dulu
backup_name = f"sentiment_analysis_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
if os.path.exists("sentiment_analysis.db"):
    shutil.copy2("sentiment_analysis.db", backup_name)
    print(f"✅ Backup created: {backup_name}")

# Connect ke database
SQLALCHEMY_DATABASE_URL = "sqlite:///./sentiment_analysis.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

print("\n🔧 Starting migration: Remove 'role' column from users table...")

try:
    with engine.connect() as conn:
        # 1. Buat tabel baru tanpa kolom 'role'
        print("   Creating new users table without 'role' column...")
        conn.execute(text("""
            CREATE TABLE users_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        """))
        
        # 2. Copy data dari tabel lama ke tabel baru
        print("   Copying data from old table to new table...")
        conn.execute(text("""
            INSERT INTO users_new (id, username, hashed_password, created_at)
            SELECT id, username, hashed_password, created_at FROM users;
        """))
        
        # 3. Drop tabel lama
        print("   Dropping old users table...")
        conn.execute(text("DROP TABLE users;"))
        
        # 4. Rename tabel baru jadi 'users'
        print("   Renaming new table to 'users'...")
        conn.execute(text("ALTER TABLE users_new RENAME TO users;"))
        
        # Commit changes
        conn.commit()
    
    print("\n✅ Migration completed successfully!")
    print(f"✅ Backup saved as: {backup_name}")
    print("\n📊 Users after migration:")
    
    # Tampilkan users yang ada
    with engine.connect() as conn:
        result = conn.execute(text("SELECT id, username, created_at FROM users;"))
        users = result.fetchall()
        for user in users:
            print(f"   - ID: {user[0]}, Username: {user[1]}, Created: {user[2]}")
    
except Exception as e:
    print(f"\n❌ Migration failed: {str(e)}")
    print(f"   Your database backup is safe at: {backup_name}")
    print("   You can restore it by renaming the backup file.")
