from database import SessionLocal, Dataset

db = SessionLocal()

print("=== CLEANING CORRUPT DATA ===\n")

# Hapus dataset yang file-nya tidak ada
corrupt_datasets = db.query(Dataset).filter(
    Dataset.id.in_([9, 10, 11, 12])
).all()

for d in corrupt_datasets:
    print(f"Deleting Dataset ID {d.id}: {d.filename} (File not found)")
    db.delete(d)

db.commit()
print(f"\n✅ Deleted {len(corrupt_datasets)} corrupt datasets")

db.close()
