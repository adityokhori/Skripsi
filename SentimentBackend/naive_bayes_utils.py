import pandas as pd
import numpy as np
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report
from sklearn.model_selection import cross_val_score
import joblib
from collections import Counter
import os


def load_train_data():
    """
    Load training data yang sudah di-split
    """
    try:
        if not os.path.exists("tfidf_matrix_train.pkl"):
            return None, None, None
            
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
        if not os.path.exists("tfidf_matrix_test.pkl"):
            return None, None, None
            
        X_test = joblib.load("tfidf_matrix_test.pkl")
        y_test = joblib.load("labels_test.pkl")
        df_test = pd.read_csv("test_data.csv")
        
        return df_test, X_test, y_test
    except Exception as e:
        print(f"Error loading test data: {e}")
        return None, None, None


def train_naive_bayes(approach="balanced", alpha=1.0, cv_folds=5):
    """
    Train Multinomial Naive Bayes dengan pendekatan imbalanced atau balanced
    
    Parameters:
    - approach: "imbalanced" atau "balanced"
    - alpha: Laplace smoothing parameter (default=1.0)
    - cv_folds: jumlah fold untuk cross-validation
    
    Returns:
    - Dictionary berisi hasil training dan evaluasi
    """
    try:
        # Load test data (selalu sama untuk kedua approach)
        df_test, X_test, y_test = load_test_data()
        if df_test is None or X_test is None:
            return {"error": "Data test tidak ditemukan. Lakukan splitting terlebih dahulu."}
        
        # Load training data sesuai pendekatan
        if approach == "balanced":
            # Load balanced training data
            try:
                if not os.path.exists("tfidf_matrix_train_balanced.pkl"):
                    return {"error": "Data balanced tidak ditemukan. Lakukan balancing terlebih dahulu."}
                
                X_train = joblib.load("tfidf_matrix_train_balanced.pkl")
                y_train = joblib.load("labels_train_balanced.pkl")
                df_train = pd.read_csv("train_data_balanced.csv")
                
            except FileNotFoundError:
                return {"error": "Data balanced tidak ditemukan. Lakukan balancing terlebih dahulu."}
        
        else:  # imbalanced
            # Load original training data
            df_train, X_train, y_train = load_train_data()
            
            if df_train is None or X_train is None:
                return {"error": "Data train tidak ditemukan. Lakukan splitting terlebih dahulu."}
        
        # Training distribution
        train_dist = Counter(y_train)
        test_dist = Counter(y_test)
        
        # Get sample counts using .shape[0] for sparse matrices
        train_count = X_train.shape[0]
        test_count = X_test.shape[0]
        
        # Initialize Multinomial Naive Bayes
        model = MultinomialNB(alpha=alpha)
        
        # Cross-validation pada training data
        cv_scores = cross_val_score(model, X_train, y_train, cv=cv_folds, scoring='accuracy')
        
        # Train model
        model.fit(X_train, y_train)
        
        # Prediksi pada training set
        y_train_pred = model.predict(X_train)
        train_accuracy = accuracy_score(y_train, y_train_pred)
        
        # Prediksi pada test set
        y_test_pred = model.predict(X_test)
        test_accuracy = accuracy_score(y_test, y_test_pred)
        
        # Hitung metrics untuk test set
        precision = precision_score(y_test, y_test_pred, average='weighted', zero_division=0)
        recall = recall_score(y_test, y_test_pred, average='weighted', zero_division=0)
        f1 = f1_score(y_test, y_test_pred, average='weighted', zero_division=0)
        
        # Confusion matrix
        cm = confusion_matrix(y_test, y_test_pred)
        
        # Classification report
        class_report = classification_report(y_test, y_test_pred, output_dict=True, zero_division=0)
        
        # Per-class metrics
        classes = sorted(list(set(y_test)))
        per_class_metrics = {}
        for cls in classes:
            if cls in class_report:
                per_class_metrics[cls] = {
                    "precision": round(class_report[cls]["precision"] * 100, 2),
                    "recall": round(class_report[cls]["recall"] * 100, 2),
                    "f1_score": round(class_report[cls]["f1-score"] * 100, 2),
                    "support": int(class_report[cls]["support"])
                }
        
        # Save model
        model_filename = f"naive_bayes_{approach}.pkl"
        joblib.dump(model, model_filename)
        
        # Save predictions
        predictions_df = df_test.copy()
        predictions_df["predicted_sentiment"] = y_test_pred
        predictions_df["actual_sentiment"] = y_test
        predictions_df["is_correct"] = predictions_df["predicted_sentiment"] == predictions_df["actual_sentiment"]
        
        # Get prediction probabilities
        y_proba = model.predict_proba(X_test)
        predictions_df["prediction_confidence"] = [max(proba) for proba in y_proba]
        
        predictions_filename = f"predictions_{approach}.csv"
        predictions_df.to_csv(predictions_filename, index=False)
        
        return {
            "status": "success",
            "approach": approach,
            "model_filename": model_filename,
            "predictions_filename": predictions_filename,
            "training_info": {
                "train_samples": train_count,
                "test_samples": test_count,
                "train_distribution": dict(train_dist),
                "test_distribution": dict(test_dist),
                "alpha": alpha,
                "cv_folds": cv_folds
            },
            "performance": {
                "train_accuracy": round(train_accuracy * 100, 2),
                "test_accuracy": round(test_accuracy * 100, 2),
                "precision": round(precision * 100, 2),
                "recall": round(recall * 100, 2),
                "f1_score": round(f1 * 100, 2),
                "cv_mean": round(cv_scores.mean() * 100, 2),
                "cv_std": round(cv_scores.std() * 100, 2)
            },
            "per_class_metrics": per_class_metrics,
            "confusion_matrix": cm.tolist(),
            "class_names": classes
        }
        
    except Exception as e:
        print(f"Error training Naive Bayes: {e}")
        import traceback
        traceback.print_exc()
        return {"error": f"Gagal training model: {str(e)}"}


def compare_models():
    """
    Membandingkan performa model imbalanced vs balanced
    """
    try:
        results = {}
        
        # Load model dan predictions untuk kedua pendekatan
        for approach in ["imbalanced", "balanced"]:
            try:
                model = joblib.load(f"naive_bayes_{approach}.pkl")
                predictions_df = pd.read_csv(f"predictions_{approach}.csv")
                
                # Hitung metrics
                y_true = predictions_df["actual_sentiment"].values
                y_pred = predictions_df["predicted_sentiment"].values
                
                accuracy = accuracy_score(y_true, y_pred)
                precision = precision_score(y_true, y_pred, average='weighted', zero_division=0)
                recall = recall_score(y_true, y_pred, average='weighted', zero_division=0)
                f1 = f1_score(y_true, y_pred, average='weighted', zero_division=0)
                
                # Per-class performance
                class_report = classification_report(y_true, y_pred, output_dict=True, zero_division=0)
                
                results[approach] = {
                    "accuracy": round(accuracy * 100, 2),
                    "precision": round(precision * 100, 2),
                    "recall": round(recall * 100, 2),
                    "f1_score": round(f1 * 100, 2),
                    "total_predictions": len(predictions_df),
                    "correct_predictions": int(predictions_df["is_correct"].sum()),
                    "per_class": {
                        cls: {
                            "precision": round(class_report[cls]["precision"] * 100, 2),
                            "recall": round(class_report[cls]["recall"] * 100, 2),
                            "f1_score": round(class_report[cls]["f1-score"] * 100, 2)
                        }
                        for cls in class_report if cls not in ["accuracy", "macro avg", "weighted avg"]
                    }
                }
                
            except FileNotFoundError:
                results[approach] = {"error": f"Model {approach} belum dilatih"}
        
        return results
        
    except Exception as e:
        return {"error": f"Gagal membandingkan model: {str(e)}"}


def predict_new_text(text, approach="balanced"):
    """
    Prediksi sentimen untuk teks baru
    
    Parameters:
    - text: string teks yang akan diprediksi
    - approach: "imbalanced" atau "balanced"
    """
    try:
        # Load model dan vectorizer
        model = joblib.load(f"naive_bayes_{approach}.pkl")
        vectorizer = joblib.load("tfidf_vectorizer.pkl")
        
        # Transform text
        X = vectorizer.transform([text])
        
        # Predict
        prediction = model.predict(X)[0]
        proba = model.predict_proba(X)[0]
        confidence = max(proba)
        
        # Get probability for each class
        class_probabilities = {
            cls: round(prob * 100, 2)
            for cls, prob in zip(model.classes_, proba)
        }
        
        return {
            "text": text,
            "predicted_sentiment": prediction,
            "confidence": round(confidence * 100, 2),
            "class_probabilities": class_probabilities,
            "approach": approach
        }
        
    except FileNotFoundError:
        return {"error": f"Model {approach} belum dilatih"}
    except Exception as e:
        return {"error": f"Gagal prediksi: {str(e)}"}


def get_model_info(approach="balanced"):
    """
    Mendapatkan informasi tentang model yang sudah dilatih
    """
    try:
        model = joblib.load(f"naive_bayes_{approach}.pkl")
        predictions_df = pd.read_csv(f"predictions_{approach}.csv")
        
        # Class distribution in predictions
        pred_dist = Counter(predictions_df["predicted_sentiment"].values)
        actual_dist = Counter(predictions_df["actual_sentiment"].values)
        
        # Get feature count using shape
        n_features = model.feature_count_.shape[1]
        
        return {
            "approach": approach,
            "classes": model.classes_.tolist(),
            "n_features": n_features,
            "total_predictions": len(predictions_df),
            "predicted_distribution": dict(pred_dist),
            "actual_distribution": dict(actual_dist),
            "model_exists": True
        }
        
    except FileNotFoundError:
        return {
            "approach": approach,
            "model_exists": False,
            "error": f"Model {approach} belum dilatih"
        }
    except Exception as e:
        return {"error": f"Gagal mengambil info model: {str(e)}"}


def get_confusion_matrix_data(approach="balanced"):
    """
    Mendapatkan data confusion matrix untuk visualisasi
    """
    try:
        predictions_df = pd.read_csv(f"predictions_{approach}.csv")
        
        y_true = predictions_df["actual_sentiment"].values
        y_pred = predictions_df["predicted_sentiment"].values
        
        # Get unique classes
        classes = sorted(list(set(y_true)))
        
        # Generate confusion matrix
        cm = confusion_matrix(y_true, y_pred, labels=classes)
        
        return {
            "confusion_matrix": cm.tolist(),
            "classes": classes,
            "approach": approach
        }
        
    except FileNotFoundError:
        return {"error": f"Predictions untuk model {approach} tidak ditemukan"}
    except Exception as e:
        return {"error": f"Gagal mendapatkan confusion matrix: {str(e)}"}