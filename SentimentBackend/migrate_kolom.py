from sqlalchemy import create_engine, text
import shutil
from datetime import datetime

# Backup database
backup_name = f"sentimentanalysis_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
shutil.copy2("sentiment_analysis.db", backup_name)
print(f"✅ Backup created: {backup_name}\n")

# Connect to database
engine = create_engine("sqlite:///./sentiment_analysis.db", connect_args={"check_same_thread": False})

print("🔧 Starting column migration...")

try:
    with engine.connect() as conn:
        # Dataset table
        print("\n1. Migrating Dataset table...")
        conn.execute(text("ALTER TABLE datasets RENAME COLUMN videourl TO video_url"))
        conn.execute(text("ALTER TABLE datasets RENAME COLUMN totalrows TO total_rows"))
        conn.execute(text("ALTER TABLE datasets RENAME COLUMN filesizemb TO filesize_mb"))
        conn.execute(text("ALTER TABLE datasets RENAME COLUMN uploaddate TO upload_date"))
        conn.execute(text("ALTER TABLE datasets RENAME COLUMN uploadedby TO uploaded_by"))
        print("   ✅ Dataset columns renamed")
        
        # PreprocessedData table
        print("\n2. Migrating PreprocessedData table...")
        conn.execute(text("ALTER TABLE preprocesseddata RENAME COLUMN inputfilename TO input_filename"))
        conn.execute(text("ALTER TABLE preprocesseddata RENAME COLUMN outputfilename TO output_filename"))
        conn.execute(text("ALTER TABLE preprocesseddata RENAME COLUMN totalprocessed TO total_processed"))
        conn.execute(text("ALTER TABLE preprocesseddata RENAME COLUMN processingtimeseconds TO processing_time_seconds"))
        conn.execute(text("ALTER TABLE preprocesseddata RENAME COLUMN numcoresused TO num_cores_used"))
        conn.execute(text("ALTER TABLE preprocesseddata RENAME COLUMN batchsize TO batch_size"))
        conn.execute(text("ALTER TABLE preprocesseddata RENAME COLUMN processedat TO processed_at"))
        conn.execute(text("ALTER TABLE preprocesseddata RENAME COLUMN processedby TO processed_by"))
        print("   ✅ PreprocessedData columns renamed")
        
        # LabeledData table
        print("\n3. Migrating LabeledData table...")
        conn.execute(text("ALTER TABLE labeleddata RENAME COLUMN preprocessedid TO preprocessed_id"))
        conn.execute(text("ALTER TABLE labeleddata RENAME COLUMN inputfilename TO input_filename"))
        conn.execute(text("ALTER TABLE labeleddata RENAME COLUMN outputfilename TO output_filename"))
        conn.execute(text("ALTER TABLE labeleddata RENAME COLUMN totallabeled TO total_labeled"))
        conn.execute(text("ALTER TABLE labeleddata RENAME COLUMN positivecount TO positive_count"))
        conn.execute(text("ALTER TABLE labeleddata RENAME COLUMN negativecount TO negative_count"))
        conn.execute(text("ALTER TABLE labeleddata RENAME COLUMN neutralcount TO neutral_count"))
        conn.execute(text("ALTER TABLE labeleddata RENAME COLUMN labelingmethod TO labeling_method"))
        conn.execute(text("ALTER TABLE labeleddata RENAME COLUMN labeledat TO labeled_at"))
        conn.execute(text("ALTER TABLE labeleddata RENAME COLUMN labeledby TO labeled_by"))
        print("   ✅ LabeledData columns renamed")
        
        # TFIDFModel table
        print("\n4. Migrating TFIDFModel table...")
        conn.execute(text("ALTER TABLE tfidfmodels RENAME COLUMN labeleddataid TO labeled_data_id"))
        conn.execute(text("ALTER TABLE tfidfmodels RENAME COLUMN inputfilename TO input_filename"))
        conn.execute(text("ALTER TABLE tfidfmodels RENAME COLUMN vectorizerpath TO vectorizer_path"))
        conn.execute(text("ALTER TABLE tfidfmodels RENAME COLUMN matrixpath TO matrix_path"))
        conn.execute(text("ALTER TABLE tfidfmodels RENAME COLUMN maxfeatures TO max_features"))
        conn.execute(text("ALTER TABLE tfidfmodels RENAME COLUMN ngramrange TO ngram_range"))
        conn.execute(text("ALTER TABLE tfidfmodels RENAME COLUMN matrixshaperows TO matrix_shape_rows"))
        conn.execute(text("ALTER TABLE tfidfmodels RENAME COLUMN matrixshapecols TO matrix_shape_cols"))
        conn.execute(text("ALTER TABLE tfidfmodels RENAME COLUMN vocabularysize TO vocabulary_size"))
        conn.execute(text("ALTER TABLE tfidfmodels RENAME COLUMN createdat TO created_at"))
        conn.execute(text("ALTER TABLE tfidfmodels RENAME COLUMN createdby TO created_by"))
        print("   ✅ TFIDFModel columns renamed")
        
        # TrainingHistory table
        print("\n5. Migrating TrainingHistory table...")
        conn.execute(text("ALTER TABLE traininghistory RENAME COLUMN tfidfmodelid TO tfidf_model_id"))
        conn.execute(text("ALTER TABLE traininghistory RENAME COLUMN labeleddataid TO labeled_data_id"))
        conn.execute(text("ALTER TABLE traininghistory RENAME COLUMN datasetname TO dataset_name"))
        conn.execute(text("ALTER TABLE traininghistory RENAME COLUMN modelpath TO model_path"))
        conn.execute(text("ALTER TABLE traininghistory RENAME COLUMN nsplits TO n_splits"))
        conn.execute(text("ALTER TABLE traininghistory RENAME COLUMN randomstate TO random_state"))
        conn.execute(text("ALTER TABLE traininghistory RENAME COLUMN precisionscore TO precision_score"))
        conn.execute(text("ALTER TABLE traininghistory RENAME COLUMN recallscore TO recall_score"))
        conn.execute(text("ALTER TABLE traininghistory RENAME COLUMN f1score TO f1_score"))
        conn.execute(text("ALTER TABLE traininghistory RENAME COLUMN confusionmatrix TO confusion_matrix"))
        conn.execute(text("ALTER TABLE traininghistory RENAME COLUMN trainingtimeseconds TO training_time_seconds"))
        conn.execute(text("ALTER TABLE traininghistory RENAME COLUMN totalsamples TO total_samples"))
        conn.execute(text("ALTER TABLE traininghistory RENAME COLUMN trainsamples TO train_samples"))
        conn.execute(text("ALTER TABLE traininghistory RENAME COLUMN testsamples TO test_samples"))
        conn.execute(text("ALTER TABLE traininghistory RENAME COLUMN trainedby TO trained_by"))
        print("   ✅ TrainingHistory columns renamed")
        
        conn.commit()
    
    print("\n✅ Migration completed successfully!")
    print(f"✅ Backup saved at: {backup_name}")
    
except Exception as e:
    print(f"\n❌ Migration failed: {str(e)}")
    print(f"   Restore from backup: {backup_name}")
    import traceback
    traceback.print_exc()
