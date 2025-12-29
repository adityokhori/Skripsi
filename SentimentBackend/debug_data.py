from database import SessionLocal, Dataset, User

db = SessionLocal()

print("\n=== ALL USERS ===")
users = db.query(User).all()
for u in users:
    print(f"User ID: {u.id}, Username: {u.username}")

print("\n=== ALL DATASETS ===")
datasets = db.query(Dataset).all()
for d in datasets:
    uploaded_by_id = d.uploaded_by if d.uploaded_by else "NULL"
    print(f"Dataset ID: {d.id}, Filename: {d.filename}, Uploaded By ID: {uploaded_by_id}")

print("\n=== MATCH CHECK ===")
for u in users:
    user_datasets = db.query(Dataset).filter(Dataset.uploaded_by == u.id).all()
    print(f"User '{u.username}' (ID: {u.id}) has {len(user_datasets)} datasets")

db.close()
