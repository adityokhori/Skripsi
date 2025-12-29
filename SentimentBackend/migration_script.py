# migration_script.py
import re
from database import SessionLocal, TrainingHistory

def migrate_session_keys():
    """Extract session_key from existing model paths"""
    db = SessionLocal()
    try:
        models = db.query(TrainingHistory).all()
        updated_count = 0
        
        for model in models:
            # Extract timestamp from model path
            # Format: models/final_nb_non_balanced_20251228_161723.pkl
            match = re.search(r'_(\d{8}_\d{6})\.pkl$', model.model_path)
            if match:
                session_key = match.group(1)
                model.session_key = session_key
                updated_count += 1
                print(f"Updated {model.id}: {model.model_path} → {session_key}")
        
        db.commit()
        print(f"\n✓ Successfully migrated {updated_count} models")
        
    except Exception as e:
        print(f"Migration error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_session_keys()
