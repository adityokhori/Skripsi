import pandas as pd
import numpy as np
from sklearn.neighbors import NearestNeighbors
from collections import Counter
import joblib
from sklearn.decomposition import PCA

def load_labelled_and_tfidf():
    """
    Load TF-IDF matrix dan data yang sudah dilabelling
    """
    try:
        # Load TF-IDF vectorizer dan matrix
        vectorizer = joblib.load("tfidf_vectorizer.pkl")
        X = joblib.load("tfidf_matrix.pkl")
        
        # Load data yang sudah dipreprocess
        from label_utils import get_latest_preprocessed
        latest_file, df = get_latest_preprocessed("./")
        
        if latest_file is None or df is None:
            return None, None, None
        
        # Label data jika belum ada kolom sentiment
        if "sentiment" not in df.columns:
            from label_utils import label_text
            sentiments = []
            confidences = []
            for _, row in df.iterrows():
                text = row.get("finalText", "")
                sentiment, confidence = label_text(text)
                sentiments.append(sentiment)
                confidences.append(confidence)
            
            df["sentiment"] = sentiments
            df["confidence"] = confidences
        
        return df, X, vectorizer
        
    except Exception as e:
        print(f"Error loading data: {e}")
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
    Terapkan teknik balancing pada data
    
    Parameters:
    - method: "undersampling", "tomek", "both", atau "none"
    """
    df, X, vectorizer = load_labelled_and_tfidf()
    
    if df is None or X is None:
        return None
    
    # Prepare labels
    y = df["sentiment"].values
    
    # Original distribution
    original_dist = Counter(y)
    
    if method == "none":
        # Tidak ada balancing
        balanced_indices = list(range(len(y)))
        
    elif method == "undersampling":
        # Hanya Random Undersampling
        balanced_indices = random_undersampling(X, y, random_state)
        
    elif method == "tomek":
        # Hanya Tomek Link
        indices_to_remove = find_tomek_links(X, y)
        balanced_indices = [i for i in range(len(y)) if i not in indices_to_remove]
        
    elif method == "both":
        # Kombinasi: Undersampling dulu, lalu Tomek Link
        # Step 1: Random Undersampling
        tomek_indices_to_remove = find_tomek_links(X, y)
        tomek_indices = [i for i in range(len(y)) if i not in tomek_indices_to_remove]
        
        X_tomek = X[tomek_indices]
        y_tomek = y[tomek_indices]
        
            # Step 2: Random Undersampling pada hasil Tomek Link
        us_indices = random_undersampling(X_tomek, y_tomek, random_state)
    
        # Map kembali ke original indices
        final_indices = [tomek_indices[i] for i in us_indices]
        balanced_indices = sorted(final_indices)

    else:
        return None
    
    # Get balanced data
    df_balanced = df.iloc[balanced_indices].reset_index(drop=True)
    X_balanced = X[balanced_indices]
    
    # New distribution
    balanced_dist = Counter(df_balanced["sentiment"].values)
    
    # Save balanced data
    joblib.dump(X_balanced, "tfidf_matrix_balanced.pkl")
    df_balanced.to_csv("GetProcessed_Balanced.csv", index=False)
    
    return {
        "method": method,
        "original_distribution": dict(original_dist),
        "balanced_distribution": dict(balanced_dist),
        "original_count": len(df),
        "balanced_count": len(df_balanced),
        "removed_count": len(df) - len(df_balanced),
        "data": df_balanced[["id", "comment", "finalText", "sentiment", "confidence"]].to_dict(orient="records")
    }


def get_visualization_points(method="pca", sample_size=2000):
    df, X, _ = load_labelled_and_tfidf()
    if df is None or X is None:
        return {"error": "Data tidak tersedia"}
    
    y = df["sentiment"].values
    
    # Sampling agar cepat
    if len(y) > sample_size:
        idx = np.random.choice(len(y), sample_size, replace=False)
        X = X[idx]
        y = y[idx]
        df = df.iloc[idx]

    # Convert ke dense
    X_dense = X.toarray() if hasattr(X, "toarray") else X

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
    Dapatkan perbandingan dataset original vs balanced
    """
    df, X, _ = load_labelled_and_tfidf()
    
    if df is None:
        return None
    
    original_dist = Counter(df["sentiment"].values)
    
    # Cek apakah ada balanced data
    balanced_exists = False
    balanced_dist = {}
    balanced_count = 0
    
    try:
        df_balanced = pd.read_csv("GetProcessed_Balanced.csv")
        balanced_dist = Counter(df_balanced["sentiment"].values)
        balanced_count = len(df_balanced)
        balanced_exists = True
    except:
        pass
    
    return {
        "original": {
            "total": len(df),
            "distribution": dict(original_dist),
            "percentages": {k: round(v/len(df)*100, 2) for k, v in original_dist.items()}
        },
        "balanced": {
            "exists": balanced_exists,
            "total": balanced_count,
            "distribution": dict(balanced_dist),
            "percentages": {k: round(v/balanced_count*100, 2) for k, v in balanced_dist.items()} if balanced_count > 0 else {}
        }
    }