import pandas as pd
import numpy as np
from sklearn.neighbors import NearestNeighbors
from collections import Counter
import joblib
from sklearn.decomposition import PCA
import os


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


def random_undersampling(X, y, random_state=42):
    """
    Random Undersampling: mengurangi kelas mayoritas
    """
    np.random.seed(random_state)
    
    # Hitung distribusi kelas
    class_counts = Counter(y)
    min_count = min(class_counts.values())
    
    # Index untuk setiap kelas
    indices_to_keep = []
    
    for class_label in class_counts.keys():
        class_indices = np.where(y == class_label)[0]
        
        # Jika kelas ini adalah mayoritas, undersample
        if len(class_indices) > min_count:
            selected_indices = np.random.choice(class_indices, min_count, replace=False)
        else:
            selected_indices = class_indices
            
        indices_to_keep.extend(selected_indices)
    
    indices_to_keep = sorted(indices_to_keep)
    
    return indices_to_keep


def find_tomek_links(X, y):
    """
    Tomek Link: menemukan dan menghapus pasangan data terdekat dari kelas berbeda
    """
    # Convert sparse matrix to dense for nearest neighbors
    X_dense = X.toarray() if hasattr(X, 'toarray') else X
    
    # Find nearest neighbor untuk setiap sample
    nn = NearestNeighbors(n_neighbors=2)
    nn.fit(X_dense)
    
    # Get nearest neighbor (index 1, karena index 0 adalah dirinya sendiri)
    distances, indices = nn.kneighbors(X_dense)
    
    tomek_links = []
    
    for i in range(len(y)):
        nearest_idx = indices[i][1]
        
        # Check apakah ini Tomek link:
        # 1. Mereka nearest neighbor satu sama lain
        # 2. Mereka dari kelas berbeda
        if indices[nearest_idx][1] == i and y[i] != y[nearest_idx]:
            tomek_links.append((i, nearest_idx))
    
    # Kumpulkan indices yang akan dihapus (dari kelas mayoritas)
    class_counts = Counter(y)
    majority_class = max(class_counts, key=class_counts.get)
    
    indices_to_remove = set()
    for i, j in tomek_links:
        if y[i] == majority_class:
            indices_to_remove.add(i)
        elif y[j] == majority_class:
            indices_to_remove.add(j)
    
    return list(indices_to_remove)


def apply_balancing(method="both", random_state=42):
    """
    Terapkan teknik balancing pada TRAINING data
    
    Parameters:
    - method: "undersampling", "tomek", "both", atau "none"
    """
    df_train, X_train, y_train = load_train_data()
    
    if df_train is None or X_train is None:
        return {"error": "Training data tidak tersedia. Lakukan splitting terlebih dahulu."}
    
    # Original distribution
    original_dist = Counter(y_train)
    
    if method == "none":
        # Tidak ada balancing
        balanced_indices = list(range(len(y_train)))
        
    elif method == "undersampling":
        # Hanya Random Undersampling
        balanced_indices = random_undersampling(X_train, y_train, random_state)
        
    elif method == "tomek":
        # Hanya Tomek Link
        indices_to_remove = find_tomek_links(X_train, y_train)
        balanced_indices = [i for i in range(len(y_train)) if i not in indices_to_remove]
        
    elif method == "both":
        # Kombinasi: Tomek Link dulu, lalu Random Undersampling
        # Step 1: Tomek Link
        tomek_indices_to_remove = find_tomek_links(X_train, y_train)
        tomek_indices = [i for i in range(len(y_train)) if i not in tomek_indices_to_remove]
        
        X_tomek = X_train[tomek_indices]
        y_tomek = y_train[tomek_indices]
        
        # Step 2: Random Undersampling pada hasil Tomek Link
        us_indices = random_undersampling(X_tomek, y_tomek, random_state)
        
        # Map kembali ke original indices
        final_indices = [tomek_indices[i] for i in us_indices]
        balanced_indices = sorted(final_indices)
    else:
        return {"error": "Metode tidak valid"}
    
    # Get balanced data
    df_balanced = df_train.iloc[balanced_indices].reset_index(drop=True)
    X_balanced = X_train[balanced_indices]
    y_balanced = y_train[balanced_indices]
    
    # New distribution
    balanced_dist = Counter(y_balanced)
    
    # Save balanced training data
    joblib.dump(X_balanced, "tfidf_matrix_train_balanced.pkl")
    joblib.dump(y_balanced, "labels_train_balanced.pkl")
    df_balanced.to_csv("train_data_balanced.csv", index=False)
    
    # Simpan indices untuk tracking
    np.save("train_balanced_indices.npy", np.array(balanced_indices))
    
    return {
        "method": method,
        "original_distribution": dict(original_dist),
        "balanced_distribution": dict(balanced_dist),
        "original_count": int(X_train.shape[0]),
        "balanced_count": int(X_balanced.shape[0]),
        "removed_count": int(X_train.shape[0] - X_balanced.shape[0]),
        "data": df_balanced[["id", "comment", "finalText", "sentiment", "confidence"]].to_dict(orient="records")
    }


def get_visualization_points(mode="original", sample_size=2000):
    """
    Dapatkan points untuk visualisasi PCA
    
    Parameters:
    - mode: "original" atau "balanced"
    """
    if mode == "balanced":
        # Load balanced training data
        try:
            df = pd.read_csv("train_data_balanced.csv")
            X = joblib.load("tfidf_matrix_train_balanced.pkl")
            y = joblib.load("labels_train_balanced.pkl")
        except:
            return {"error": "Balanced data tidak tersedia"}
    else:
        # Load original training data
        df, X, y = load_train_data()
        if df is None or X is None:
            return {"error": "Training data tidak tersedia"}
    
    # Sampling agar cepat
    if len(y) > sample_size:
        idx = np.random.choice(len(y), sample_size, replace=False)
        X = X[idx]
        y = y[idx]
        df = df.iloc[idx]
    
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


def get_dataset_comparison():
    """
    Dapatkan perbandingan training dataset original vs balanced
    """
    df_train, X_train, y_train = load_train_data()
    
    if df_train is None:
        return {"error": "Training data tidak tersedia"}
    
    original_dist = Counter(y_train)
    original_count = X_train.shape[0]
    
    # Cek apakah ada balanced data
    balanced_exists = False
    balanced_dist = {}
    balanced_count = 0
    
    try:
        df_balanced = pd.read_csv("train_data_balanced.csv")
        X_balanced = joblib.load("tfidf_matrix_train_balanced.pkl")
        y_balanced = joblib.load("labels_train_balanced.pkl")
        
        balanced_dist = Counter(y_balanced)
        balanced_count = X_balanced.shape[0]
        balanced_exists = True
    except:
        pass
    
    return {
        "original": {
            "total": original_count,
            "distribution": dict(original_dist),
            "percentages": {k: round(v/original_count*100, 2) for k, v in original_dist.items()}
        },
        "balanced": {
            "exists": balanced_exists,
            "total": balanced_count,
            "distribution": dict(balanced_dist),
            "percentages": {k: round(v/balanced_count*100, 2) for k, v in balanced_dist.items()} if balanced_count > 0 else {}
        }
    }


def check_balanced_exists():
    """
    Cek apakah balanced training data sudah ada
    """
    try:
        files_needed = [
            "tfidf_matrix_train_balanced.pkl",
            "labels_train_balanced.pkl",
            "train_data_balanced.csv"
        ]
        
        exists = all(os.path.exists(f) for f in files_needed)
        
        if exists:
            X_balanced = joblib.load("tfidf_matrix_train_balanced.pkl")
            y_balanced = joblib.load("labels_train_balanced.pkl")
            
            balanced_dist = Counter(y_balanced)
            balanced_count = X_balanced.shape[0]
            
            return {
                "exists": True,
                "count": balanced_count,
                "distribution": dict(balanced_dist)
            }
        else:
            return {"exists": False}
    except Exception as e:
        return {"exists": False, "error": str(e)}