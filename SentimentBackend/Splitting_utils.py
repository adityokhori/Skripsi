import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from collections import Counter
import joblib


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


def get_dataset_info():
    """
    Mendapatkan informasi tentang dataset (sebelum splitting)
    """
    try:
        df, X, vectorizer = load_labelled_and_tfidf()
        
        if df is None or X is None:
            return None
        
        sentiment_dist = Counter(df["sentiment"].values)
        total = len(df)
        
        return {
            "total": total,
            "num_features": X.shape[1],
            "distribution": dict(sentiment_dist),
            "percentages": {k: round(v/total*100, 2) for k, v in sentiment_dist.items()}
        }
    except Exception as e:
        print(f"Error getting dataset info: {e}")
        return None


def split_dataset(test_size=0.2, random_state=42, stratify=True):
    """
    Memisahkan dataset menjadi training dan testing set
    
    Parameters:
    - test_size: proporsi data untuk testing (default 0.2 = 20%)
    - random_state: seed untuk reprodusibilitas
    - stratify: jika True, pertahankan proporsi kelas
    
    Returns:
    - Dictionary berisi informasi hasil splitting
    """
    try:
        df, X, vectorizer = load_labelled_and_tfidf()
        
        if df is None or X is None:
            return {"error": "Data tidak tersedia"}
        
        y = df["sentiment"].values
        
        # Stratified split untuk menjaga proporsi kelas
        stratify_param = y if stratify else None
        
        X_train, X_test, y_train, y_test, idx_train, idx_test = train_test_split(
            X, 
            y, 
            range(len(y)),
            test_size=test_size,
            random_state=random_state,
            stratify=stratify_param
        )
        
        # Ambil dataframe untuk train dan test
        df_train = df.iloc[idx_train].reset_index(drop=True)
        df_test = df.iloc[idx_test].reset_index(drop=True)
        
        # Hitung distribusi
        train_dist = Counter(y_train)
        test_dist = Counter(y_test)
        
        # Save hasil splitting
        joblib.dump(X_train, "tfidf_matrix_train.pkl")
        joblib.dump(X_test, "tfidf_matrix_test.pkl")
        joblib.dump(y_train, "labels_train.pkl")
        joblib.dump(y_test, "labels_test.pkl")
        
        df_train.to_csv("train_data.csv", index=False)
        df_test.to_csv("test_data.csv", index=False)
        
        # Save indices untuk tracking
        np.save("train_indices.npy", idx_train)
        np.save("test_indices.npy", idx_test)
        
        return {
            "status": "success",
            "train_count": len(X_train),
            "test_count": len(X_test),
            "train_percentage": round(len(X_train) / len(y) * 100, 2),
            "test_percentage": round(len(X_test) / len(y) * 100, 2),
            "train_distribution": dict(train_dist),
            "test_distribution": dict(test_dist),
            "random_state": random_state,
            "stratified": stratify,
            "train_data_preview": df_train[["id", "comment", "finalText", "sentiment", "confidence"]].head(10).to_dict(orient="records"),
            "test_data_preview": df_test[["id", "comment", "finalText", "sentiment", "confidence"]].head(10).to_dict(orient="records")
        }
        
    except Exception as e:
        print(f"Error splitting dataset: {e}")
        return {"error": f"Gagal melakukan splitting: {str(e)}"}


def check_split_exists():
    """
    Cek apakah data sudah pernah di-split
    """
    try:
        import os
        files_needed = [
            "tfidf_matrix_train.pkl",
            "tfidf_matrix_test.pkl",
            "labels_train.pkl",
            "labels_test.pkl",
            "train_data.csv",
            "test_data.csv"
        ]
        
        exists = all(os.path.exists(f) for f in files_needed)
        
        if exists:
            # Load info
            X_train = joblib.load("tfidf_matrix_train.pkl")
            X_test = joblib.load("tfidf_matrix_test.pkl")
            y_train = joblib.load("labels_train.pkl")
            y_test = joblib.load("labels_test.pkl")
            
            train_dist = Counter(y_train)
            test_dist = Counter(y_test)
            total = len(y_train) + len(y_test)
            
            return {
                "exists": True,
                "train_count": len(X_train),
                "test_count": len(X_test),
                "train_percentage": round(len(X_train) / total * 100, 2),
                "test_percentage": round(len(X_test) / total * 100, 2),
                "train_distribution": dict(train_dist),
                "test_distribution": dict(test_dist)
            }
        else:
            return {"exists": False}
            
    except Exception as e:
        return {"exists": False, "error": str(e)}


def load_train_data():
    """
    Load training data yang sudah di-split
    """
    try:
        X_train = joblib.load("tfidf_matrix_train.pkl")
        y_train = joblib.load("labels_train.pkl")
        df_train = pd.read_csv("train_data.csv")
        
        return df_train, X_train, y_train
    except Exception as e:
        print(f"Error loading train data: {e}")
        return None, None, None


def load_test_data():
    """
    Load testing data yang sudah di-split
    """
    try:
        X_test = joblib.load("tfidf_matrix_test.pkl")
        y_test = joblib.load("labels_test.pkl")
        df_test = pd.read_csv("test_data.csv")
        
        return df_test, X_test, y_test
    except Exception as e:
        print(f"Error loading test data: {e}")
        return None, None, None