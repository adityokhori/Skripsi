import pandas as pd
import numpy as np
from collections import Counter
import joblib
from sklearn.decomposition import PCA
import os

# Import untuk balancing menggunakan imbalanced-learn
try:
    from imblearn.under_sampling import TomekLinks, RandomUnderSampler
    from imblearn.pipeline import Pipeline as ImbPipeline
    IMBLEARN_AVAILABLE = True
except ImportError:
    IMBLEARN_AVAILABLE = False
    print("Warning: imbalanced-learn not installed. Install with: pip install imbalanced-learn")


def load_full_data():
    """
    Load full labelled data dan TF-IDF matrix
    Ensures dimensions match between X and y
    """
    try:
        if not os.path.exists("Get_Labelling.csv"):
            print("ERROR: Get_Labelling.csv not found")
            return None, None, None
        
        if not os.path.exists("tfidf_matrix.pkl"):
            print("ERROR: tfidf_matrix.pkl not found")
            return None, None, None
        
        # Load data
        df = pd.read_csv("Get_Labelling.csv")
        X = joblib.load("tfidf_matrix.pkl")
        
        print(f"Initial - CSV: {len(df)} rows, TF-IDF: {X.shape[0]} rows")
        
        # Auto-detect label column
        label_col = None
        for col in ["sentiment", "Label", "label"]:
            if col in df.columns:
                label_col = col
                break
        
        if label_col is None:
            print(f"ERROR: No label column. Available: {df.columns.tolist()}")
            return None, None, None
        
        # Get labels
        y = df[label_col]
        
        # ✅ CRITICAL FIX: Match dimensions
        if X.shape[0] != len(y):
            print(f"⚠️ DIMENSION MISMATCH!")
            print(f"  TF-IDF matrix: {X.shape[0]} samples")
            print(f"  Labels: {len(y)} samples")
            print(f"  Difference: {abs(X.shape[0] - len(y))} samples")
            
            # Use minimum length
            min_length = min(X.shape[0], len(y))
            
            print(f"✅ Truncating both to {min_length} samples")
            
            X = X[:min_length]
            y = y[:min_length]
            df = df.iloc[:min_length]
        
        print(f"Final - X: {X.shape}, y: {len(y)}, df: {len(df)}")
        print(f"Class distribution: {Counter(y)}")
        
        return df, X, y
        
    except Exception as e:
        import traceback
        print("="*60)
        print("ERROR IN load_full_data:")
        print(traceback.format_exc())
        print("="*60)
        return None, None, None


def load_train_data():
    """
    Load training data yang sudah di-split
    """
    try:
        # Cek apakah file training ada
        if not os.path.exists("tfidf_matrix_train.pkl"):
            return None, None, None
            
        X_train = joblib.load("tfidf_matrix_train.pkl")
        y_train = joblib.load("labels_train.pkl")
        df_train = pd.read_csv("train_data.csv")
        
        return df_train, X_train, y_train
    except Exception as e:
        print(f"Error loading train data: {e}")
        return None, None, None


def create_balancing_pipeline(random_state=42):
    """
    Membuat pipeline balancing: Tomek Links + Random Undersampling
    """
    if not IMBLEARN_AVAILABLE:
        raise ImportError("imbalanced-learn package is required. Install with: pip install imbalanced-learn")
    
    balancing_pipeline = ImbPipeline([
        ('tomek', TomekLinks(sampling_strategy='all')),
        ('rus', RandomUnderSampler(random_state=random_state))
    ])
    
    return balancing_pipeline


def apply_balancing_to_data(X, y, random_state=42):
    """
    Terapkan balancing (Tomek Links + Random Undersampling) pada data
    
    Parameters:
    - X: Feature matrix (TF-IDF)
    - y: Labels
    - random_state: Random seed
    
    Returns:
    - X_balanced, y_balanced
    """
    if not IMBLEARN_AVAILABLE:
        raise ImportError("imbalanced-learn package is required. Install with: pip install imbalanced-learn")
    
    pipeline = create_balancing_pipeline(random_state)
    X_balanced, y_balanced = pipeline.fit_resample(X, y)
    
    return X_balanced, y_balanced


def get_balancing_info():
    """
    Mendapatkan informasi tentang data balancing
    """
    df, X, y = load_full_data()
    
    if df is None or X is None:
        return {"error": "Data tidak tersedia. Pastikan Get_Labelling.csv dan tfidf_matrix.pkl ada."}
    
    original_dist = Counter(y)
    original_count = len(y)
    
    info = {
        "imblearn_available": IMBLEARN_AVAILABLE,
        "original": {
            "total": original_count,
            "distribution": dict(original_dist),
            "percentages": {k: round(v/original_count*100, 2) for k, v in original_dist.items()}
        }
    }
    
    if IMBLEARN_AVAILABLE:
        try:
            # Simulasi balancing untuk info
            X_balanced, y_balanced = apply_balancing_to_data(X, y)
            balanced_dist = Counter(y_balanced)
            balanced_count = len(y_balanced)
            
            info["balanced_preview"] = {
                "total": balanced_count,
                "distribution": dict(balanced_dist),
                "percentages": {k: round(v/balanced_count*100, 2) for k, v in balanced_dist.items()},
                "removed_count": original_count - balanced_count
            }
        except Exception as e:
            info["balanced_preview"] = {"error": f"Gagal simulasi balancing: {str(e)}"}
    
    return info


def get_visualization_points(mode="original", sample_size=2000):
    """
    Dapatkan points untuk visualisasi PCA
    
    Parameters:
    - mode: "original" atau "balanced"
    - sample_size: jumlah sampel untuk visualisasi
    """
    df, X, y = load_full_data()
    
    if df is None or X is None:
        return {"error": "Data tidak tersedia"}
    
    if mode == "balanced" and IMBLEARN_AVAILABLE:
        try:
            X, y = apply_balancing_to_data(X, y)
        except Exception as e:
            return {"error": f"Gagal balancing: {str(e)}"}
    
    # Sampling agar cepat
    if len(y) > sample_size:
        idx = np.random.choice(len(y), sample_size, replace=False)
        X = X[idx]
        y = y[idx]
    
    # Convert ke dense
    X_dense = X.toarray() if hasattr(X, "toarray") else X
    
    # PCA untuk reduksi dimensi
    reducer = PCA(n_components=2, random_state=42)
    coords = reducer.fit_transform(X_dense)
    
    points = []
    for i, (x, y_coord) in enumerate(coords):
        points.append({
            "x": float(x),
            "y": float(y_coord),
            "label": str(y[i])
        })
    
    return {"points": points}


def check_requirements():
    """
    Cek apakah semua requirements terpenuhi
    """
    requirements = {
        "imblearn_available": IMBLEARN_AVAILABLE,
        "get_labelling_exists": os.path.exists("Get_Labelling.csv"),
        "tfidf_matrix_exists": os.path.exists("tfidf_matrix.pkl"),
        "tfidf_vectorizer_exists": os.path.exists("tfidf_vectorizer.pkl")
    }
    
    all_ready = all([
        requirements["imblearn_available"],
        requirements["get_labelling_exists"],
        requirements["tfidf_matrix_exists"],
        requirements["tfidf_vectorizer_exists"]
    ])
    
    requirements["all_ready"] = all_ready
    
    if not requirements["imblearn_available"]:
        requirements["install_command"] = "pip install imbalanced-learn"
    
    return requirements