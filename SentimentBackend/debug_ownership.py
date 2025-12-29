from database import SessionLocal, Dataset, User

db = SessionLocal()

print("\n=== ALL USERS ===")
users = db.query(User).all()
for u in users:
    print(f"User ID: {u.id}, Username: {u.username}")

print("\n=== ALL DATASETS ===")
datasets = db.query(Dataset).all()
for d in datasets:
    uploaded_by = d.uploaded_by if d.uploaded_by else "NULL"
    print(f"Dataset ID: {d.id}")
    print(f"  Filename: {d.filename}")
    print(f"  Uploaded by ID: {uploaded_by}")
    
    # Cek file exists
    import os
    exists = os.path.exists(d.filename)
    print(f"  File exists: {exists}")
    
    if d.uploaded_by:
        owner = db.query(User).filter(User.id == d.uploaded_by).first()
        if owner:
            print(f"  Owner username: {owner.username}")
        else:
            print(f"  Owner username: NOT FOUND (orphaned)")
    print()

db.close()
