# main.py
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from get_comments import get_youtube_comments
from balancing_utils import get_dataset_comparison, apply_balancing, load_labelled_and_tfidf
from Splitting_utils import get_dataset_info, split_dataset, check_split_exists
from PreProcessing import preprocess_comments, get_progress
from typing import List
import pandas as pd
from label_utils import label_text, get_latest_preprocessed
import os
from sklearn.feature_extraction.text import TfidfVectorizer
import joblib
import numpy as np
from sklearn.decomposition import PCA
from naive_bayes_utils import train_naive_bayes, compare_models, predict_new_text, get_model_info

app = FastAPI()

# CORS supaya bisa diakses dari React (localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RequestData(BaseModel):
    video_url: str
    max_comments: int

@app.post("/get-comments")
def fetch_comments(data: RequestData):
    try:
        comments = get_youtube_comments(data.video_url, data.max_comments)
        return {"comments": comments}
    except Exception as e:
        return {"error": str(e)}

@app.post("/preprocess")
def run_preprocessing():
    return preprocess_comments()

@app.get("/progress")
def progress():
    return get_progress()

# Fixed: Changed from @app.get to @app.post to match the frontend call
@app.post("/auto-label")
def auto_label():
    try:
        print("Starting auto labelling process...")
        latest_file, df = get_latest_preprocessed("./")
        
        if latest_file is None or df is None:
            return {"error": "Tidak ada file data ditemukan. Pastikan sudah melakukan preprocessing atau ada file GetComments.csv"}

        print(f"Found file: {latest_file} with {len(df)} rows")
        print(f"Columns: {list(df.columns)}")

        if "finalText" not in df.columns:
            return {"error": f"Kolom finalText tidak ditemukan. Kolom tersedia: {list(df.columns)}"}

        if len(df) == 0:
            return {"error": "File data kosong"}

        labelled = []
        for _, row in df.iterrows():
            text_to_label = row["finalText"] if pd.notna(row["finalText"]) else row.get("comment", "")
            if not text_to_label:
                continue
                
            sentiment, confidence = label_text(text_to_label)
            labelled.append({
                "id": row["id"],
                "comment": row.get("comment", ""),
                "finalText": row["finalText"],
                "sentiment": sentiment,
                "confidence": confidence,
                "labelMethod": "Auto"
            })

        if len(labelled) == 0:
            return {"error": "Tidak ada data valid untuk dilabeli"}

        print(f"Successfully labelled {len(labelled)} comments")
        return {"filename": os.path.basename(latest_file), "data": labelled}
        
    except Exception as e:
        print(f"Auto label error: {str(e)}")
        return {"error": f"Terjadi kesalahan: {str(e)}"}
    
@app.post("/tfidf")
def generate_tfidf():
    try:
        latest_file, df = get_latest_preprocessed("./")

        if latest_file is None or df is None:
            return {"error": "File PreProcessed tidak ditemukan"}

        if "finalText" not in df.columns:
            return {"error": "Kolom finalText tidak ditemukan"}

        texts = df["finalText"].astype(str).tolist()
        sentiments = df["sentiment"].tolist() if "sentiment" in df.columns else ["Unknown"] * len(df)

        vectorizer = TfidfVectorizer(
            max_features=5000,
            min_df=2,
            max_df=0.95
        )
        X = vectorizer.fit_transform(texts)

        joblib.dump(vectorizer, "tfidf_vectorizer.pkl")
        joblib.dump(X, "tfidf_matrix.pkl")

        feature_names = vectorizer.get_feature_names_out()
        top_features = feature_names[:20].tolist()

        # Ambil preview vektor dokumen
        vectors_preview = []
        for i in range(min(10, X.shape[0])):
            row = X[i].toarray()[0]
            nonzero_idx = row.nonzero()[0]
            vector_dict = {feature_names[j]: float(row[j]) for j in nonzero_idx[:5]}
            vectors_preview.append({
                "id": int(df.iloc[i]["id"]) if "id" in df.columns else i + 1,
                "comment": df.iloc[i].get("comment", ""),
                "finalText": df.iloc[i]["finalText"],
                "sentiment": sentiments[i],
                "tfidfVector": vector_dict,
                "vectorLength": len(nonzero_idx),
                "maxTfidf": float(row[nonzero_idx].max()) if len(nonzero_idx) > 0 else 0.0
            })

        return {
            "status": "success",
            "total_texts": len(texts),
            "num_features": len(feature_names),
            "top_features": top_features,
            "vectors": vectors_preview
        }

    except Exception as e:
        return {"error": f"Terjadi kesalahan saat TF-IDF: {str(e)}"}
    
@app.get("/tfidf-matrix")
def get_tfidf_matrix(limit_docs: int = 10, limit_features: int = 20):
    try:
        # load model/vectorizer & matrix
        vectorizer = joblib.load("tfidf_vectorizer.pkl")
        X = joblib.load("tfidf_matrix.pkl")

        feature_names = vectorizer.get_feature_names_out().tolist()
        df_matrix = pd.DataFrame(X.toarray(), columns=feature_names)

        # ambil subset
        preview = df_matrix.head(limit_docs).iloc[:, :limit_features]
        return {
            "features": preview.columns.tolist(),
            "data": preview.values.tolist()
        }
    except Exception as e:
        return {"error": f"Gagal mengambil matrix TF-IDF: {str(e)}"}

# Tambahkan endpoints ini ke main.py setelah endpoint /tfidf-matrix

@app.get("/dataset-comparison")
def dataset_comparison():
    """
    Mendapatkan perbandingan dataset original vs balanced
    """
    try:
        comparison = get_dataset_comparison()
        if comparison is None:
            return {"error": "Data tidak ditemukan"}
        return comparison
    except Exception as e:
        return {"error": f"Gagal mengambil perbandingan dataset: {str(e)}"}


@app.post("/apply-balancing")
def apply_data_balancing(method: str = "both"):
    """
    Menerapkan teknik balancing pada data
    
    Parameters:
    - method: "undersampling", "tomek", "both", atau "none"
    """
    try:
        if method not in ["undersampling", "tomek", "both", "none"]:
            return {"error": "Method harus salah satu dari: undersampling, tomek, both, none"}
        
        result = apply_balancing(method=method)
        
        if result is None:
            return {"error": "Gagal melakukan balancing. Pastikan TF-IDF sudah dijalankan."}
        
        return result
        
    except Exception as e:
        return {"error": f"Terjadi kesalahan saat balancing: {str(e)}"}

@app.get("/visualize-distribution")
def visualize_distribution(mode: str = "original", method: str = "pca", sample_size: int = 2000):
    """
    Endpoint untuk mengembalikan koordinat 2D hasil reduksi dimensi TF-IDF
    mode: "original" atau "balanced"
    """
    # load data sesuai mode
    if mode == "balanced":
        try:
            df = pd.read_csv("GetProcessed_Balanced.csv")
            X = joblib.load("tfidf_matrix_balanced.pkl")
        except:
            return {"error": "Data balanced belum tersedia, lakukan balancing dulu"}
    else:  # default: original
        df, X, _ = load_labelled_and_tfidf()
        if df is None or X is None:
            return {"error": "Data original tidak tersedia"}

    y = df["sentiment"].values

    # sampling biar ringan
    if len(y) > sample_size:
        idx = np.random.choice(len(y), sample_size, replace=False)
        X = X[idx]
        y = y[idx]
        df = df.iloc[idx]

    X_dense = X.toarray() if hasattr(X, "toarray") else X

    # reduksi dimensi
    if method.lower() == "pca":
        reducer = PCA(n_components=2, random_state=42)
        X_reduced = reducer.fit_transform(X_dense)
    else:
        return {"error": "Method hanya mendukung 'pca' untuk saat ini"}

    points = []
    for i, (x, y_coord) in enumerate(X_reduced):
        points.append({
            "x": float(x),
            "y": float(y_coord),
            "label": str(y[i])
        })

    return {"mode": mode, "points": points}

# ==================== DATA SPLITTING ENDPOINTS ====================

@app.get("/dataset-info")
def dataset_info():
    """
    Mendapatkan informasi dataset sebelum splitting
    """
    try:
        info = get_dataset_info()
        if info is None:
            return {"error": "Data tidak tersedia. Pastikan TF-IDF sudah dijalankan."}
        return info
    except Exception as e:
        return {"error": f"Gagal mengambil info dataset: {str(e)}"}


@app.post("/split-data")
def split_data(test_size: float = 0.2, random_state: int = 42, stratify: bool = True):
    """
    Memisahkan dataset menjadi training dan testing set
    
    Parameters:
    - test_size: proporsi data untuk testing (default 0.2 = 20%)
    - random_state: seed untuk reprodusibilitas
    - stratify: jika True, pertahankan proporsi kelas
    """
    try:
        if test_size <= 0 or test_size >= 1:
            return {"error": "test_size harus antara 0 dan 1"}
        
        result = split_dataset(test_size=test_size, random_state=random_state, stratify=stratify)
        
        if "error" in result:
            return result
        
        return result
        
    except Exception as e:
        return {"error": f"Terjadi kesalahan saat splitting: {str(e)}"}


@app.get("/split-status")
def split_status():
    """
    Cek apakah data sudah pernah di-split
    """
    try:
        status = check_split_exists()
        return status
    except Exception as e:
        return {"error": f"Gagal mengecek status split: {str(e)}"}

@app.get("/balanced-data")
def get_balanced_data(page: int = 1, page_size: int = 10):
    """
    Mendapatkan data yang sudah di-balance dengan pagination
    """
    try:
        df_balanced = pd.read_csv("GetProcessed_Balanced.csv")
        
        total = len(df_balanced)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        data_page = df_balanced.iloc[start_idx:end_idx]
        
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
            "data": data_page[["id", "comment", "finalText", "sentiment", "confidence"]].to_dict(orient="records")
        }
        
    except FileNotFoundError:
        return {"error": "Data balanced belum tersedia. Jalankan balancing terlebih dahulu."}
    except Exception as e:
        return {"error": f"Gagal mengambil data balanced: {str(e)}"}
    

# ==================== NAIVE BAYES ENDPOINTS ====================

@app.post("/train-naive-bayes")
def train_nb_model(approach: str = "balanced", alpha: float = 1.0, cv_folds: int = 5):
    """
    Training Multinomial Naive Bayes model
    
    Parameters:
    - approach: "imbalanced" atau "balanced"
    - alpha: Laplace smoothing parameter (default=1.0)
    - cv_folds: jumlah fold untuk cross-validation (default=5)
    """
    try:
        if approach not in ["imbalanced", "balanced"]:
            return {"error": "Approach harus 'imbalanced' atau 'balanced'"}
        
        result = train_naive_bayes(approach=approach, alpha=alpha, cv_folds=cv_folds)
        return result
        
    except Exception as e:
        return {"error": f"Gagal training Naive Bayes: {str(e)}"}


@app.get("/model-info")
def model_info(approach: str = "balanced"):
    """
    Mendapatkan informasi tentang model yang sudah dilatih
    """
    try:
        info = get_model_info(approach=approach)
        return info
    except Exception as e:
        return {"error": f"Gagal mengambil info model: {str(e)}"}


@app.get("/compare-models")
def models_comparison():
    """
    Membandingkan performa model imbalanced vs balanced
    """
    try:
        comparison = compare_models()
        return comparison
    except Exception as e:
        return {"error": f"Gagal membandingkan model: {str(e)}"}


@app.post("/predict-sentiment")
def predict_sentiment(text: str, approach: str = "balanced"):
    """
    Prediksi sentimen untuk teks baru
    """
    try:
        if not text or len(text.strip()) == 0:
            return {"error": "Teks tidak boleh kosong"}
        
        result = predict_new_text(text, approach=approach)
        return result
        
    except Exception as e:
        return {"error": f"Gagal prediksi sentimen: {str(e)}"}


@app.get("/predictions")
def get_predictions(approach: str = "balanced", page: int = 1, page_size: int = 20):
    """
    Mendapatkan hasil prediksi dengan pagination
    """
    try:
        predictions_df = pd.read_csv(f"predictions_{approach}.csv")
        
        total = len(predictions_df)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        data_page = predictions_df.iloc[start_idx:end_idx]
        
        # Format data
        formatted_data = []
        for _, row in data_page.iterrows():
            formatted_data.append({
                "id": int(row["id"]) if "id" in row else 0,
                "comment": row.get("comment", ""),
                "finalText": row.get("finalText", ""),
                "actual_sentiment": row["actual_sentiment"],
                "predicted_sentiment": row["predicted_sentiment"],
                "is_correct": bool(row["is_correct"]),
                "confidence": round(float(row["confidence"]) * 100, 2) if "confidence" in row else 0
            })
        
        return {
            "approach": approach,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
            "data": formatted_data
        }
        
    except FileNotFoundError:
        return {"error": f"Predictions untuk {approach} belum tersedia. Lakukan training terlebih dahulu."}
    except Exception as e:
        return {"error": f"Gagal mengambil predictions: {str(e)}"}


@app.get("/analysis-summary")
def get_analysis_summary():
    """
    Mendapatkan ringkasan analisis untuk kedua pendekatan
    """
    try:
        summary = {
            "imbalanced": {},
            "balanced": {}
        }
        
        for approach in ["imbalanced", "balanced"]:
            try:
                predictions_df = pd.read_csv(f"predictions_{approach}.csv")
                
                # Sentiment distribution
                pred_dist = Counter(predictions_df["predicted_sentiment"].values)
                
                # Calculate accuracy
                accuracy = (predictions_df["is_correct"].sum() / len(predictions_df)) * 100
                
                # Get confidence stats
                avg_confidence = predictions_df["confidence"].mean() * 100 if "confidence" in predictions_df.columns else 0
                
                summary[approach] = {
                    "exists": True,
                    "total_predictions": len(predictions_df),
                    "accuracy": round(accuracy, 2),
                    "avg_confidence": round(avg_confidence, 2),
                    "sentiment_distribution": dict(pred_dist),
                    "sentiment_percentages": {
                        k: round(v/len(predictions_df)*100, 2) 
                        for k, v in pred_dist.items()
                    },
                    "correct_predictions": int(predictions_df["is_correct"].sum()),
                    "incorrect_predictions": int((~predictions_df["is_correct"]).sum())
                }
                
            except FileNotFoundError:
                summary[approach] = {
                    "exists": False,
                    "message": f"Model {approach} belum dilatih"
                }
        
        return summary
        
    except Exception as e:
        return {"error": f"Gagal mengambil summary: {str(e)}"}