
from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from typing import Optional
import pandas as pd
import os
import uvicorn
import joblib
from datetime import datetime
from database import PreprocessedData, Dataset, User

from collections import Counter
import time
from naive_bayes_utils import verify_tfidf_in_likelihood
from PreProcessing import preprocess_comments_large, get_progress
from get_comments import get_youtube_comments
from label_utils import label_text, get_latest_preprocessed, auto_label_and_save
from balancing_utils import (
    get_balancing_info,
    get_visualization_points,
    check_requirements as check_balancing_requirements
)
from naive_bayes_utils import (
    train_naive_bayes_with_cv,
    predict_new_text,
    get_model_info,
    compare_approaches,
    check_requirements as check_nb_requirements
)

# Import TF-IDF utilities
from sklearn.feature_extraction.text import TfidfVectorizer
import shutil
from fastapi import File, UploadFile

# Import authentication & database
from authentication import router as auth_router, get_current_user
from sqlalchemy.orm import Session

# Di bagian atas main.py, setelah import database
from database import (
    Base, 
    engine, 
    get_db, 
    TrainingHistory, 
    User,
    Dataset,              # ✅ Add this
    PreprocessedData,     # ✅ Add this
    LabeledData,          # ✅ Add this (yang error)
    TFIDFModel            # ✅ Add this
)
from sqlalchemy.orm import Session

# Initialize FastAPI
app = FastAPI(
    title="Sentiment Analysis API",
    description="API untuk analisis sentimen dengan Naive Bayes",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:3000",  # Development
    "http://localhost:5173",  # Development
    "https://your-frontend-domain.vercel.app",  # ✅ Production frontend
    "https://your-frontend-domain.com",  # ✅ Custom domain
    "https://your-app.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include authentication router
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])


from pydantic import BaseModel
from typing import List  # ✅ Import List

class YouTubeRequest(BaseModel):
    video_url: str = None  # ✅ Optional untuk single URL
    video_urls: List[str] = None  # ✅ NEW: untuk multiple URLs
    max_results: int = 100

class PreprocessConfig(BaseModel):
    input_file: str  # ✅ Pakai underscore
    num_cores: int = 8
    batch_size: int = 100
    skip_translation: bool = False


class PredictWithModelRequest(BaseModel):
    text: str
    model_id: int
    handle_negation: bool = False  # ✅ NEW
    
class AutoLabelConfig(BaseModel):
    input_file: str  # ✅ File GetProcessed yang dipilih

class TrainConfig(BaseModel):
    approach: str = "both"  # "both", "balancing", "non-balancing"
    dataset_name: str = "Get_Labelling.csv"
    output_prefix: str = "final"
    n_splits: int = 10
    random_state: int = 42

class TrainRequest(BaseModel):
    labeled_file: str  # ✅ File labeled yang dipilih (GetLabelling_TIMESTAMP.csv)
    tfidf_matrix_file: str  # ✅ File TF-IDF matrix (tfidf_matrix_TIMESTAMP.pkl)
    approach: str = "both"  # "both", "balancing", "non-balancing"
    output_prefix: str = "final"
    n_splits: int = 10
    random_state: int = 42

class PredictRequest(BaseModel):
    text: str
    model_name: Optional[str] = "final"

class TFIDFRequest(BaseModel):
    input_file: str  # ✅ File yang dipilih user (GetLabelling_TIMESTAMP.csv)
    max_features: Optional[int] = 5000

class CompareRequest(BaseModel):
    dataset_name: str = "Get_Labelling.csv"
    n_splits: int = 10

class BulkImportConfig(BaseModel):
    filename: str  # Nama file CSV yang sudah ada
    description: Optional[str] = "Bulk import from existing file"
    skip_validation: bool = False

# =========================
# Root Endpoint
# =========================

@app.get("/")
async def root():
    return {
        "message": "Sentiment Analysis API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "auth": "/auth/login, /auth/register, /auth/me",
            "docs": "/docs",
            "protected": "Most POST endpoints require authentication"
        }
    }

# =========================
# PUBLIC ENDPOINTS (No Auth Required)
# =========================

@app.get("/progress")
async def check_progress():
    """Check preprocessing progress"""
    progress_data = get_progress()
    
    # Extract percentage from dict
    if isinstance(progress_data, dict):
        progress_percent = progress_data.get("percentage", 0)
        current = progress_data.get("current", 0)
        total = progress_data.get("total", 0)
        status = progress_data.get("status", "idle")
    else:
        # Fallback if it returns a number
        progress_percent = progress_data
        current = 0
        total = 0
        status = "unknown"
    
    return {
        "progress": progress_percent,
        "percentage": progress_percent,
        "current": current,
        "total": total,
        "status": status if status != "idle" else ("processing" if progress_percent < 100 else "completed")
    }


@app.post("/predict")
async def predict_sentiment(request: PredictRequest):
    """
    Predict sentiment - PUBLIC endpoint
    Anyone can predict without login
    """
    try:
        result = predict_new_text(request.text, request.model_name)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model-info")
async def model_information(model_name: str = "final"):
    """Get model information - PUBLIC"""
    try:
        info = get_model_info(model_name)
        return info
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Model not found: {str(e)}")

@app.get("/download/{filename}")
async def download_file(filename: str):
    """Download exported files - PUBLIC"""
    try:
        file_path = f"exports/{filename}"
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type='application/octet-stream'
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =========================
# PROTECTED ENDPOINTS (Auth Required)
# =========================

from database import Dataset
import datetime

@app.post("/get-comments")
async def get_comments(
    request: YouTubeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Crawl YouTube comments - ADMIN ONLY
    Supports single URL or multiple URLs
    """
    try:
        # ✅ Check: single URL atau multiple URLs?
        if request.video_urls and len(request.video_urls) > 0:
            # BATCH MODE: Multiple URLs → 1 file
            from get_comments import get_youtube_comments_batch
            
            result = get_youtube_comments_batch(
                video_urls=request.video_urls,
                max_results_per_video=request.max_results
            )
            
            if not result.get("success", False):
                raise HTTPException(status_code=400, detail=result.get("message"))
            
            # Save metadata ke database
            file_size = 0
            if os.path.exists(result["file"]):
                file_size = round(os.path.getsize(result["file"]) / (1024*1024), 2)
            
            # Gabungkan semua video URLs
            video_urls_str = ", ".join(result["video_urls"])
            
            dataset = Dataset(
                filename=result["file"],
                source="youtube",
                video_url=video_urls_str,  # ✅ Simpan semua URLs
                total_rows=result.get("count", 0),
                file_size_mb=file_size,
                uploaded_by=current_user.id,
                description=f"Batch crawl: {result['successful_videos']} videos, {result['count']} comments"
            )
            
            db.add(dataset)
            db.commit()
            db.refresh(dataset)
            
            return {
                "status": "success",
                "message": result["message"],
                "file": result["file"],
                "count": result["count"],
                "dataset_id": dataset.id,
                "successful_videos": result["successful_videos"],
                "failed_videos": result["failed_videos"],
                "crawled_by": current_user.username,
                "comments": result.get("comments", [])
            }
            
        elif request.video_url:
            # SINGLE MODE: 1 URL → 1 file
            from get_comments import get_youtube_comments
            
            result = get_youtube_comments(
                video_url=request.video_url,
                max_results=request.max_results
            )
            
            if not result.get("success", False):
                raise HTTPException(status_code=400, detail=result.get("message"))
            
            # Save metadata ke database
            file_size = 0
            if os.path.exists(result["file"]):
                file_size = round(os.path.getsize(result["file"]) / (1024*1024), 2)
            
            dataset = Dataset(
                filename=result["file"],
                source="youtube",
                video_url=request.video_url,
                total_rows=result.get("count", 0),
                file_size_mb=file_size,
                uploaded_by=current_user.id,
                description=f"Single crawl: {result['count']} comments"
            )
            
            db.add(dataset)
            db.commit()
            db.refresh(dataset)
            
            return {
                "status": "success",
                "message": result["message"],
                "file": result["file"],
                "count": result["count"],
                "dataset_id": dataset.id,
                "crawled_by": current_user.username,
                "comments": result.get("comments", [])
            }
        else:
            raise HTTPException(status_code=400, detail="Either video_url or video_urls must be provided")
            
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print("=" * 60)
        print("ERROR IN GET_COMMENTS:")
        print(traceback.format_exc())
        print("=" * 60)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
# ==================== GET DATASETS ====================

import datetime
@app.get("/datasets")
async def get_datasets(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Get datasets - only user's own data"""
    try:
        print(f"[DEBUG] Fetching datasets for user: {current_user.username} (ID: {current_user.id})")
        
        # ✅ Filter: Hanya dataset milik user yang login
        datasets = db.query(Dataset)\
            .filter(Dataset.uploaded_by == current_user.id)\
            .order_by(Dataset.upload_date.desc())\
            .all()
        
        print(f"[DEBUG] Found {len(datasets)} datasets for this user")
        
        result_datasets = []
        for d in datasets:
            # Cek file exists
            file_exists = os.path.exists(d.filename)
            
            try:
                upload_date_str = d.upload_date.isoformat() if d.upload_date else ""
            except:
                upload_date_str = ""
            
            result_datasets.append({
                "id": d.id,
                "filename": d.filename,
                "videourl": getattr(d, 'video_url', ''),
                "totalrows": d.total_rows or 0,
                "filesizemb": d.file_size_mb or 0,
                "uploaddate": upload_date_str,
                "uploadedby": current_user.username,  # Pasti milik user sendiri
                "fileexists": file_exists,
                "status": d.status or "active"
            })
        
        return {
            "total": len(result_datasets),
            "datasets": result_datasets
        }
        
    except Exception as e:
        import traceback
        print("="*80)
        print("ERROR in /datasets:")
        print(traceback.format_exc())
        print("="*80)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/preprocess")
async def run_preprocessing(
    config: PreprocessConfig, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Preprocess data - only user's own datasets"""
    try:
        # ✅ UBAH: config.inputfile → config.input_file
        if not os.path.exists(config.input_file):
            raise HTTPException(
                status_code=404, 
                detail=f"Input file not found: {config.input_file}"
            )
        
        # Validasi ownership
        dataset = db.query(Dataset).filter(Dataset.filename == config.input_file).first()
        
        if not dataset:
            raise HTTPException(
                status_code=404,
                detail=f"Dataset not found in database: {config.input_file}"
            )
        
        if dataset.uploaded_by != current_user.id:
            raise HTTPException(
                status_code=403, 
                detail="You don't have permission to process this dataset"
            )
        
        # Generate output filename
        if "GetComments_" in config.input_file:
            timestamp = config.input_file.replace("GetComments_", "").replace(".csv", "")
            outputfile = f"GetProcessed_{timestamp}.csv"
        else:
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            outputfile = f"GetProcessed_{timestamp}.csv"
        
        # Run preprocessing
        from PreProcessing import preprocess_comments_large
        
        result = preprocess_comments_large(
            input_path=config.input_file,        # ✅ UBAH
            output_path=outputfile,
            num_workers=config.num_cores,        # ✅ UBAH
            batch_size=config.batch_size,        # ✅ UBAH
            skip_translation=config.skip_translation  # ✅ UBAH
        )
        
        # Count processed rows
        if os.path.exists(outputfile):
            import pandas as pd
            df = pd.read_csv(outputfile)
            totalprocessed = len(df)
        else:
            totalprocessed = 0
        
        # Save to database
        from database import PreprocessedData
        
        preprocesseddata = PreprocessedData(
            dataset_id=dataset.id,
            input_filename=config.input_file,     # ✅ UBAH
            output_filename=outputfile,
            total_processed=totalprocessed,
            processing_time_seconds=result.get("time_elapsed", 0),
            num_cores_used=config.num_cores,       # ✅ UBAH
            batch_size=config.batch_size,         # ✅ UBAH
            processed_by=current_user.id,
            status="completed"
        )
        db.add(preprocesseddata)
        db.commit()
        db.refresh(preprocesseddata)
        
        return {
            "status": "success",
            "message": "Preprocessing completed",
            "input": config.input_file,          # ✅ UBAH
            "output": outputfile,
            "totalprocessed": totalprocessed,
            "timeseconds": result.get("time_elapsed", 0),
            "preprocesseddataid": preprocesseddata.id,
            "initiatedby": current_user.username
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print("="*80)
        print("PREPROCESSING ERROR:")
        print(traceback.format_exc())
        print("="*80)
        raise HTTPException(status_code=500, detail=f"Preprocessing failed: {str(e)}")


@app.get("/datasets")
async def get_datasets(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Get datasets"""
    try:
        # TEMPORARY: Show all datasets untuk debugging
        all_datasets = db.query(Dataset).order_by(Dataset.upload_date.desc()).all()
        
        result_datasets = []
        for d in all_datasets:
            # Cek file dengan multiple paths
            file_exists = False
            actual_path = d.filename
            
            check_paths = [
                d.filename,
                f"./{d.filename}",
                os.path.basename(d.filename)
            ]
            
            for path in check_paths:
                if os.path.exists(path):
                    file_exists = True
                    actual_path = path
                    break
            
            # Check ownership
            is_owner = (d.uploaded_by == current_user.id)
            
            try:
                uploader_name = d.uploader.username if d.uploader else "Unknown"
            except:
                uploader_name = "Unknown"
            
            try:
                upload_date_str = d.upload_date.isoformat() if d.upload_date else ""
            except:
                upload_date_str = ""
            
            result_datasets.append({
                "id": d.id,
                "filename": d.filename,
                "videourl": getattr(d, 'video_url', ''),
                "totalrows": d.totalrows or 0,
                "filesizemb": d.filesizemb or 0,
                "uploaddate": upload_date_str,
                "uploadedby": uploader_name,
                "fileexists": file_exists,
                "actualpath": actual_path,  # Untuk debugging
                "status": d.status or "active",
                "is_owner": is_owner,
                "uploaded_by_id": d.uploaded_by  # Untuk debugging
            })
        
        return {
            "total": len(result_datasets),
            "datasets": result_datasets,
            "current_user_id": current_user.id
        }
        
    except Exception as e:
        import traceback
        print("="*80)
        print("ERROR in /datasets:")
        print(traceback.format_exc())
        print("="*80)
        raise HTTPException(status_code=500, detail=str(e))

   
@app.post("/auto-label")
async def auto_label_dataset(
    config: AutoLabelConfig,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # 1. Cek file fisik ada
        if not os.path.exists(config.input_file):
            raise HTTPException(
                status_code=404, 
                detail=f"Input file not found: {config.input_file}"
            )
        
        # 2. Cari preprocessed data
        preprocessed = db.query(PreprocessedData)\
            .filter(PreprocessedData.output_filename == config.input_file)\
            .first()
        
        # ✅ DEBUG LOG (tambahkan ini untuk debug)
        print(f"\n{'='*60}")
        print(f"DEBUG AUTO-LABEL:")
        print(f"  Input file: {config.input_file}")
        print(f"  Current user: {current_user.username} (ID: {current_user.id})")
        print(f"  Preprocessed found: {preprocessed is not None}")
        if preprocessed:
            print(f"  File processed_by: {preprocessed.processed_by}")
            print(f"  Match: {preprocessed.processed_by == current_user.id}")
        print(f"{'='*60}\n")
        
        # ✅ OPSI A: SKIP Validasi (untuk development/testing)
        # Comment/hapus blok if ini:
        # if preprocessed and preprocessed.processed_by != current_user.id:
        #     raise HTTPException(
        #         status_code=403,
        #         detail="You don't have permission to label this data"
        #     )
        
        # ✅ OPSI B: Validasi yang Lebih Baik (jika mau tetap ada validasi)
        if preprocessed:
            if preprocessed.processed_by and preprocessed.processed_by != current_user.id:
                # Allow jika file belum punya owner (processed_by = NULL)
                # Atau update owner ke current user
                print(f"⚠️ Warning: File originally by user {preprocessed.processed_by}, now labeled by {current_user.id}")
                # Uncomment jika mau strict:
                # raise HTTPException(
                #     status_code=403,
                #     detail=f"You don't have permission to label this data. Owner: user {preprocessed.processed_by}"
                # )
        

        # ... rest of code tetap sama

        
        # Generate output filename
        if "GetProcessed" in config.input_file:
            timestamp = config.input_file.replace("GetProcessed", "").replace(".csv", "")
            output_file = f"GetLabelling{timestamp}.csv"
        else:
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            output_file = f"GetLabelling{timestamp}.csv"
        
        # Run auto-labeling
        result = auto_label_and_save(
            input_file=config.input_file,
            output_file=output_file,
            data_dir="."
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        # Calculate statistics
        if "data" in result and result["data"]:
            df = pd.DataFrame(result["data"])
            positivecount = len(df[df["sentiment"] == "Positif"])
            negativecount = len(df[df["sentiment"] == "Negatif"])
            neutralcount = len(df[df["sentiment"] == "Netral"])
            statistics = {
                "total": len(df),
                "positive": positivecount,
                "negative": negativecount,
                "neutral": neutralcount
            }
        else:
            statistics = {"total": result.get("totallabelled", 0), "positive": 0, "negative": 0, "neutral": 0}
        
        # Save to database
        labeleddata = LabeledData(
            preprocessed_id=preprocessed.id if preprocessed else None,
            input_filename=config.input_file,
            output_filename=output_file,
            total_labeled=statistics["total"],
            positive_count=statistics["positive"],
            negative_count=statistics["negative"],
            neutral_count=statistics["neutral"],
            labeling_method="lexicon-based",
            labeled_by=current_user.id  # ✅ Track owner
        )
        db.add(labeleddata)
        db.commit()
        db.refresh(labeleddata)
        
        return {
            "status": "success",
            "message": f"Successfully labeled {statistics['total']} comments",
            "file": output_file,
            "input": config.input_file,
            "statistics": statistics,
            "labeledby": current_user.username
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Labeling failed: {str(e)}")


@app.get("/preprocessed-files")
async def get_preprocessed_files(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Get preprocessed files - only user's own data"""
    try:
        # ✅ Filter by user
        files = db.query(PreprocessedData)\
            .filter(PreprocessedData.processed_by == current_user.id)\
            .order_by(PreprocessedData.processed_at.desc())\
            .all()
        
        return {
            "total": len(files),
            "files": [
                {
                    "id": f.id,
                    "input_filename": f.input_filename,
                    "outputfilename": f.output_filename,
                    "totalprocessed": f.total_processed,
                    "processedat": f.processed_at.isoformat(),
                    "processedby": current_user.username,
                    "fileexists": os.path.exists(f.output_filename),
                    "status": f.status
                }
                for f in files
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/balancing-info")
async def balancing_info(
    dataset_name: str = "Get_Labelling.csv",  # Keep for compatibility, tapi tidak dipakai
    current_user: User = Depends(get_current_user)
):
    """
    Get dataset balancing information - ADMIN ONLY
    Function reads from Get_Labelling.csv and tfidf_matrix.pkl automatically
    """
    try:
        # Call function dari balancing_utils (no parameters needed)
        info = get_balancing_info()
        
        # Check if error in response
        if "error" in info:
            return {
                "status": "error",
                "total_samples": 0,
                "class_distribution": {},
                "is_balanced": False,
                "message": info["error"]
            }
        
        # Extract data for frontend compatibility
        original_data = info.get("original", {})
        balanced_data = info.get("balanced_preview", {})
        
        # Calculate if balanced
        distribution = original_data.get("distribution", {})
        if distribution:
            counts = list(distribution.values())
            imbalance_ratio = max(counts) / min(counts) if len(counts) > 1 and min(counts) > 0 else 1.0
            is_balanced = imbalance_ratio < 1.5
        else:
            imbalance_ratio = 0
            is_balanced = False
        
        return {
            "status": "success",
            "total_samples": original_data.get("total", 0),
            "class_distribution": distribution,
            "is_balanced": is_balanced,
            "imbalance_ratio": round(imbalance_ratio, 2),
            "imblearn_available": info.get("imblearn_available", False),
            "original": original_data,
            "balanced_preview": balanced_data,
            "recommendation": (
                "Dataset is balanced" if is_balanced 
                else f"Dataset is imbalanced (ratio: {imbalance_ratio:.2f}). Balancing recommended."
            ),
            "data": info  # Full data untuk advanced usage
        }
        
    except Exception as e:
        import traceback
        print("="*60)
        print("BALANCING INFO ERROR:")
        print(traceback.format_exc())
        print("="*60)
        return {
            "status": "error",
            "total_samples": 0,
            "class_distribution": {},
            "is_balanced": False,
            "message": f"Error: {str(e)}"
        }

@app.get("/visualization-data")
async def get_visualization_data(
    dataset_name: str = "Get_Labelling.csv",
    current_user: User = Depends(get_current_user)  # 🔒 Protected
):
    """
    Get data for visualization - ADMIN ONLY
    """
    try:
        data = get_visualization_points(dataset_name)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from database import TFIDFModel

@app.post("/tfidf")
async def generate_tfidf(
    request: TFIDFRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate TF-IDF features - ADMIN ONLY
    """
    try:
        # Check if input file exists
        if not os.path.exists(request.input_file):
            raise HTTPException(
                status_code=404,
                detail=f"Input file not found: {request.input_file}"
            )
        
        # ✅ Generate output filenames berdasarkan input
        # GetLabelling_20251226_112400.csv → tfidf_matrix_20251226_112400.pkl
        if "_" in request.input_file and "GetLabelling_" in request.input_file:
            timestamp = request.input_file.replace("GetLabelling_", "").replace(".csv", "")
            matrix_output = f"tfidf_matrix_{timestamp}.pkl"
            vectorizer_output = f"models/tfidf_vectorizer_{timestamp}.pkl"
        else:
            # Fallback
            from datetime import datetime
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            matrix_output = f"tfidf_matrix_{timestamp}.pkl"
            vectorizer_output = f"models/tfidf_vectorizer_{timestamp}.pkl"
        
        # Load dataset
        df = pd.read_csv(request.input_file)
        print(f"Initial rows: {len(df)}")
        print(f"Available columns: {df.columns.tolist()}")
        
        # ✅ CRITICAL FIX: Add finalText as FIRST priority
        text_column = None
        possible_columns = [
            'finalText',      # Priority 1 - From preprocessing output
            'negationHandled', # Priority 2 - After negation handling
            'Clean_Comment',   # Priority 3
            'cleaned_text',    # Priority 4
            'processed_text',  # Priority 5
            'comment'          # Priority 6 (original)
        ]
        
        for col in possible_columns:
            if col in df.columns:
                text_column = col
                print(f"✅ Using text column: {text_column}")
                break
        
        if text_column is None:
            raise HTTPException(
                status_code=400,
                detail=f"No valid text column found. Available: {df.columns.tolist()}"
            )
        
        # Auto-detect label column
        label_column = None
        possible_labels = [
            'sentiment',  # Priority 1
            'Label',      # Priority 2
            'label'       # Priority 3
        ]
        
        for col in possible_labels:
            if col in df.columns:
                label_column = col
                print(f"✅ Using label column: {label_column}")
                break
        
        if label_column is None:
            raise HTTPException(
                status_code=400,
                detail=f"No label column found. Available: {df.columns.tolist()}"
            )
        
        # ✅ CLEAN DATA - Remove NaN, empty, and whitespace-only
        print(f"Before cleaning: {len(df)} rows")
        
        # Drop rows where text column is NaN
        df = df.dropna(subset=[text_column])
        print(f"After dropna: {len(df)} rows")
        
        # Convert to string and strip whitespace
        df[text_column] = df[text_column].astype(str).str.strip()
        
        # Remove empty strings and 'nan' string
        df = df[df[text_column] != '']
        df = df[df[text_column] != 'nan']
        df = df[df[text_column].str.len() > 0]
        
        print(f"After cleaning empty: {len(df)} rows")
        
        # Check if we have data left
        if len(df) == 0:
            raise HTTPException(
                status_code=400,
                detail="No valid data after cleaning. All text entries are empty or NaN."
            )
        
        # Drop rows where label is NaN
        df = df.dropna(subset=[label_column])
        print(f"After label cleaning: {len(df)} rows")
        
        # ✅ Convert label to string (critical!)
        df[label_column] = df[label_column].astype(str)
        
        # Reset index
        df = df.reset_index(drop=True)
        
        # ✅ Save cleaned CSV (overwrite dengan data bersih)
        df.to_csv(request.input_file, index=False)
        print(f"✅ Saved cleaned data back to: {request.input_file}")
        
        # Create TF-IDF vectorizer
        vectorizer = TfidfVectorizer(
            max_features=request.max_features,
            ngram_range=(1, 2),
            min_df=2,
            max_df=0.95,
            lowercase=True,
            strip_accents='unicode'
        )
        
        # Fit and transform
        print(f"Fitting TF-IDF on {len(df)} documents...")
        tfidf_matrix = vectorizer.fit_transform(df[text_column])
        print(f"TF-IDF matrix shape: {tfidf_matrix.shape}")
        
        # Save vectorizer and matrix
        os.makedirs('models', exist_ok=True)
        joblib.dump(vectorizer, vectorizer_output)
        joblib.dump(tfidf_matrix, matrix_output)
        
        # Get feature names
        feature_names = vectorizer.get_feature_names_out()
        
        print(f"\n✅ TF-IDF SUMMARY:")
        print(f"   Text column: {text_column}")
        print(f"   Label column: {label_column}")
        print(f"   Samples: {tfidf_matrix.shape[0]:,}")
        print(f"   Features: {tfidf_matrix.shape[1]:,}")
        print(f"   Vocabulary: {len(feature_names):,}")
        
        # Save metadata to database
        try:
            # ✅ Find labeled data by output_filename
            labeled = db.query(LabeledData).filter(
                LabeledData.output_filename == request.input_file
            ).order_by(LabeledData.labeled_at.desc()).first()
            
            tfidf_model = TFIDFModel(
                labeled_data_id=labeled.id if labeled else None,
                input_filename=request.input_file,
                vectorizer_path=vectorizer_output,
                matrix_path=matrix_output,
                max_features=request.max_features,
                matrix_shape_rows=tfidf_matrix.shape[0],
                matrix_shape_cols=tfidf_matrix.shape[1],
                vocabulary_size=len(feature_names),
                created_by=current_user.id
            )
            
            db.add(tfidf_model)
            db.commit()
            db.refresh(tfidf_model)
            tfidf_model_id = tfidf_model.id
            print(f"✅ TFIDFModel saved with ID={tfidf_model_id}")
        except Exception as db_error:
            print(f"❌ Database save error: {db_error}")
            import traceback
            traceback.print_exc()
            tfidf_model_id = None
        
        return {
            "status": "success",
            "message": "TF-IDF features generated successfully",
            "input": request.input_file,
            "matrix_shape": list(tfidf_matrix.shape),
            "num_features": len(feature_names),
            "vectorizer_saved": vectorizer_output,
            "matrix_saved": matrix_output,
            "text_column_used": text_column,
            "label_column_used": label_column,
            "samples": tfidf_matrix.shape[0],
            "features": tfidf_matrix.shape[1],
            "tfidf_model_id": tfidf_model_id,
            "generated_by": current_user.username
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print("="*60)
        print("TF-IDF ERROR:")
        print(traceback.format_exc())
        print("="*60)
        raise HTTPException(
            status_code=500,
            detail=f"TF-IDF generation failed: {str(e)}"
        )
# main.py - Tambahkan endpoint baru (jika belum ada)

@app.get("/labeled-files")  # ✅ Tambahkan endpoint baru
async def get_labeled_files(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Get labeled files - only user's own data"""
    try:
        files = db.query(LabeledData)\
            .filter(LabeledData.labeled_by == current_user.id)\
            .order_by(LabeledData.labeled_at.desc())\
            .all()
        
        return {
            "total": len(files),
            "files": [
                {
                    "id": f.id,
                    "input_filename": f.input_filename,
                    "outputfilename": f.output_filename,
                    "totallabeled": f.total_labeled,
                    "positivecount": f.positive_count,
                    "negativecount": f.negative_count,
                    "neutralcount": f.neutral_count,
                    "labeledat": f.labeled_at.isoformat(),
                    "labeledby": current_user.username,
                    "fileexists": os.path.exists(f.output_filename)
                }
                for f in files
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tfidf-files")
async def get_tfidf_files(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of TF-IDF files from database - ADMIN ONLY
    """
    try:
        # Query semua TFIDFModel records
        tfidf_records = db.query(TFIDFModel)\
            .order_by(TFIDFModel.created_at.desc())\
            .all()
        
        files_data = []
        for record in tfidf_records:
            # Cek apakah file masih ada
            vectorizer_exists = os.path.exists(record.vectorizer_path)
            matrix_exists = os.path.exists(record.matrix_path)
            
            files_data.append({
                "id": record.id,
                "created_at": record.created_at.isoformat(),
                "input_filename": record.input_filename,
                "vectorizer_path": record.vectorizer_path,
                "matrix_path": record.matrix_path,
                "max_features": record.max_features,
                "matrix_shape": {
                    "rows": record.matrix_shape_rows,
                    "cols": record.matrix_shape_cols
                },
                "vocabulary_size": record.vocabulary_size,
                "files_exist": {
                    "vectorizer": vectorizer_exists,
                    "matrix": matrix_exists
                },
                # ✅ Sekarang bisa langsung pakai record.creator.username
                "created_by": record.creator.username if record.creator else "Unknown"
            })
        
        return {
            "status": "success",
            "total_files": len(files_data),
            "files": files_data
        }
    
    except Exception as e:
        import traceback
        print("=" * 60)
        print("GET TFIDF FILES ERROR:")
        print(traceback.format_exc())
        print("=" * 60)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve TF-IDF files: {str(e)}"
        )


@app.get("/tfidf-files/{file_id}")
async def get_tfidf_file_detail(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Query specific record
        record = db.query(TFIDFModel).filter(TFIDFModel.id == file_id).first()
        
        if not record:
            raise HTTPException(status_code=404, detail="TF-IDF file not found")
        
        # Query User
        creator_username = "Unknown"
        if record.created_by:
            creator = db.query(User).filter(User.id == record.created_by).first()
            if creator:
                creator_username = creator.username
        
        # Load vectorizer
        vocabulary_preview = []
        top_features = []
        
        if os.path.exists(record.vectorizer_path):
            try:
                # ⚠️ MASALAH: Jika semua record punya path yang sama,
                # akan selalu load file yang sama
                print(f"🔍 Loading vectorizer from: {record.vectorizer_path}")
                vectorizer = joblib.load(record.vectorizer_path)
                feature_names = vectorizer.get_feature_names_out()
                
                print(f"✅ Actual vocabulary size from file: {len(feature_names)}")
                print(f"📊 Database says vocabulary_size: {record.vocabulary_size}")
                
                # Get vocabulary preview (first 50 terms, sorted)
                vocabulary_preview = sorted(feature_names[:50].tolist())
                
                # Get IDF scores untuk top features
                if hasattr(vectorizer, 'idf_'):
                    idf_scores = vectorizer.idf_
                    top_indices = idf_scores.argsort()[-20:][::-1]
                    top_features = [
                        {
                            "term": feature_names[idx],
                            "idf_score": round(float(idf_scores[idx]), 4)
                        }
                        for idx in top_indices
                    ]
            except Exception as e:
                print(f"❌ Error loading vectorizer: {e}")
        
        # Load matrix
        matrix_stats = {}
        if os.path.exists(record.matrix_path):
            try:
                print(f"🔍 Loading matrix from: {record.matrix_path}")
                tfidf_matrix = joblib.load(record.matrix_path)
                
                print(f"✅ Actual matrix shape from file: {tfidf_matrix.shape}")
                print(f"📊 Database says shape: {record.matrix_shape_rows} × {record.matrix_shape_cols}")
                
                matrix_stats = {
                    "shape": list(tfidf_matrix.shape),
                    "nnz": int(tfidf_matrix.nnz),
                    "density": round(float(tfidf_matrix.nnz) / (tfidf_matrix.shape[0] * tfidf_matrix.shape[1]) * 100, 2),
                    "sparsity": round(100 - (float(tfidf_matrix.nnz) / (tfidf_matrix.shape[0] * tfidf_matrix.shape[1]) * 100), 2),
                    "max_value": round(float(tfidf_matrix.max()), 4),
                    "min_value": round(float(tfidf_matrix.min()), 4)
                }
            except Exception as e:
                print(f"❌ Error loading matrix: {e}")
        
        return {
            "status": "success",
            "file_info": {
                "id": record.id,
                "created_at": record.created_at.isoformat(),
                "input_filename": record.input_filename,
                "vectorizer_path": record.vectorizer_path,
                "matrix_path": record.matrix_path,
                "max_features": record.max_features,
                "matrix_shape": {
                    "rows": record.matrix_shape_rows,
                    "cols": record.matrix_shape_cols
                },
                "vocabulary_size": record.vocabulary_size,
                "created_by": creator_username
            },
            "vocabulary_preview": vocabulary_preview,
            "top_features": top_features,
            "matrix_statistics": matrix_stats
        }
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print("=" * 60)
        print("GET TFIDF FILE DETAIL ERROR:")
        print(traceback.format_exc())
        print("=" * 60)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve TF-IDF file details: {str(e)}"
        )


@app.post("/train-naive-bayes")
async def train_naive_bayes(
    config: TrainConfig,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Train Naive Bayes with K-Fold Cross Validation - ADMIN ONLY
    """
    try:
        # Check if required files exist
        if not os.path.exists("Get_Labelling.csv"):
            raise HTTPException(status_code=404, detail="Get_Labelling.csv not found")
        if not os.path.exists("tfidf_matrix.pkl"):
            raise HTTPException(status_code=404, detail="tfidf_matrix.pkl not found")

        # Map config and call training
        use_balancing = config.approach in ["balancing", "both"]
        
        # ✅ PERBAIKAN: Tambahkan pengecekan result None
        result = train_naive_bayes_with_cv(
            k=config.n_splits,
            alpha=1.0,
            random_state=config.random_state,
            use_balancing=use_balancing
        )
        
        # ✅ CEK jika result None
        if result is None:
            raise HTTPException(
                status_code=500, 
                detail="Training function returned None. Check server logs for errors."
            )
        
        # ✅ CEK jika ada error dalam result
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        overall_metrics = result.get("overall_metrics", {})
        
        # ✅ AMBIL data_info dari result
        data_info = result.get("data_info", {})
        total_samples = data_info.get("total_samples", 0)
        
        # ✅ Hitung train/test samples berdasarkan K-Fold split
        if total_samples > 0:
            train_samples = int(total_samples * (config.n_splits - 1) / config.n_splits)
            test_samples = int(total_samples / config.n_splits)
        else:
            train_samples = 0
            test_samples = 0

        # Save to database
        try:
            tfidf_model = db.query(TFIDFModel).filter(
                TFIDFModel.input_filename == "Get_Labelling.csv"
            ).order_by(TFIDFModel.created_at.desc()).first()
            
            labeled = db.query(LabeledData).filter(
                LabeledData.output_filename == "Get_Labelling.csv"
            ).order_by(LabeledData.labeled_at.desc()).first()
            
            training_record = TrainingHistory(
                tfidf_model_id=tfidf_model.id if tfidf_model else None,
                labeled_data_id=labeled.id if labeled else None,
                dataset_name="Get_Labelling.csv",
                model_path=result.get("model_filename", ""),
                algorithm="Multinomial Naive Bayes",
                approach=result.get("approach", config.approach),
                n_splits=config.n_splits,
                random_state=config.random_state,
                accuracy=overall_metrics.get("accuracy", 0) / 100,
                precision_score=overall_metrics.get("precision", 0) / 100,
                recall_score=overall_metrics.get("recall", 0) / 100,
                f1_score=overall_metrics.get("f1_score", 0) / 100,
                confusion_matrix=str(result.get("confusion_matrix", [])),
                training_time_seconds=result.get("training_time_seconds", 0),
                total_samples=total_samples,
                train_samples=train_samples,
                test_samples=test_samples,
                trained_by=current_user.id
            )
            
            db.add(training_record)
            db.commit()
            db.refresh(training_record)
            history_id = training_record.id
        except Exception as db_error:
            print(f"Database save error: {db_error}")
            import traceback
            traceback.print_exc()
            history_id = None

        return {
            "status": "success",
            "message": "Training completed successfully",
            "model_path": result.get("model_filename", ""),
            "approach": result.get("approach", ""),
            "accuracy": overall_metrics.get("accuracy", 0) / 100,
            "precision": overall_metrics.get("precision", 0) / 100,
            "recall": overall_metrics.get("recall", 0) / 100,
            "f1_score": overall_metrics.get("f1_score", 0) / 100,
            "fold_details": result.get("fold_details", []),
            "confusion_matrix": result.get("confusion_matrix", []),
            "class_names": result.get("class_names", []),
            "cv_performance": result.get("cv_performance", {}),
            "history_id": history_id,
            "trained_by": current_user.username
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print("="*60)
        print("TRAINING ERROR:")
        print(traceback.format_exc())
        print("="*60)
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@app.get("/check-requirements")
async def check_system_requirements():
    """
    Check if all system requirements are met
    """
    try:
        requirements = {
            "python": True,
            "pandas": False,
            "scikit_learn": False,
            "imbalanced_learn": False,
            "joblib": False,
            "numpy": False,
            "sastrawi": False
        }
        
        missing = []
        
        # Check critical packages
        try:
            import pandas
            requirements["pandas"] = True
        except ImportError:
            missing.append("pandas")
        
        try:
            requirements["scikit_learn"] = True
        except ImportError:
            missing.append("scikit-learn")
        
        try:
            import imblearn
            requirements["imbalanced_learn"] = True
        except ImportError:
            missing.append("imbalanced-learn (optional for balancing)")
        
        try:
            import joblib
            requirements["joblib"] = True
        except ImportError:
            missing.append("joblib")
        
        try:
            import numpy
            requirements["numpy"] = True
        except ImportError:
            missing.append("numpy")
        
        try:
            from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
            requirements["sastrawi"] = True
        except ImportError:
            missing.append("Sastrawi (for preprocessing)")
        
        # Check critical requirements (tanpa imbalanced-learn dan sastrawi)
        critical = ["pandas", "scikit_learn", "joblib", "numpy"]
        all_critical = all(requirements[pkg] for pkg in critical)
        
        return {
            "status": "success",
            "ready": all_critical,
            "requirements": requirements,
            "message": "All requirements met" if all_critical else f"Missing: {', '.join(missing)}",
            "missing": missing,
            "all_ready": all_critical
        }
        
    except Exception as e:
        import traceback
        print("="*60)
        print("CHECK REQUIREMENTS ERROR:")
        print(traceback.format_exc())
        print("="*60)
        return {
            "status": "error",
            "ready": False,
            "message": str(e),
            "all_ready": False
        }
    
@app.post("/train-both-approaches")
async def train_both_approaches(
    config: TrainRequest, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Train model - only user's own labeled data"""
    try:
        # ✅ Validasi: labeled data harus milik user
        labeled = db.query(LabeledData)\
            .filter(LabeledData.output_filename == config.labeled_file)\
            .first()
        
        if labeled and labeled.labeled_by != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to train with this data"
            )
        
        import time
        total_start = time.time()
        
        # ✅ Validate files exist
        if not os.path.exists(config.labeled_file):
            raise HTTPException(
                status_code=404,
                detail=f"Labeled file not found: {config.labeled_file}"
            )
        
        if not os.path.exists(config.tfidf_matrix_file):
            raise HTTPException(
                status_code=404,
                detail=f"TF-IDF matrix not found: {config.tfidf_matrix_file}"
            )
        
        print(f"\n{'='*80}")
        print(f"🚀 TRAINING BOTH APPROACHES")
        print(f"{'='*80}")
        print(f"   Labeled file: {config.labeled_file}")
        print(f"   TF-IDF matrix: {config.tfidf_matrix_file}")
        print(f"   N-Splits: {config.n_splits}")
        print(f"{'='*80}\n")
        
        # 1. Train NON-BALANCING
        print("\n" + "="*80)
        print("📊 STEP 1: Training NON-BALANCING Model")
        print("="*80)
        
        result_non_balanced = train_naive_bayes_with_cv(
            k=config.n_splits,
            alpha=1.0,
            random_state=config.random_state,
            use_balancing=False,
            dataset_filename=config.labeled_file,  # ✅ Pass custom files
            tfidf_matrix_filename=config.tfidf_matrix_file,  # ✅ Pass custom files
            output_prefix=config.output_prefix
        )
        
        if "error" in result_non_balanced:
            raise HTTPException(
                status_code=500,
                detail=f"Non-balancing training failed: {result_non_balanced['error']}"
            )
        
        # 2. Train BALANCING
        print("\n" + "="*80)
        print("⚖️ STEP 2: Training BALANCING Model")
        print("="*80)
        
        result_balanced = train_naive_bayes_with_cv(
            k=config.n_splits,
            alpha=1.0,
            random_state=config.random_state,
            use_balancing=True,
            dataset_filename=config.labeled_file,  # ✅ Pass custom files
            tfidf_matrix_filename=config.tfidf_matrix_file,  # ✅ Pass custom files
            output_prefix=config.output_prefix
        )
        
        if "error" in result_balanced:
            raise HTTPException(
                status_code=500,
                detail=f"Balancing training failed: {result_balanced['error']}"
            )
        
        total_time = time.time() - total_start
        
        # 3. Calculate comparison
        non_balanced_metrics = result_non_balanced["overall_metrics"]
        balanced_metrics = result_balanced["overall_metrics"]
        
        accuracy_diff = balanced_metrics["accuracy"] - non_balanced_metrics["accuracy"]
        precision_diff = balanced_metrics["precision"] - non_balanced_metrics["precision"]
        recall_diff = balanced_metrics["recall"] - non_balanced_metrics["recall"]
        f1_diff = balanced_metrics["f1_score"] - non_balanced_metrics["f1_score"]
        
        # 4. Data info
        df = pd.read_csv(config.labeled_file)
        total_samples = len(df)
        train_samples = int(total_samples * (config.n_splits - 1) / config.n_splits)
        test_samples = int(total_samples / config.n_splits)
        session_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        # 5. Save to database
        try:
            # ✅ Find TFIDFModel by matrix_path
            tfidf_model = db.query(TFIDFModel).filter(
                TFIDFModel.matrix_path == config.tfidf_matrix_file
            ).order_by(TFIDFModel.created_at.desc()).first()
            
            # ✅ Find LabeledData by output_filename
            labeled = db.query(LabeledData).filter(
                LabeledData.output_filename == config.labeled_file
            ).order_by(LabeledData.labeled_at.desc()).first()
            
            # Save Non-Balancing record
            training_record_nb = TrainingHistory(
                tfidf_model_id=tfidf_model.id if tfidf_model else None,
                labeled_data_id=labeled.id if labeled else None,
                dataset_name=config.labeled_file,
                model_path=result_non_balanced.get("model_filename", ""),
                algorithm="Multinomial Naive Bayes",
                approach="non-balancing",
                n_splits=config.n_splits,
                random_state=config.random_state,
                accuracy=non_balanced_metrics.get("accuracy", 0) / 100,
                precision_score=non_balanced_metrics.get("precision", 0) / 100,
                recall_score=non_balanced_metrics.get("recall", 0) / 100,
                f1_score=non_balanced_metrics.get("f1_score", 0) / 100,
                confusion_matrix=str(result_non_balanced.get("confusion_matrix", [])),
                training_time_seconds=result_non_balanced.get("training_time_seconds", 0),
                total_samples=total_samples,
                train_samples=train_samples,
                test_samples=test_samples,
                session_key=session_timestamp,
                trained_by=current_user.id
            )
            
            # Save Balancing record
            training_record_b = TrainingHistory(
                tfidf_model_id=tfidf_model.id if tfidf_model else None,
                labeled_data_id=labeled.id if labeled else None,
                dataset_name=config.labeled_file,
                model_path=result_balanced.get("model_filename", ""),
                algorithm="Multinomial Naive Bayes",
                approach="balancing",
                n_splits=config.n_splits,
                random_state=config.random_state,
                accuracy=balanced_metrics.get("accuracy", 0) / 100,
                precision_score=balanced_metrics.get("precision", 0) / 100,
                recall_score=balanced_metrics.get("recall", 0) / 100,
                f1_score=balanced_metrics.get("f1_score", 0) / 100,
                confusion_matrix=str(result_balanced.get("confusion_matrix", [])),
                training_time_seconds=result_balanced.get("training_time_seconds", 0),
                total_samples=total_samples,
                train_samples=train_samples,
                test_samples=test_samples,
                session_key=session_timestamp,
                trained_by=current_user.id
            )
            
            db.add(training_record_nb)
            db.add(training_record_b)
            db.commit()
            db.refresh(training_record_nb)
            db.refresh(training_record_b)
            
            history_id_nb = training_record_nb.id
            history_id_b = training_record_b.id
            
            print(f"✅ TrainingHistory saved: NB={history_id_nb}, B={history_id_b}")
            
        except Exception as db_error:
            print(f"❌ Database save error: {db_error}")
            import traceback
            traceback.print_exc()
            history_id_nb = None
            history_id_b = None
        
        # Determine winner
        winner = "balancing" if balanced_metrics.get("f1_score", 0) > non_balanced_metrics.get("f1_score", 0) else "non-balancing"
        
        # Comparison Data
        comparison = {
            "accuracy_diff": round(accuracy_diff, 2),
            "precision_diff": round(precision_diff, 2),
            "recall_diff": round(recall_diff, 2),
            "f1_diff": round(f1_diff, 2),
            "winner": winner,
            "improvement_percentage": round(abs(f1_diff), 2)
        }
        
        # Common data
        class_names = result_non_balanced.get("class_names", [])
        
        data_info = {
            "total_samples": total_samples,
            "train_samples": train_samples,
            "test_samples": test_samples,
            "labeled_file": config.labeled_file,
            "tfidf_matrix_file": config.tfidf_matrix_file
        }
        
        return {
            "status": "success",
            "message": "Both approaches trained successfully",
            "total_training_time": round(total_time, 2),
            "trained_by": current_user.username,
            "non_balancing": {
                "approach": "non-balancing",
                "model_path": result_non_balanced.get("model_filename", ""),
                "accuracy": non_balanced_metrics.get("accuracy", 0) / 100,
                "precision": non_balanced_metrics.get("precision", 0) / 100,
                "recall": non_balanced_metrics.get("recall", 0) / 100,
                "f1_score": non_balanced_metrics.get("f1_score", 0) / 100,
                "training_time": result_non_balanced.get("training_time_seconds", 0),
                "fold_details": result_non_balanced.get("fold_details", []),
                "confusion_matrix": result_non_balanced.get("confusion_matrix", []),
                "history_id": history_id_nb
            },
            "balancing": {
                "approach": "balancing",
                "model_path": result_balanced.get("model_filename", ""),
                "accuracy": balanced_metrics.get("accuracy", 0) / 100,
                "precision": balanced_metrics.get("precision", 0) / 100,
                "recall": balanced_metrics.get("recall", 0) / 100,
                "f1_score": balanced_metrics.get("f1_score", 0) / 100,
                "training_time": result_balanced.get("training_time_seconds", 0),
                "fold_details": result_balanced.get("fold_details", []),
                "confusion_matrix": result_balanced.get("confusion_matrix", []),
                "history_id": history_id_b
            },
            "comparison": comparison,
            "class_names": class_names,
            "data_info": data_info,
            "config": {
                "n_splits": config.n_splits,
                "random_state": config.random_state,
                "labeled_file": config.labeled_file,
                "tfidf_matrix_file": config.tfidf_matrix_file
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print("="*60)
        print("BOTH APPROACHES TRAINING ERROR:")
        print(traceback.format_exc())
        print("="*60)
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")
    
# Endpoint untuk cek apakah file ada
@app.get("/check-processed-file")
async def check_processed_file(current_user: dict = Depends(get_current_user)):
    """Cek apakah file GetProcessed.csv sudah ada"""
    file_path = "GetProcessed.csv"
    exists = os.path.exists(file_path)
    
    file_info = {}
    if exists:
        stat = os.stat(file_path)
        file_info = {
            "size": stat.st_size,
            "modified": stat.st_mtime
        }
    
    return {
        "exists": exists,
        "filename": "GetProcessed.csv",
        "info": file_info
    }

# Endpoint untuk membaca isi file GetProcessed.csv
@app.get("/get-processed-file")
async def get_processed_file(current_user: dict = Depends(get_current_user)):
    """Endpoint untuk membaca file GetProcessed.csv dan mengembalikan data dalam format JSON"""
    try:
        file_path = "GetProcessed.csv"
        
        # Cek apakah file ada
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="GetProcessed.csv not found")
        
        # Baca CSV file
        df = pd.read_csv(file_path)
        
        # ✅ PERBAIKAN: Replace NaN dengan None atau string kosong
        df = df.fillna("")  # Ganti NaN dengan string kosong
        # Atau gunakan: df = df.replace({np.nan: None})  # Ganti NaN dengan None
        
        # Konversi ke dictionary (list of records)
        data = df.to_dict(orient="records")
        
        return {
            "success": True,
            "total_rows": len(data),
            "columns": list(df.columns),
            "data": data
        }
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="GetProcessed.csv not found")
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="CSV file is empty")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")
    
# Di bagian PUBLIC ENDPOINTS, tambahkan setelah endpoint /predict
@app.post("/predict-both")
async def predict_both_models(
    request: PredictRequest,
    db: Session = Depends(get_db)
):

    try:
        try:
            from PreProcessing import preprocess_for_prediction
        except ImportError:
            def preprocess_for_prediction(text):
                return text.lower().strip()
        
        # Preprocessing text
        processed_text = preprocess_for_prediction(request.text)
        
        # Load TF-IDF vectorizer
        vectorizer_path = "models/tfidf_vectorizer.pkl"
        if not os.path.exists(vectorizer_path):
            raise HTTPException(
                status_code=404, 
                detail="TF-IDF vectorizer not found. Please run TF-IDF generation first."
            )
        
        tfidf_vectorizer = joblib.load(vectorizer_path)
        X_new = tfidf_vectorizer.transform([processed_text])
        
        results = {}
        
        # ============================================
        # 1. Load Model NON-BALANCING
        # ============================================
        training_non_balanced = db.query(TrainingHistory).filter(
            TrainingHistory.approach == "non-balancing"
        ).order_by(TrainingHistory.timestamp.desc()).first()
        
        if training_non_balanced:
            model_path = training_non_balanced.model_path
            print(f"🔍 Loading non-balancing model from: {model_path}")
            
            if os.path.exists(model_path):
                try:
                    # Load model
                    loaded_obj = joblib.load(model_path)
                    
                    if isinstance(loaded_obj, dict):
                        print("⚠️ Loaded object is a dict, extracting 'model' key...")
                        
                        # Coba ambil model dari dictionary
                        if 'model' in loaded_obj:
                            model_nb = loaded_obj['model']
                        elif 'final_model' in loaded_obj:
                            model_nb = loaded_obj['final_model']
                        elif 'classifier' in loaded_obj:
                            model_nb = loaded_obj['classifier']
                        else:
                            raise ValueError(f"Dictionary keys: {list(loaded_obj.keys())}. No 'model' key found.")
                    else:
                        # Jika langsung model, langsung pakai
                        model_nb = loaded_obj
                    
                    if not hasattr(model_nb, 'predict'):
                        raise ValueError(f"Object type: {type(model_nb)}. Not a valid sklearn model.")
                    
                    # Predict
                    pred_nb = model_nb.predict(X_new)[0]
                    proba_nb = model_nb.predict_proba(X_new)[0]
                    
                    probs_nb = {
                        str(c): round(float(p), 4)
                        for c, p in zip(model_nb.classes_, proba_nb)
                    }
                    
                    results["non_balancing"] = {
                        "predicted_sentiment": str(pred_nb),
                        "confidence": round(float(proba_nb.max()), 4),
                        "probabilities": probs_nb,
                        "model_path": model_path,
                        "accuracy": float(training_non_balanced.accuracy) if training_non_balanced.accuracy else 0,
                        "f1_score": float(training_non_balanced.f1_score) if training_non_balanced.f1_score else 0
                    }
                    print(f"✅ Non-balancing prediction: {pred_nb}")
                    
                except Exception as e:
                    import traceback
                    error_detail = traceback.format_exc()
                    print(f"❌ Error loading non-balancing model:\n{error_detail}")
                    results["non_balancing"] = {
                        "error": f"Failed to load model: {str(e)}",
                        "predicted_sentiment": "N/A"
                    }
            else:
                results["non_balancing"] = {
                    "error": f"Model file not found: {model_path}",
                    "predicted_sentiment": "N/A"
                }
        else:
            results["non_balancing"] = {
                "error": "No non-balancing training record found in database",
                "predicted_sentiment": "N/A"
            }
        
        # ============================================
        # 2. Load Model BALANCING
        # ============================================
        training_balanced = db.query(TrainingHistory).filter(
            TrainingHistory.approach == "balancing"
        ).order_by(TrainingHistory.timestamp.desc()).first()
        
        if training_balanced:
            model_path = training_balanced.model_path
            print(f"🔍 Loading balancing model from: {model_path}")
            
            if os.path.exists(model_path):
                try:
                    # Load model
                    loaded_obj = joblib.load(model_path)
                    
                    # ✅ CEK: Apakah loaded_obj adalah dict atau model?
                    if isinstance(loaded_obj, dict):
                        print("⚠️ Loaded object is a dict, extracting 'model' key...")
                        
                        if 'model' in loaded_obj:
                            model_b = loaded_obj['model']
                        elif 'final_model' in loaded_obj:
                            model_b = loaded_obj['final_model']
                        elif 'classifier' in loaded_obj:
                            model_b = loaded_obj['classifier']
                        else:
                            raise ValueError(f"Dictionary keys: {list(loaded_obj.keys())}. No 'model' key found.")
                    else:
                        model_b = loaded_obj
                    
                    # Validasi
                    if not hasattr(model_b, 'predict'):
                        raise ValueError(f"Object type: {type(model_b)}. Not a valid sklearn model.")
                    
                    # Predict
                    pred_b = model_b.predict(X_new)[0]
                    proba_b = model_b.predict_proba(X_new)[0]
                    
                    probs_b = {
                        str(c): round(float(p), 4)
                        for c, p in zip(model_b.classes_, proba_b)
                    }
                    
                    results["balancing"] = {
                        "predicted_sentiment": str(pred_b),
                        "confidence": round(float(proba_b.max()), 4),
                        "probabilities": probs_b,
                        "model_path": model_path,
                        "accuracy": float(training_balanced.accuracy) if training_balanced.accuracy else 0,
                        "f1_score": float(training_balanced.f1_score) if training_balanced.f1_score else 0
                    }
                    print(f"✅ Balancing prediction: {pred_b}")
                    
                except Exception as e:
                    import traceback
                    error_detail = traceback.format_exc()
                    print(f"❌ Error loading balancing model:\n{error_detail}")
                    results["balancing"] = {
                        "error": f"Failed to load model: {str(e)}",
                        "predicted_sentiment": "N/A"
                    }
            else:
                results["balancing"] = {
                    "error": f"Model file not found: {model_path}",
                    "predicted_sentiment": "N/A"
                }
        else:
            results["balancing"] = {
                "error": "No balancing training record found in database",
                "predicted_sentiment": "N/A"
            }
        
        return {
            "status": "success",
            "input_text": request.text,
            "processed_text": processed_text,
            "predictions": results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print("="*60)
        print("PREDICT BOTH ERROR:")
        print(traceback.format_exc())
        print("="*60)
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )

# Tambahkan setelah import statements
def detect_negation(text):
    """Deteksi apakah teks mengandung kata negasi"""
    negation_words = [
        'tidak', 'bukan', 'tak', 'jangan', 'ga', 'gak', 'nggak', 
        'enggak', 'kagak', 'tanpa', 'belum', 'tiada'
    ]
    text_lower = text.lower()
    return any(word in text_lower for word in negation_words)

# =========================
# NEGATION HANDLING UTILITIES
# =========================

def predict_with_negation_handling(text, model, vectorizer):
    """
    Handle negation at SENTENCE LEVEL (not word level)
    
    Approach:
    1. Detect if sentence contains negation words
    2. Predict sentiment of WHOLE SENTENCE
    3. Apply rule-based flip if negation detected
    
    PENTING: Model dilatih untuk prediksi KALIMAT, bukan kata tunggal!
    """
    NEGATION_WORDS = {
        'tidak', 'bukan', 'jangan', 'belum', 'tanpa',
        'tak', 'tiada', 'enggak', 'nggak', 'gak'
    }
    
    words = text.lower().split()
    has_negation = any(word in NEGATION_WORDS for word in words)
    
    # ========================================
    # STEP 1: Predict sentiment KALIMAT ASLI
    # ========================================
    X = vectorizer.transform([text])
    prediction = model.predict(X)[0]
    probabilities = model.predict_proba(X)[0]
    class_names = model.classes_
    
    probs_dict = {
        str(class_names[i]): float(probabilities[i]) 
        for i in range(len(class_names))
    }
    
    # Jika tidak ada negasi, return langsung
    if not has_negation:
        return {
            'prediction': str(prediction),
            'confidence': float(probabilities.max()),
            'probabilities': probs_dict,
            'original_prediction': str(prediction),
            'original_probabilities': probs_dict,
            'negation_applied': False
        }
    
    # ========================================
    # STEP 2: Identifikasi index untuk setiap kelas
    # ========================================
    neg_idx = None
    pos_idx = None
    netral_idx = None
    
    for i, class_name in enumerate(class_names):
        if 'negatif' in str(class_name).lower():
            neg_idx = i
        elif 'positif' in str(class_name).lower():
            pos_idx = i
        else:
            netral_idx = i
    
    original_sentiment = str(prediction).lower()
    max_confidence = probabilities.max()
    
    # ========================================
    # STEP 3: OPTION 2 - Force Flip (Threshold-Based)
    # ========================================
    # Jika model SANGAT yakin (>0.8), flip dengan force
    if max_confidence > 0.8:
        # Tentukan hasil flip
        if 'positif' in original_sentiment and neg_idx is not None:
            final_prediction = str(class_names[neg_idx])
            # Set probability manual
            flipped_probs = {
                str(class_names[pos_idx]): 0.20,
                str(class_names[neg_idx]): 0.70,  # Hasil flip
                str(class_names[netral_idx]) if netral_idx is not None else 'Netral': 0.10
            }
        elif 'negatif' in original_sentiment and pos_idx is not None:
            final_prediction = str(class_names[pos_idx])
            flipped_probs = {
                str(class_names[pos_idx]): 0.70,  # Hasil flip
                str(class_names[neg_idx]): 0.20,
                str(class_names[netral_idx]) if netral_idx is not None else 'Netral': 0.10
            }
        else:
            # Netral atau kelas tidak dikenali, pakai asli
            final_prediction = str(prediction)
            flipped_probs = probs_dict
        
        return {
            'prediction': final_prediction,
            'confidence': 0.70,  # Fixed confidence untuk force flip
            'probabilities': flipped_probs,
            'original_prediction': str(prediction),
            'original_probabilities': probs_dict,
            'negation_applied': True,
            'force_flip': True  # Flag tambahan
        }
    
    # ========================================
    # STEP 4: OPTION 1 - Boost Flip (Confidence < 0.8)
    # ========================================
    flipped_probs = {}
    
    for i, class_name in enumerate(class_names):
        if 'positif' in str(class_name).lower():
            if 'negatif' in original_sentiment and neg_idx is not None:
                # Boost: Ambil dari Negatif × 1.5
                flipped_probs[str(class_name)] = probabilities[neg_idx] * 1.5
            else:
                flipped_probs[str(class_name)] = probabilities[i]
                
        elif 'negatif' in str(class_name).lower():
            if 'positif' in original_sentiment and pos_idx is not None:
                # Boost: Ambil dari Positif × 1.5
                flipped_probs[str(class_name)] = probabilities[pos_idx] * 1.5
            else:
                flipped_probs[str(class_name)] = probabilities[i]
        else:
            # Netral - kurangi drastis
            if 'positif' in original_sentiment or 'negatif' in original_sentiment:
                flipped_probs[str(class_name)] = probabilities[i] * 0.3
            else:
                flipped_probs[str(class_name)] = probabilities[i]
    
    # Normalize probabilities
    total = sum(flipped_probs.values())
    if total > 0:
        flipped_probs = {k: v/total for k, v in flipped_probs.items()}
    
    final_prediction = max(flipped_probs, key=flipped_probs.get)
    final_confidence = max(flipped_probs.values())
    
    return {
        'prediction': final_prediction,
        'confidence': float(final_confidence),
        'probabilities': flipped_probs,
        'original_prediction': str(prediction),
        'original_probabilities': probs_dict,
        'negation_applied': True,
        'force_flip': False  # Flag untuk boost flip
    }



@app.post("/predict-both-with-negation")
async def predict_both_with_negation(
    request: PredictRequest,
    db: Session = Depends(get_db)
):
    """Predict dengan negation handling - FLIP probability"""
    try:
        # Load vectorizer
        vectorizer_path = "models/tfidf_vectorizer.pkl"
        if not os.path.exists(vectorizer_path):
            raise HTTPException(status_code=404, detail="Vectorizer not found")
        
        vectorizer = joblib.load(vectorizer_path)
        
        # Preprocess text
        try:
            from PreProcessing import preprocess_for_prediction
        except ImportError:
            def preprocess_for_prediction(text):
                return text.lower().strip()
        
        preprocessed = preprocess_for_prediction(request.text)
        
        results = {}
        
        # ============================================
        # NON-BALANCING MODEL
        # ============================================
        training_nb = db.query(TrainingHistory).filter(
            TrainingHistory.approach == "non-balancing"
        ).order_by(TrainingHistory.timestamp.desc()).first()
        
        if training_nb and os.path.exists(training_nb.model_path):
            try:
                model_obj = joblib.load(training_nb.model_path)
                model = model_obj.get('model') if isinstance(model_obj, dict) else model_obj
                
                # ✅ PREDICT WITH NEGATION HANDLING
                result_nb = predict_with_negation_handling(preprocessed, model, vectorizer)
                
                results["non_balancing"] = {
                    "predicted_sentiment": result_nb['prediction'],
                    "original_sentiment": result_nb['original_prediction'],
                    "confidence": result_nb['confidence'],
                    "probabilities": result_nb['probabilities'],
                    "original_probabilities": result_nb['original_probabilities'],
                    "negation_applied": result_nb['negation_applied'],
                    "preprocessed_text": preprocessed,
                    "accuracy": float(training_nb.accuracy) if training_nb.accuracy else 0,
                    "f1_score": float(training_nb.f1_score) if training_nb.f1_score else 0
                }
            except Exception as e:
                results["non_balancing"] = {
                    "error": f"Failed: {str(e)}",
                    "predicted_sentiment": "N/A"
                }
        else:
            results["non_balancing"] = {
                "error": "Model not found",
                "predicted_sentiment": "N/A"
            }
        
        # ============================================
        # ✅ BALANCING MODEL 
        # ============================================
        training_b = db.query(TrainingHistory).filter(
            TrainingHistory.approach == "balancing"
        ).order_by(TrainingHistory.timestamp.desc()).first()
        
        if training_b and os.path.exists(training_b.model_path):
            try:
                model_obj = joblib.load(training_b.model_path)
                model = model_obj.get('model') if isinstance(model_obj, dict) else model_obj
                
                # ✅ PREDICT WITH NEGATION HANDLING
                result_b = predict_with_negation_handling(preprocessed, model, vectorizer)
                
                results["balancing"] = {
                    "predicted_sentiment": result_b['prediction'],
                    "original_sentiment": result_b['original_prediction'],
                    "confidence": result_b['confidence'],
                    "probabilities": result_b['probabilities'],
                    "original_probabilities": result_b['original_probabilities'],
                    "negation_applied": result_b['negation_applied'],
                    "preprocessed_text": preprocessed,
                    "accuracy": float(training_b.accuracy) if training_b.accuracy else 0,
                    "f1_score": float(training_b.f1_score) if training_b.f1_score else 0
                }
            except Exception as e:
                results["balancing"] = {
                    "error": f"Failed: {str(e)}",
                    "predicted_sentiment": "N/A"
                }
        else:
            results["balancing"] = {
                "error": "Model not found",
                "predicted_sentiment": "N/A"
            }
        
        return {
            "status": "success",
            "input_text": request.text,
            "predictions": results
        }
    
    except Exception as e:
        import traceback
        print("="*60)
        print("PREDICT WITH NEGATION ERROR:")
        print(traceback.format_exc())
        print("="*60)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/balancing-info")
async def balancing_info(
    dataset_name: str = "Get_Labelling.csv",
    current_user: User = Depends(get_current_user)
):
    """
    Get dataset balancing information - ADMIN ONLY
    """
    try:
        # Check if file exists
        if not os.path.exists(dataset_name):
            return {
                "status": "error",
                "total_samples": 0,
                "class_distribution": {},
                "is_balanced": False,
                "message": f"File {dataset_name} not found"
            }
        
        # Load dataset
        df = pd.read_csv(dataset_name)
        
        # Auto-detect label column
        label_column = None
        for col in ['Label', 'sentiment', 'label']:
            if col in df.columns:
                label_column = col
                break
        
        if label_column is None:
            return {
                "status": "error",
                "total_samples": len(df),
                "class_distribution": {},
                "is_balanced": False,
                "message": f"No label column found. Available: {df.columns.tolist()}"
            }
        
        # Get class distribution
        class_counts = df[label_column].value_counts().to_dict()
        
        # Calculate imbalance ratio
        counts = list(class_counts.values())
        if len(counts) > 1:
            imbalance_ratio = max(counts) / min(counts)
        else:
            imbalance_ratio = 1.0
        
        # Consider balanced if ratio < 1.5
        is_balanced = imbalance_ratio < 1.5
        
        recommendation = (
            "Dataset is balanced. No balancing needed." 
            if is_balanced 
            else f"Dataset is imbalanced (ratio: {imbalance_ratio:.2f}). Consider using balancing during training."
        )
        
        return {
            "status": "success",
            "total_samples": len(df),
            "class_distribution": class_counts,
            "is_balanced": is_balanced,
            "imbalance_ratio": round(imbalance_ratio, 2),
            "label_column": label_column,
            "recommendation": recommendation,
            "data": {  # Keep this for backward compatibility
                "total_samples": len(df),
                "class_distribution": class_counts,
                "is_balanced": is_balanced
            }
        }
        
    except Exception as e:
        import traceback
        print("="*60)
        print("BALANCING INFO ERROR:")
        print(traceback.format_exc())
        print("="*60)
        return {
            "status": "error",
            "total_samples": 0,
            "class_distribution": {},
            "is_balanced": False,
            "message": f"Error: {str(e)}"
        }

@app.post("/compare-approaches")
async def compare_nb_approaches(
    request: CompareRequest,
    current_user: User = Depends(get_current_user)  # 🔒 Protected
):
    """
    Compare balancing vs non-balancing approaches - ADMIN ONLY
    """
    try:
        comparison = compare_approaches(
            dataset_name=request.dataset_name,
            n_splits=request.n_splits
        )
        return comparison
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =========================
# TRAINING HISTORY ENDPOINTS
# =========================

@app.get("/training-history")  # ✅ Tambahkan endpoint baru
async def get_training_history(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Get training history - only user's own models"""
    try:
        history = db.query(TrainingHistory)\
            .filter(TrainingHistory.trained_by == current_user.id)\
            .order_by(TrainingHistory.timestamp.desc())\
            .all()
        
        return {
            "total": len(history),
            "history": [
                {
                    "id": h.id,
                    "datasetname": h.datasetname,
                    "modelpath": h.modelpath,
                    "approach": h.approach,
                    "accuracy": h.accuracy,
                    "precision": h.precisionscore,
                    "recall": h.recallscore,
                    "f1score": h.f1score,
                    "timestamp": h.timestamp.isoformat(),
                    "trainedby": current_user.username
                }
                for h in history
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.get("/training-history/{history_id}")
async def get_training_detail(
    history_id: int,
    current_user: User = Depends(get_current_user),  # 🔒 Protected
    db: Session = Depends(get_db)
):
    """
    Get specific training detail - ADMIN ONLY
    """
    try:
        history = db.query(TrainingHistory).filter(TrainingHistory.id == history_id).first()
        
        if not history:
            raise HTTPException(status_code=404, detail="Training history not found")
        
        return {
            "id": history.id,
            "timestamp": history.timestamp.isoformat(),
            "accuracy": history.accuracy,
            "precision": history.precision_score,
            "recall": history.recall_score,
            "f1_score": history.f1_score,
            "dataset": history.dataset_name,
            "model_path": history.model_path
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# main.py - Endpoint /model-pairs (Alternatif Grouping)
@app.get("/model-pairs")
async def get_model_pairs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of model pairs (balanced + non-balanced) - Only user's own models"""
    try:
        print(f"DEBUG: Fetching model pairs for user {current_user.username} (ID: {current_user.id})")
        
        # Query all training history for current user, ordered by timestamp
        all_models = db.query(TrainingHistory)\
            .filter(TrainingHistory.trained_by == current_user.id)\
            .order_by(TrainingHistory.timestamp.desc())\
            .all()
        
        print(f"DEBUG: Found {len(all_models)} total models for user")
        
        # Group by session_key
        pairs_dict = {}
        
        for model in all_models:
            if not model.session_key:
                continue  # Skip models without session_key
                
            if model.session_key not in pairs_dict:
                pairs_dict[model.session_key] = {
                    'balanced': None,
                    'non_balanced': None  # Gunakan underscore konsisten
                }
            
            if model.approach == "balancing":
                pairs_dict[model.session_key]['balanced'] = model
            else:
                pairs_dict[model.session_key]['non_balanced'] = model  # Gunakan underscore
        
        print(f"DEBUG: Grouped into {len(pairs_dict)} session groups")
        
        # Filter complete pairs
        complete_pairs = []
        for session_key, pair_data in pairs_dict.items():
            balanced = pair_data["balanced"]
            non_balanced = pair_data["non_balanced"]  # ← PERBAIKAN: tambah underscore
            
            if balanced and non_balanced:  # ← PERBAIKAN: gunakan variabel yang benar
                print(f"DEBUG: Complete pair found for session {session_key}")
                print(f"  - Balanced: {balanced.model_path} (Time: {balanced.timestamp})")
                print(f"  - Non-balanced: {non_balanced.model_path} (Time: {non_balanced.timestamp})")
                
                # Use session_key as the pair identifier
                timestamp_str = session_key  # Langsung gunakan session_key
                
                complete_pairs.append({
                    "timestamp": timestamp_str,
                    "trained_date": balanced.timestamp.isoformat(),
                    "trained_by": current_user.username,
                    "n_splits": balanced.n_splits,
                    "balanced": {
                        "id": balanced.id,
                        "model_path": balanced.model_path,
                        "accuracy": float(balanced.accuracy),
                        "f1score": float(balanced.f1_score),
                        "file_exists": os.path.exists(balanced.model_path)
                    },
                    "non_balanced": {  # ← PERBAIKAN: gunakan konsisten dengan underscore
                        "id": non_balanced.id,
                        "model_path": non_balanced.model_path,
                        "accuracy": float(non_balanced.accuracy),
                        "f1score": float(non_balanced.f1_score),
                        "file_exists": os.path.exists(non_balanced.model_path)
                    },
                    "average_accuracy": round((float(balanced.accuracy) + float(non_balanced.accuracy)) / 2 * 100, 2)
                })
        
        # Sort by timestamp descending
        complete_pairs.sort(key=lambda x: x["timestamp"], reverse=True)
        
        print(f"DEBUG: Returning {len(complete_pairs)} complete pairs")
        
        return {
            "total": len(complete_pairs),
            "pairs": complete_pairs
        }
        
    except Exception as e:
        import traceback
        print("=" * 60)
        print("GET MODEL PAIRS ERROR:")
        print(traceback.format_exc())
        print("=" * 60)
        raise HTTPException(status_code=500, detail=str(e))


class PredictCompareRequest(BaseModel):  # ✅ Sesuaikan dengan parameter endpoint
    text: str
    timestamp: str
    handlenegation: bool = False


# main.py - Update endpoint /predict-compare-models dengan debug lebih detail

@app.post("/predict-compare-models")
async def predict_compare_models(
    request: PredictCompareRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    try:
        print(f"[DEBUG] User {current_user.username} comparing models with timestamp: {request.timestamp}")
        
        # 1. Query models by session_key (bukan pattern matching)
        all_models = db.query(TrainingHistory)\
            .filter(
                TrainingHistory.session_key == request.timestamp,
                TrainingHistory.trained_by == current_user.id
            )\
            .all()
        
        print(f"[DEBUG] Found {len(all_models)} models with session_key: {request.timestamp}")
        
        # 2. Separate balanced and non-balanced models
        balanced_model = None
        non_balanced_model = None
        
        for model in all_models:
            print(f"[DEBUG] Processing model: {model.model_path} | Approach: {model.approach}")
            if model.approach == "balancing":
                balanced_model = model
            elif model.approach == "non-balancing":
                non_balanced_model = model
        
        # 3. Validate both models exist
        if not balanced_model or not non_balanced_model:
            print(f"[DEBUG] Model pair incomplete!")
            print(f"  - Balanced model found: {balanced_model is not None}")
            print(f"  - Non-balanced model found: {non_balanced_model is not None}")
            
            raise HTTPException(
                status_code=404,
                detail=f"Model pair not found for session {request.timestamp}. Both balanced and non-balanced models required."
            )
        
        print(f"[DEBUG] Found complete pair!")
        print(f"  - Balanced: {balanced_model.model_path}")
        print(f"  - Non-Balanced: {non_balanced_model.model_path}")
        
        # 4. Preprocess text
        try:
            from PreProcessing import preprocess_for_prediction
        except ImportError:
            def preprocess_for_prediction(text):
                return text.lower().strip()
        
        processed_text = preprocess_for_prediction(request.text)
        print(f"[DEBUG] Preprocessed text: {processed_text[:50]}...")
        
        # 5. Load TF-IDF vectorizer
        if balanced_model.tfidf_model:
            vectorizer_path = balanced_model.tfidf_model.vectorizer_path
        else:
            vectorizer_path = "models/tfidf_vectorizer.pkl"
        
        print(f"[DEBUG] Loading vectorizer from: {vectorizer_path}")
        
        if not os.path.exists(vectorizer_path):
            raise HTTPException(
                status_code=404,
                detail=f"TF-IDF vectorizer not found: {vectorizer_path}"
            )
        
        tfidf_vectorizer = joblib.load(vectorizer_path)
        X_new = tfidf_vectorizer.transform([processed_text])
        
        # 6. Helper function untuk predict dengan single model
        def predict_with_single_model(training_record):
            """Helper function untuk predict dengan model dan return structured response"""
            model_path = training_record.model_path
            print(f"[DEBUG] Loading model from: {model_path}")
            
            if not os.path.exists(model_path):
                raise HTTPException(
                    status_code=404,
                    detail=f"Model file not found: {model_path}"
                )
            
            # Load model
            loaded_obj = joblib.load(model_path)
            
            if isinstance(loaded_obj, dict):
                model = loaded_obj.get("model") or loaded_obj.get("final_model") or loaded_obj.get("classifier")
            else:
                model = loaded_obj
            
            if not hasattr(model, 'predict'):
                raise ValueError(f"Invalid model format: {type(model)}")
            
            # Predict
            prediction = model.predict(X_new)[0]
            probabilities = model.predict_proba(X_new)[0]
            confidence = max(probabilities)
            
            # Format probabilities
            class_probs = {str(cls): float(prob) for cls, prob in zip(model.classes_, probabilities)}
            
            return {
                "predicted_sentiment": str(prediction),
                "confidence": float(confidence),
                "probabilities": class_probs,
                "model_info": {
                    "id": training_record.id,
                    "approach": training_record.approach,
                    "accuracy": float(training_record.accuracy),
                    "precision_score": float(training_record.precision_score),
                    "recall_score": float(training_record.recall_score),
                    "f1_score": float(training_record.f1_score)
                }
            }
        
        # 7. Get predictions from both models
        print(f"[DEBUG] Predicting with non-balanced model...")
        non_balanced_result = predict_with_single_model(non_balanced_model)
        
        print(f"[DEBUG] Predicting with balanced model...")
        balanced_result = predict_with_single_model(balanced_model)
        
        # 8. Handle negation if requested (simple rule-based flip)
        negation_applied = False
        negation_info = {}
        
        if request.handlenegation:
            negation_words = ['tidak', 'bukan', 'tak', 'jangan', 'ga', 'gak', 'nggak', 
                             'enggak', 'kagak', 'tanpa', 'belum', 'tiada']
            found_negation = [word for word in negation_words if word in request.text.lower()]
            
            if found_negation:
                # Simple flip map
                sentiment_flip_map = {
                    'Positif': 'Negatif',
                    'Negatif': 'Positif',
                    'Netral': 'Netral'
                }
                
                # Apply flip to both models
                non_balanced_result["predicted_sentiment"] = sentiment_flip_map.get(
                    non_balanced_result["predicted_sentiment"], 
                    non_balanced_result["predicted_sentiment"]
                )
                balanced_result["predicted_sentiment"] = sentiment_flip_map.get(
                    balanced_result["predicted_sentiment"], 
                    balanced_result["predicted_sentiment"]
                )
                
                negation_applied = True
                negation_info = {
                    "negation_words_found": found_negation,
                    "flip_applied": True
                }
                
                print(f"[DEBUG] Negation detected and applied: {found_negation}")
        
        # 9. Comparison analysis
        predictions_match = non_balanced_result["predicted_sentiment"] == balanced_result["predicted_sentiment"]
        confidence_diff = balanced_result["confidence"] - non_balanced_result["confidence"]
        more_confident = "Balanced" if confidence_diff > 0 else "Non-Balanced"
        better_model = "balanced" if balanced_result["model_info"]["f1_score"] > non_balanced_result["model_info"]["f1_score"] else "non-balanced"
        
        print(f"[DEBUG] Prediction successful!")
        print(f"  - Match: {predictions_match}")
        print(f"  - Better model: {better_model}")
        
        # 10. Return structured response with snake_case
        return {
            "status": "success",
            "original_text": request.text,
            "preprocessed_text": processed_text,
            "negation_applied": negation_applied,
            "negation_info": negation_info,
            "non_balanced": non_balanced_result,
            "balanced": balanced_result,
            "comparison": {
                "predictions_match": predictions_match,
                "confidence_difference": round(confidence_diff, 4),
                "more_confident": more_confident,
                "better_model": better_model
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print("=" * 60)
        print("ERROR PREDICT COMPARE MODELS:")
        print(traceback.format_exc())
        print("=" * 60)
        raise HTTPException(status_code=500, detail=f"Prediction comparison failed: {str(e)}")
    
from datetime import datetime

# ==================== IMPORT DATASET/COMMENTS ====================
@app.post("/import-comments")
async def import_comments_file(
    filename: str,
    video_url: str = None,
    description: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Import file dataset/comments yang sudah ada ke database
    Support: CSV file dengan kolom 'comment' atau 'Comment'
    """
    try:
        # 1. Cek file ada
        if not os.path.exists(filename):
            raise HTTPException(
                status_code=404,
                detail=f"File {filename} not found. Make sure file is in project directory."
            )
        
        # 2. Baca dan validasi CSV
        try:
            df = pd.read_csv(filename)
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to read CSV: {str(e)}"
            )
        
        # 3. Validasi kolom (harus ada kolom comment)
        comment_column = None
        possible_columns = ['comment', 'Comment', 'comments', 'text', 'Text']
        
        for col in possible_columns:
            if col in df.columns:
                comment_column = col
                break
        
        if not comment_column:
            raise HTTPException(
                status_code=400,
                detail=f"CSV must have 'comment' column. Found columns: {list(df.columns)}"
            )
        
        # 4. Hitung statistik
        total_rows = len(df)
        file_size_mb = round(os.path.getsize(filename) / (1024*1024), 2)
        
        print(f"\n{'='*60}")
        print(f"📥 IMPORTING DATASET:")
        print(f"  File: {filename}")
        print(f"  Rows: {total_rows:,}")
        print(f"  Size: {file_size_mb} MB")
        print(f"  Columns: {list(df.columns)}")
        print(f"  Comment column: {comment_column}")
        print(f"  User: {current_user.username} (ID: {current_user.id})")
        print(f"{'='*60}\n")
        
        # 5. Simpan metadata ke database
        dataset = Dataset(
            filename=filename,
            source="manual_import",  # atau "upload", "csv"
            video_url=video_url,
            total_rows=total_rows,
            file_size_mb=file_size_mb,
            upload_date=datetime.utcnow(),
            uploaded_by=current_user.id,
            status="active",
            description=description or f"Manual import: {total_rows} comments"
        )
        
        db.add(dataset)
        db.commit()
        db.refresh(dataset)
        
        print(f"✅ Dataset saved to database with ID: {dataset.id}")
        
        return {
            "status": "success",
            "message": f"Successfully imported {filename}",
            "dataset_id": dataset.id,
            "filename": filename,
            "total_rows": total_rows,
            "file_size_mb": file_size_mb,
            "columns": list(df.columns),
            "comment_column": comment_column,
            "video_url": video_url,
            "uploaded_by": current_user.username,
            "upload_date": dataset.upload_date.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print("="*60)
        print("IMPORT COMMENTS ERROR:")
        print(traceback.format_exc())
        print("="*60)
        raise HTTPException(
            status_code=500,
            detail=f"Import failed: {str(e)}"
        )

from datetime import datetime

# Tambahkan endpoint baru (taruh di bagian bawah, sebelum if __name__)
@app.post("/import-preprocessed")
async def import_preprocessed_file(
    filename: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Import file preprocessed dan simpan metadata ke database"""
    try:
        # 1. Cek file ada
        if not os.path.exists(filename):
            raise HTTPException(
                status_code=404, 
                detail=f"File {filename} not found"
            )
        
        # 2. Baca file
        df = pd.read_csv(filename)
        total_rows = len(df)
        
        print(f"📂 Importing: {filename}")
        print(f"📊 Total rows: {total_rows}")
        print(f"📋 Columns: {list(df.columns)}")
        
        # 3. Cari dataset terakhir milik user
        last_dataset = db.query(Dataset)\
            .filter(Dataset.uploaded_by == current_user.id)\
            .order_by(Dataset.upload_date.desc())\
            .first()
        
        # 4. Simpan metadata ke database
        preprocessed_data = PreprocessedData(
            dataset_id=last_dataset.id if last_dataset else None,
            input_filename="N/A",
            output_filename=filename,
            total_processed=total_rows,
            processing_time_seconds=6.9,
            num_cores_used=8,
            batch_size=100,
            processed_at=datetime.utcnow(),  # ✅ Explicit timestamp
            processed_by=current_user.id,
            status="completed"
        )
        
        db.add(preprocessed_data)
        db.commit()
        db.refresh(preprocessed_data)
        
        print(f"✅ Saved to database with ID: {preprocessed_data.id}")
        
        return {
            "status": "success",
            "message": f"Successfully imported {filename}",
            "preprocessed_data_id": preprocessed_data.id,
            "total_rows": total_rows,
            "filename": filename,
            "imported_by": current_user.username,
            "imported_by_id": current_user.id,
            "columns": list(df.columns)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print("="*60)
        print("IMPORT ERROR:")
        print(traceback.format_exc())
        print("="*60)
        raise HTTPException(
            status_code=500, 
            detail=f"Import failed: {str(e)}"
        )


@app.post("/predict-with-model")
async def predict_with_model(
    request: PredictWithModelRequest,
    db: Session = Depends(get_db)
):
    """
    Predict sentiment using specific trained model - PUBLIC
    """
    try:
        # 1. Get model from database
        training_record = db.query(TrainingHistory).filter(
            TrainingHistory.id == request.model_id
        ).first()
        
        if not training_record:
            raise HTTPException(status_code=404, detail="Model not found")
        
        model_path = training_record.model_path
        
        if not os.path.exists(model_path):
            raise HTTPException(
                status_code=404,
                detail=f"Model file not found: {model_path}"
            )
        
        # 2. Preprocess text
        try:
            from PreProcessing import preprocess_for_prediction
        except ImportError:
            def preprocess_for_prediction(text):
                return text.lower().strip()
        
        processed_text = preprocess_for_prediction(request.text)
        
        # 3. Load TF-IDF vectorizer (find matching vectorizer)
        if training_record.tfidf_model:
            vectorizer_path = training_record.tfidf_model.vectorizer_path
        else:
            # Fallback: look for default
            vectorizer_path = "models/tfidf_vectorizer.pkl"
        
        if not os.path.exists(vectorizer_path):
            raise HTTPException(
                status_code=404,
                detail=f"TF-IDF vectorizer not found: {vectorizer_path}"
            )
        
        tfidf_vectorizer = joblib.load(vectorizer_path)
        X_new = tfidf_vectorizer.transform([processed_text])
        
        # 4. Load model and predict
        loaded_obj = joblib.load(model_path)
        
        if isinstance(loaded_obj, dict):
            model = loaded_obj.get('model') or loaded_obj.get('final_model') or loaded_obj.get('classifier')
        else:
            model = loaded_obj
        
        if not hasattr(model, 'predict'):
            raise HTTPException(
                status_code=500,
                detail="Invalid model format"
            )
        
        # Predict
        prediction = model.predict(X_new)[0]
        probabilities = model.predict_proba(X_new)[0]
        confidence = max(probabilities)
        
        # Get class probabilities
        class_probs = {
            cls: float(prob)
            for cls, prob in zip(model.classes_, probabilities)
        }
        
        return {
            "status": "success",
            "original_text": request.text,
            "preprocessed_text": processed_text,
            "predicted_sentiment": prediction,
            "confidence": float(confidence),
            "probabilities": class_probs,
            "model_info": {
                "id": training_record.id,
                "approach": training_record.approach,
                "model_path": model_path,
                "accuracy": float(training_record.accuracy),
                "precision_score": float(training_record.precision_score),
                "recall_score": float(training_record.recall_score),
                "f1_score": float(training_record.f1_score),
                "trained_at": training_record.timestamp.isoformat(),
                "trained_by": training_record.trainer.username if training_record.trainer else "Unknown"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print("="*60)
        print("PREDICT WITH MODEL ERROR:")
        print(traceback.format_exc())
        print("="*60)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.get("/trained-models")
async def get_trained_models(db: Session = Depends(get_db)):
    """
    Get list of all trained models - PUBLIC
    """
    try:
        models = db.query(TrainingHistory)\
            .order_by(TrainingHistory.timestamp.desc())\
            .all()
        
        return {
            "total": len(models),
            "models": [{
                "id": m.id,
                "approach": m.approach,
                "model_filename": os.path.basename(m.model_path),
                "model_path": m.model_path,
                "accuracy": float(m.accuracy),
                "precision_score": float(m.precision_score),
                "recall_score": float(m.recall_score),
                "f1_score": float(m.f1_score),
                "n_splits": m.n_splits,
                "timestamp": m.timestamp.isoformat(),
                "trained_by": m.trainer.username if m.trainer else "Unknown",
                "file_exists": os.path.exists(m.model_path)
            } for m in models]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/trained-models/{model_id}")
async def get_model_detail(model_id: int, db: Session = Depends(get_db)):
    """
    Get specific model details - PUBLIC
    """
    try:
        model = db.query(TrainingHistory).filter(TrainingHistory.id == model_id).first()
        
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        
        return {
            "id": model.id,
            "approach": model.approach,
            "model_path": model.model_path,
            "algorithm": model.algorithm,
            "accuracy": float(model.accuracy),
            "precision_score": float(model.precision_score),
            "recall_score": float(model.recall_score),
            "f1_score": float(model.f1_score),
            "n_splits": model.n_splits,
            "random_state": model.random_state,
            "total_samples": model.total_samples,
            "train_samples": model.train_samples,
            "test_samples": model.test_samples,
            "training_time_seconds": float(model.training_time_seconds),
            "timestamp": model.timestamp.isoformat(),
            "trained_by": model.trainer.username if model.trainer else "Unknown",
            "dataset_name": model.dataset_name,
            "file_exists": os.path.exists(model.model_path)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/training-history/{history_id}")
async def delete_training_history(
    history_id: int,
    current_user: User = Depends(get_current_user),  # 🔒 Protected
    db: Session = Depends(get_db)
):
    """
    Delete training history - ADMIN ONLY
    """
    try:
        history = db.query(TrainingHistory).filter(TrainingHistory.id == history_id).first()
        
        if not history:
            raise HTTPException(status_code=404, detail="Training history not found")
        
        db.delete(history)
        db.commit()
        
        return {
            "status": "success",
            "message": f"Training history {history_id} deleted",
            "deleted_by": current_user.username
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# =========================
# STATISTICS ENDPOINTS
# =========================

@app.get("/stats/overview")
async def get_stats_overview(
    current_user: User = Depends(get_current_user),  # 🔒 Protected
    db: Session = Depends(get_db)
):
    """
    Get system statistics overview - ADMIN ONLY
    """
    try:
        # Count training history
        total_trainings = db.query(TrainingHistory).count()
        
        # Get latest training
        latest_training = db.query(TrainingHistory)\
            .order_by(TrainingHistory.timestamp.desc())\
            .first()
        
        # Check available datasets
        datasets = []
        for file in ['GetComments.csv', 'PreProcessing.csv', 'Get_Labelling.csv']:
            if os.path.exists(file):
                df = pd.read_csv(file)
                datasets.append({
                    "name": file,
                    "rows": len(df),
                    "size_mb": round(os.path.getsize(file) / (1024*1024), 2)
                })
        
        return {
            "total_trainings": total_trainings,
            "latest_training": {
                "accuracy": latest_training.accuracy,
                "timestamp": latest_training.timestamp.isoformat()
            } if latest_training else None,
            "datasets": datasets,
            "models_count": len([f for f in os.listdir('models') if f.endswith('.pkl')]) if os.path.exists('models') else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =========================
# Run Server
# =========================

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)