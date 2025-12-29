# cross_validation_utils.py
"""
Utility untuk Cross Validation dengan K=10 fold.
Setiap fold akan di-balance menggunakan Tomek Links dan Random Undersampling
sebelum training Multinomial Naive Bayes.
"""

import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import StratifiedKFold
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import (
    classification_report, 
    confusion_matrix, 
    accuracy_score,
    precision_recall_fscore_support
)
from imblearn.under_sampling import TomekLinks, RandomUnderSampler
from collections import Counter
import os

def load_labelled_data():
    """
    Load data dari Get_Labelling.csv dan TF-IDF matrix
    """
    try:
        # Load labelled data
        if not os.path.exists("Get_Labelling.csv"):
            return None, None, None, "Get_Labelling.csv tidak ditemukan"
        
        df = pd.read_csv("Get_Labelling.csv", encoding="utf-8")
        print(f"Loaded {len(df)} records from Get_Labelling.csv")
        
        # Load TF-IDF matrix dan vectorizer
        if not os.path.exists("tfidf_matrix.pkl"):
            return None, None, None, "tfidf_matrix.pkl tidak ditemukan. Jalankan TF-IDF terlebih dahulu"
        
        if not os.path.exists("tfidf_vectorizer.pkl"):
            return None, None, None, "tfidf_vectorizer.pkl tidak ditemukan"
        
        X = joblib.load("tfidf_matrix.pkl")
        vectorizer = joblib.load("tfidf_vectorizer.pkl")
        print(f"Loaded TF-IDF matrix with shape: {X.shape}")
        
        # Pastikan ukuran data sama
        if len(df) != X.shape[0]:
            return None, None, None, f"Ukuran data tidak match: Get_Labelling={len(df)}, TF-IDF={X.shape[0]}"
        
        # Extract labels
        if "sentiment" not in df.columns:
            return None, None, None, "Kolom sentiment tidak ditemukan di Get_Labelling.csv"
        
        y = df["sentiment"].values
        
        print(f"Data distribution: {Counter(y)}")
        
        return X, y, df, None
        
    except Exception as e:
        print(f"Error loading data: {str(e)}")
        return None, None, None, str(e)


def balance_fold_data(X_train, y_train, fold_num):
    """
    Balance training data untuk satu fold menggunakan:
    1. Tomek Links (menghapus pasangan borderline)
    2. Random Undersampling (menyeimbangkan jumlah sampel)
    
    Returns: X_balanced, y_balanced, balance_info
    """
    try:
        print(f"\n[Fold {fold_num}] Starting balancing process...")
        original_dist = Counter(y_train)
        print(f"[Fold {fold_num}] Original distribution: {original_dist}")
        
        # Step 1: Apply Tomek Links
        print(f"[Fold {fold_num}] Applying Tomek Links...")
        tomek = TomekLinks(sampling_strategy='auto', n_jobs=-1)
        X_tomek, y_tomek = tomek.fit_resample(X_train, y_train)
        tomek_dist = Counter(y_tomek)
        print(f"[Fold {fold_num}] After Tomek Links: {tomek_dist}")
        tomek_removed = len(y_train) - len(y_tomek)
        
        # Step 2: Apply Random Undersampling
        print(f"[Fold {fold_num}] Applying Random Undersampling...")
        rus = RandomUnderSampler(sampling_strategy='auto', random_state=42)
        X_balanced, y_balanced = rus.fit_resample(X_tomek, y_tomek)
        balanced_dist = Counter(y_balanced)
        print(f"[Fold {fold_num}] After Undersampling: {balanced_dist}")
        rus_removed = len(y_tomek) - len(y_balanced)
        
        balance_info = {
            "original": dict(original_dist),
            "after_tomek": dict(tomek_dist),
            "after_undersampling": dict(balanced_dist),
            "tomek_removed": tomek_removed,
            "undersampling_removed": rus_removed,
            "total_removed": len(y_train) - len(y_balanced),
            "original_size": len(y_train),
            "balanced_size": len(y_balanced)
        }
        
        return X_balanced, y_balanced, balance_info
        
    except Exception as e:
        print(f"[Fold {fold_num}] Error in balancing: {str(e)}")
        raise e


def train_fold(X_train, y_train, X_test, y_test, fold_num, alpha=1.0):
    """
    Train Multinomial Naive Bayes untuk satu fold
    """
    try:
        print(f"\n[Fold {fold_num}] Training Multinomial Naive Bayes...")
        
        # Train model
        model = MultinomialNB(alpha=alpha)
        model.fit(X_train, y_train)
        
        # Predict on test set
        y_pred = model.predict(X_test)
        y_proba = model.predict_proba(X_test)
        
        # Calculate metrics
        accuracy = accuracy_score(y_test, y_pred)
        precision, recall, f1, _ = precision_recall_fscore_support(
            y_test, y_pred, average='weighted', zero_division=0
        )
        
        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred, labels=model.classes_)
        
        # Classification report
        report = classification_report(
            y_test, y_pred, 
            target_names=model.classes_,
            output_dict=True,
            zero_division=0
        )
        
        print(f"[Fold {fold_num}] Accuracy: {accuracy:.4f}")
        print(f"[Fold {fold_num}] Precision: {precision:.4f}")
        print(f"[Fold {fold_num}] Recall: {recall:.4f}")
        print(f"[Fold {fold_num}] F1-Score: {f1:.4f}")
        
        results = {
            "fold": fold_num,
            "accuracy": float(accuracy),
            "precision": float(precision),
            "recall": float(recall),
            "f1_score": float(f1),
            "confusion_matrix": cm.tolist(),
            "classification_report": report,
            "classes": model.classes_.tolist(),
            "test_size": len(y_test),
            "train_size": len(y_train)
        }
        
        return model, y_pred, y_proba, results
        
    except Exception as e:
        print(f"[Fold {fold_num}] Error in training: {str(e)}")
        raise e


def perform_cross_validation(k_folds=10, alpha=1.0, random_state=42):
    """
    Perform k-fold cross validation dengan balancing pada setiap fold
    
    Parameters:
    - k_folds: jumlah fold (default=10)
    - alpha: Laplace smoothing untuk Naive Bayes (default=1.0)
    - random_state: seed untuk reprodusibilitas
    
    Returns: dict berisi hasil CV lengkap
    """
    try:
        print("="*80)
        print(f"Starting {k_folds}-Fold Cross Validation with Balancing")
        print("="*80)
        
        # Load data
        X, y, df, error = load_labelled_data()
        if error:
            return {"error": error}
        
        # Initialize StratifiedKFold
        skf = StratifiedKFold(n_splits=k_folds, shuffle=True, random_state=random_state)
        
        # Storage untuk hasil setiap fold
        fold_results = []
        fold_balance_info = []
        all_predictions = []
        
        # Metrics aggregation
        accuracies = []
        precisions = []
        recalls = []
        f1_scores = []
        
        # Iterate through folds
        for fold_num, (train_idx, test_idx) in enumerate(skf.split(X, y), 1):
            print(f"\n{'='*80}")
            print(f"FOLD {fold_num}/{k_folds}")
            print(f"{'='*80}")
            
            # Split data
            X_train, X_test = X[train_idx], X[test_idx]
            y_train, y_test = y[train_idx], y[test_idx]
            
            print(f"[Fold {fold_num}] Train size: {len(y_train)}, Test size: {len(y_test)}")
            
            # Balance training data
            X_train_balanced, y_train_balanced, balance_info = balance_fold_data(
                X_train, y_train, fold_num
            )
            balance_info["fold"] = fold_num
            fold_balance_info.append(balance_info)
            
            # Train model
            model, y_pred, y_proba, results = train_fold(
                X_train_balanced, y_train_balanced, 
                X_test, y_test, 
                fold_num, alpha
            )
            
            fold_results.append(results)
            
            # Store predictions
            for idx, (true_label, pred_label, proba) in enumerate(zip(y_test, y_pred, y_proba)):
                original_idx = test_idx[idx]
                all_predictions.append({
                    "fold": fold_num,
                    "original_index": int(original_idx),
                    "id": int(df.iloc[original_idx]["id"]) if "id" in df.columns else int(original_idx),
                    "comment": df.iloc[original_idx].get("comment", ""),
                    "finalText": df.iloc[original_idx].get("finalText", ""),
                    "actual_sentiment": str(true_label),
                    "predicted_sentiment": str(pred_label),
                    "is_correct": bool(true_label == pred_label),
                    "confidence": float(max(proba)),
                    "probabilities": {
                        str(cls): float(prob) 
                        for cls, prob in zip(model.classes_, proba)
                    }
                })
            
            # Aggregate metrics
            accuracies.append(results["accuracy"])
            precisions.append(results["precision"])
            recalls.append(results["recall"])
            f1_scores.append(results["f1_score"])
        
        # Calculate overall statistics
        overall_stats = {
            "mean_accuracy": float(np.mean(accuracies)),
            "std_accuracy": float(np.std(accuracies)),
            "mean_precision": float(np.mean(precisions)),
            "std_precision": float(np.std(precisions)),
            "mean_recall": float(np.mean(recalls)),
            "std_recall": float(np.std(recalls)),
            "mean_f1_score": float(np.mean(f1_scores)),
            "std_f1_score": float(np.std(f1_scores)),
            "min_accuracy": float(min(accuracies)),
            "max_accuracy": float(max(accuracies)),
            "accuracies_per_fold": [float(acc) for acc in accuracies]
        }
        
        # Calculate overall confusion matrix (summed across folds)
        all_classes = fold_results[0]["classes"]
        overall_cm = np.zeros((len(all_classes), len(all_classes)), dtype=int)
        for result in fold_results:
            overall_cm += np.array(result["confusion_matrix"])
        
        # Save predictions to CSV
        predictions_df = pd.DataFrame(all_predictions)
        predictions_df.to_csv("cv_predictions.csv", index=False)
        print(f"\nPredictions saved to cv_predictions.csv")
        
        # Calculate overall accuracy from all predictions
        overall_accuracy = sum(1 for p in all_predictions if p["is_correct"]) / len(all_predictions)
        
        # Summary
        print("\n" + "="*80)
        print("CROSS VALIDATION SUMMARY")
        print("="*80)
        print(f"Mean Accuracy: {overall_stats['mean_accuracy']:.4f} (±{overall_stats['std_accuracy']:.4f})")
        print(f"Mean Precision: {overall_stats['mean_precision']:.4f} (±{overall_stats['std_precision']:.4f})")
        print(f"Mean Recall: {overall_stats['mean_recall']:.4f} (±{overall_stats['std_recall']:.4f})")
        print(f"Mean F1-Score: {overall_stats['mean_f1_score']:.4f} (±{overall_stats['std_f1_score']:.4f})")
        print(f"Overall Accuracy (all predictions): {overall_accuracy:.4f}")
        print("="*80)
        
        return {
            "status": "success",
            "k_folds": k_folds,
            "alpha": alpha,
            "random_state": random_state,
            "total_samples": len(y),
            "overall_stats": overall_stats,
            "overall_accuracy": float(overall_accuracy),
            "overall_confusion_matrix": overall_cm.tolist(),
            "classes": all_classes,
            "fold_results": fold_results,
            "fold_balance_info": fold_balance_info,
            "predictions_file": "cv_predictions.csv",
            "total_predictions": len(all_predictions)
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": f"Error in cross validation: {str(e)}"}


def get_cv_predictions(page=1, page_size=20, fold_filter=None):
    """
    Get predictions dengan pagination dan filter fold
    """
    try:
        if not os.path.exists("cv_predictions.csv"):
            return {"error": "CV predictions belum tersedia. Jalankan cross validation terlebih dahulu."}
        
        df = pd.read_csv("cv_predictions.csv")
        
        # Filter by fold if specified
        if fold_filter is not None:
            df = df[df["fold"] == fold_filter]
        
        total = len(df)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        data_page = df.iloc[start_idx:end_idx]
        
        # Convert to dict
        data = data_page.to_dict(orient="records")
        
        # Calculate accuracy for current page
        correct = sum(1 for d in data if d["is_correct"])
        page_accuracy = (correct / len(data)) * 100 if len(data) > 0 else 0
        
        return {
            "status": "success",
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
            "fold_filter": fold_filter,
            "page_accuracy": round(page_accuracy, 2),
            "data": data
        }
        
    except Exception as e:
        return {"error": f"Error getting predictions: {str(e)}"}


def get_fold_statistics():
    """
    Get statistik per fold dari hasil CV
    """
    try:
        if not os.path.exists("cv_predictions.csv"):
            return {"error": "CV predictions belum tersedia"}
        
        df = pd.read_csv("cv_predictions.csv")
        
        fold_stats = []
        for fold in sorted(df["fold"].unique()):
            fold_data = df[df["fold"] == fold]
            
            # Calculate metrics
            correct = fold_data["is_correct"].sum()
            total = len(fold_data)
            accuracy = (correct / total) * 100
            
            # Sentiment distribution
            pred_dist = Counter(fold_data["predicted_sentiment"])
            actual_dist = Counter(fold_data["actual_sentiment"])
            
            # Average confidence
            avg_confidence = fold_data["confidence"].mean() * 100
            
            fold_stats.append({
                "fold": int(fold),
                "total_predictions": total,
                "correct_predictions": int(correct),
                "incorrect_predictions": total - int(correct),
                "accuracy": round(accuracy, 2),
                "avg_confidence": round(avg_confidence, 2),
                "predicted_distribution": dict(pred_dist),
                "actual_distribution": dict(actual_dist)
            })
        
        return {
            "status": "success",
            "fold_stats": fold_stats
        }
        
    except Exception as e:
        return {"error": f"Error getting fold statistics: {str(e)}"}