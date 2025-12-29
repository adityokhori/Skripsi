# fix_old_data.py
from database import SessionLocal, Dataset, User

db = SessionLocal()

# Get user pertama atau admin
first_user = db.query(User).first()

if first_user:
    print(f"Assigning orphaned datasets to user: {first_user.username} (ID: {first_user.id})")
    
    # Update datasets yang tidak punya owner
    orphaned = db.query(Dataset).filter(
        (Dataset.uploaded_by == None) | (Dataset.uploaded_by == 0)
    ).all()
    
    print(f"Found {len(orphaned)} orphaned datasets")
    
    for dataset in orphaned:
        print(f"  - Fixing dataset ID {dataset.id}: {dataset.filename}")
        dataset.uploaded_by = first_user.id
    
    db.commit()
    print("✅ All orphaned datasets fixed!")
else:
    print("❌ No users found in database!")

db.close()
