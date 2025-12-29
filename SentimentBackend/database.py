# database.py (lengkap dengan semua relationships)

from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, Text, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship  # ✅ IMPORT relationship
from datetime import datetime
import os

# SQLite database
SQLALCHEMY_DATABASE_URL = "sqlite:///./sentiment_analysis.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ====================================
# 1. USER TABLE (Proses 1.0 Login System)
# ====================================


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    # role = Column(String(20), default="admin")  # ❌ HAPUS baris ini
    created_at = Column(DateTime, default=datetime.utcnow)


# ====================================
# 2. DATASET TABLE (Proses 2.0 Import Dataset)
# ====================================
class Dataset(Base):
    __tablename__ = "datasets"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    source = Column(String(100))  # "youtube", "upload", "manual"
    video_url = Column(Text, nullable=True)  # YouTube URL
    total_rows = Column(Integer, default=0)
    file_size_mb = Column(Float, default=0)
    upload_date = Column(DateTime, default=datetime.utcnow)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    status = Column(String(20), default="active")  # active, archived, deleted
    description = Column(Text, nullable=True)
    
    # ✅ Relationship
    uploader = relationship("User", foreign_keys=[uploaded_by], backref="uploaded_datasets")

# ====================================
# 3. PREPROCESSED DATA TABLE (Proses 3.0 Text Preprocessing)
# ====================================
class PreprocessedData(Base):
    __tablename__ = "preprocessed_data"
    
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"))
    input_filename = Column(String(255))
    output_filename = Column(String(255))
    total_processed = Column(Integer, default=0)
    processing_time_seconds = Column(Float, default=0)
    num_cores_used = Column(Integer, default=1)
    batch_size = Column(Integer, default=10000)
    processed_at = Column(DateTime, default=datetime.utcnow)
    processed_by = Column(Integer, ForeignKey("users.id"))
    status = Column(String(20), default="completed")  # processing, completed, failed
    
    # ✅ Relationships
    dataset = relationship("Dataset", foreign_keys=[dataset_id], backref="preprocessed_data")
    processor = relationship("User", foreign_keys=[processed_by], backref="preprocessed_data")

# ====================================
# 4. LABELED DATA TABLE (Proses 4.0 Labelling)
# ====================================
class LabeledData(Base):
    __tablename__ = "labeled_data"
    
    id = Column(Integer, primary_key=True, index=True)
    preprocessed_id = Column(Integer, ForeignKey("preprocessed_data.id"))
    input_filename = Column(String(255))
    output_filename = Column(String(255))  # Get_Labelling.csv
    total_labeled = Column(Integer, default=0)
    positive_count = Column(Integer, default=0)
    negative_count = Column(Integer, default=0)
    neutral_count = Column(Integer, default=0)
    labeling_method = Column(String(50))  # "lexicon-based", "manual", "auto"
    labeled_at = Column(DateTime, default=datetime.utcnow)
    labeled_by = Column(Integer, ForeignKey("users.id"))
    status = Column(String(20), default="completed")
    
    # ✅ Relationships
    preprocessed = relationship("PreprocessedData", foreign_keys=[preprocessed_id], backref="labeled_data")
    labeler = relationship("User", foreign_keys=[labeled_by], backref="labeled_data")

# ====================================
# 5. TF-IDF MODEL TABLE (Proses 5.0 TF-IDF Analysis)
# ====================================
class TFIDFModel(Base):
    __tablename__ = "tfidf_models"
    
    id = Column(Integer, primary_key=True, index=True)
    labeled_data_id = Column(Integer, ForeignKey("labeled_data.id"))
    input_filename = Column(String(255))  # Get_Labelling.csv
    vectorizer_path = Column(String(255))  # models/tfidf_vectorizer.pkl
    matrix_path = Column(String(255))  # tfidf_matrix.pkl
    max_features = Column(Integer, default=5000)
    ngram_range = Column(String(20), default="(1,2)")
    matrix_shape_rows = Column(Integer)
    matrix_shape_cols = Column(Integer)
    vocabulary_size = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"))
    
    # ✅ Relationships
    creator = relationship("User", foreign_keys=[created_by], backref="tfidf_models")
    labeled_data = relationship("LabeledData", foreign_keys=[labeled_data_id], backref="tfidf_models")

# ====================================
# 6. TRAINING HISTORY TABLE (Proses 6.0 Classification SVM)
# ====================================
class TrainingHistory(Base):
    __tablename__ = "training_history"
    
    id = Column(Integer, primary_key=True, index=True)
    tfidf_model_id = Column(Integer, ForeignKey("tfidf_models.id"))
    labeled_data_id = Column(Integer, ForeignKey("labeled_data.id"))
    dataset_name = Column(String(255))
    model_path = Column(String(255))  # models/final_nb_model.pkl
    algorithm = Column(String(50), default="Multinomial Naive Bayes")
    approach = Column(String(50))  # "balancing", "non-balancing", "both"
    
    # Cross-validation params
    n_splits = Column(Integer, default=10)
    random_state = Column(Integer, default=42)
    
    # Performance metrics
    accuracy = Column(Float)
    precision_score = Column(Float)
    recall_score = Column(Float)
    f1_score = Column(Float)
    
    # Confusion matrix (stored as JSON string)
    confusion_matrix = Column(Text, nullable=True)  # Store as JSON
    
    # Training details
    training_time_seconds = Column(Float, nullable=True)
    total_samples = Column(Integer, nullable=True)
    train_samples = Column(Integer, nullable=True)
    test_samples = Column(Integer, nullable=True)
    session_key = Column(String(50), nullable=True, index=True)
    # Metadata
    timestamp = Column(DateTime, default=datetime.utcnow)
    trained_by = Column(Integer, ForeignKey("users.id"))
    
    # ✅ Relationships
    trainer = relationship("User", foreign_keys=[trained_by], backref="training_history")
    tfidf_model = relationship("TFIDFModel", foreign_keys=[tfidf_model_id], backref="training_history")
    labeled_data = relationship("LabeledData", foreign_keys=[labeled_data_id], backref="training_history")

# ====================================
# Create all tables
# ====================================
def init_database():
    """Initialize database and create all tables"""
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")

# Dependency for FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Run this on import
Base.metadata.create_all(bind=engine)
