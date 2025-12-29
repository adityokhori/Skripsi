# check_and_fix_files.py
import os
from database import SessionLocal, Dataset

db = SessionLocal()

print(f"Current directory: {os.getcwd()}\n")

print("=== FILES IN CURRENT DIRECTORY ===")
csv_files = [f for f in os.listdir('.') if f.endswith('.csv')]
for f in csv_files:
    print(f"  ✅ {f}")

print("\n=== DATASETS IN DATABASE ===")
datasets = db.query(Dataset).all()

for d in datasets:
    print(f"\nDataset ID {d.id}: {d.filename}")
    
    # Cek berbagai kemungkinan lokasi
    if os.path.exists(d.filename):
        print(f"  ✅ File found at: {d.filename}")
    elif os.path.exists(f"./{d.filename}"):
        print(f"  ✅ File found at: ./{d.filename}")
        # Update database
        d.filename = f"./{d.filename}"
    elif os.path.exists(os.path.basename(d.filename)):
        print(f"  ✅ File found at: {os.path.basename(d.filename)}")
        # Update database
        d.filename = os.path.basename(d.filename)
    else:
        print(f"  ❌ File NOT found!")
        print(f"     Searched in:")
        print(f"       - {d.filename}")
        print(f"       - ./{d.filename}")
        print(f"       - {os.path.basename(d.filename)}")

db.commit()
db.close()
print("\n✅ Database updated with correct file paths")
