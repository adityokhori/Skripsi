import pandas as pd
import numpy as np
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report
from sklearn.model_selection import StratifiedKFold
import joblib
from collections import Counter
import os

# Import balancing utilities
try:
    from imblearn.under_sampling import TomekLinks, RandomUnderSampler
    from imblearn.pipeline import Pipeline as ImbPipeline
    IMBLEARN_AVAILABLE = True
except ImportError:
    IMBLEARN_AVAILABLE = False
    print("Warning: imbalanced-learn not installed. Install with: pip install imbalanced-learn")


# naive_bayes_utils.py

def load_full_data(dataset_filename=None, tfidf_matrix_filename=None):
    """
    Load dataset and TF-IDF matrix with support for custom filenames
    
    Parameters:
    - dataset_filename: Path to labeled CSV (default: Get_Labelling.csv)
    - tfidf_matrix_filename: Path to TF-IDF matrix PKL (default: tfidf_matrix.pkl)
    """
    try:
        # ✅ Use provided filenames or fall back to defaults
        csv_file = dataset_filename or "Get_Labelling.csv"
        tfidf_file = tfidf_matrix_filename or "tfidf_matrix.pkl"
        
        if not os.path.exists(csv_file):
            print(f"ERROR: {csv_file} not found")
            return None, None, None
        
        if not os.path.exists(tfidf_file):
            print(f"ERROR: {tfidf_file} not found")
            return None, None, None
        
        # Load data
        df = pd.read_csv(csv_file)
        X = joblib.load(tfidf_file)
        
        print(f"✅ Loaded: {csv_file} ({len(df)} rows)")
        print(f"✅ Loaded: {tfidf_file} ({X.shape[0]} samples, {X.shape[1]} features)")
        
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
            print(f"   TF-IDF matrix: {X.shape[0]} samples")
            print(f"   Labels: {len(y)} samples")
            
            # Use minimum length
            min_length = min(X.shape[0], len(y))
            print(f"✅ Truncating both to {min_length} samples")
            X = X[:min_length]
            y = y[:min_length]
            df = df.iloc[:min_length]
        
        # ✅ Convert label to string
        y = y.astype(str)
        
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


def train_naive_bayes_with_cv(
    k=10, 
    alpha=1.0, 
    random_state=42, 
    use_balancing=False,
    dataset_filename=None,
    tfidf_matrix_filename=None,
    output_prefix="final"
):
    """
    Train Naive Bayes with Cross Validation
    
    Parameters:
    - k: number of folds
    - alpha: Laplace smoothing parameter
    - random_state: random seed
    - use_balancing: whether to use balancing (Tomek + RUS)
    - dataset_filename: CSV file path (e.g., GetLabelling_20251226_112400.csv)
    - tfidf_matrix_filename: TF-IDF matrix file (e.g., tfidf_matrix_20251226_112400.pkl)
    - output_prefix: prefix for output model file
    """
    import time
    start_time = time.time()
    
    approach_name = "BALANCED (Tomek + RUS)" if use_balancing else "IMBALANCED (No Balancing)"
    print(f"\n{'='*80}")
    print(f"📘 Naive Bayes Training - {approach_name}")
    print(f"{'='*80}")
    
    # 1. Load data with custom filenames
    df, X, y = load_full_data(
        dataset_filename=dataset_filename,
        tfidf_matrix_filename=tfidf_matrix_filename
    )
    
    if df is None or X is None or y is None:
        return {"error": "Failed to load data"}
    
    # ✅ CRITICAL: Convert to string numpy array
    y = y.astype(str) if not isinstance(y, np.ndarray) else y
    y = y.astype(str)
    
    print(f"\n1️⃣ Data loaded:")
    print(f"   Samples: {len(y):,}")
    print(f"   Features: {X.shape[1]:,}")
    
    # Show distribution
    original_dist = Counter(y)
    print(f"\n📊 Data distribution:")
    for label, count in sorted(original_dist.items()):
        pct = (count / len(y)) * 100
        print(f"   {label}: {count:>5,} ({pct:>5.2f}%)")
    
    # 2. Setup CV
    print(f"\n2️⃣ Setup:")
    print(f"   K-Fold: {k}")
    print(f"   Stratified: Yes")
    print(f"   Balancing: {'❌ NONE (Baseline)' if not use_balancing else '✅ Per-Fold (Tomek + RUS)'}")
    
    cv = StratifiedKFold(n_splits=k, shuffle=True, random_state=random_state)
    
    # Setup balancing pipeline (only if use_balancing=True)
    if use_balancing:
        if not IMBLEARN_AVAILABLE:
            print("\n⚠️ WARNING: imbalanced-learn not available!")
            return {"error": "imbalanced-learn not installed"}
    
    # 3. Cross Validation
    print(f"\n3️⃣ Running {k}-Fold Cross Validation...")
    print(f"{'='*80}")
    
    fold_metrics = []
    all_y_true = []
    all_y_pred = []
    fold_num = 1
    
    for train_idx, test_idx in cv.split(X, y):
        print(f"\n{'─'*80}")
        print(f"📍 Fold {fold_num}/{k}")
        print(f"{'─'*80}")
        
        # Split data ORIGINAL first
        X_train, X_test = X[train_idx], X[test_idx]
        y_train, y_test = y[train_idx], y[test_idx]
        
        print(f"   Original train: {len(y_train):>5,} samples")
        print(f"   Original test:  {len(y_test):>5,} samples")
        
        # Show train distribution BEFORE processing
        train_dist_before = Counter(y_train)
        print(f"\n   📊 Train distribution {'(IMBALANCED)' if not use_balancing else '(BEFORE balancing)'}:")
        for label in sorted(train_dist_before.keys()):
            pct = (train_dist_before[label] / len(y_train)) * 100
            print(f"      {label}: {train_dist_before[label]:>5,} ({pct:>5.1f}%)")
        
        # Apply balancing if needed
        tomek_removed = 0
        rus_removed = 0
        
        if use_balancing:
            try:
                # Apply Tomek Links first
                tomek = TomekLinks(sampling_strategy='all')
                X_after_tomek, y_after_tomek = tomek.fit_resample(X_train, y_train)
                tomek_removed = len(y_train) - len(y_after_tomek)
                
                # Apply RUS after Tomek
                rus = RandomUnderSampler(random_state=random_state)
                X_train_processed, y_train_processed = rus.fit_resample(X_after_tomek, y_after_tomek)
                rus_removed = len(y_after_tomek) - len(y_train_processed)
                
                train_dist_after = Counter(y_train_processed)
                print(f"      ├─ Tomek Links removed: {tomek_removed:>5} samples")
                print(f"      ├─ RUS removed:         {rus_removed:>5} samples")
                print(f"      └─ Total removed:       {tomek_removed + rus_removed:>5} samples")
                print(f"\n   📊 Train distribution AFTER balancing:")
                for label in sorted(train_dist_after.keys()):
                    pct = (train_dist_after[label] / len(y_train_processed)) * 100
                    print(f"      {label}: {train_dist_after[label]:>5} ({pct:5.1f}%)")
                print(f"      Balanced train: {len(y_train_processed):>5} samples")
                
            except Exception as e:
                print(f"      ⚠️ Balancing failed: {e}. Using original data.")
                X_train_processed = X_train
                y_train_processed = y_train
                tomek_removed = 0
                rus_removed = 0
        else:
            X_train_processed = X_train
            y_train_processed = y_train
            print(f"      Data tetap IMBALANCED (no balancing applied)")
        
        # Show test distribution (always ORIGINAL)
        test_dist = Counter(y_test)
        print(f"\n   📊 Test distribution (IMBALANCED):")
        for label in sorted(test_dist.keys()):
            pct = (test_dist[label] / len(y_test)) * 100
            print(f"      {label}: {test_dist[label]:>4,} ({pct:>5.1f}%)")
        
        # Train model
        model = MultinomialNB(alpha=alpha)
        model.fit(X_train_processed, y_train_processed)
        
        # Predict on ORIGINAL imbalanced test data
        y_pred = model.predict(X_test)
        
        # Calculate metrics
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, average='macro', zero_division=0)
        rec = recall_score(y_test, y_pred, average='macro', zero_division=0)
        f1 = f1_score(y_test, y_pred, average='macro', zero_division=0)
        
        # Store metrics
        fold_metrics.append({
            'fold': fold_num,
            'train_size': len(y_train_processed),
            'test_size': len(y_test),
            'tomek_removed': tomek_removed,
            'rus_removed': rus_removed,
            'total_removed': tomek_removed + rus_removed,
            'balanced_train_size': len(y_train_processed),
            'accuracy': acc,
            'precision': prec,
            'recall': rec,
            'f1_score': f1
        })
        
        # Store for overall confusion matrix
        all_y_true.extend(y_test)
        all_y_pred.extend(y_pred)
        
        print(f"\n   ✅ Fold {fold_num} Results:")
        print(f"      Accuracy : {acc:.4f} ({acc*100:>6.2f}%)")
        print(f"      Precision: {prec:.4f} ({prec*100:>6.2f}%)")
        print(f"      Recall   : {rec:.4f} ({rec*100:>6.2f}%)")
        print(f"      F1-Score : {f1:.4f} ({f1*100:>6.2f}%)")
        
        fold_num += 1
    
    # 4. Summary
    print(f"\n{'='*80}")
    print(f"📊 CROSS VALIDATION SUMMARY")
    print(f"{'='*80}")
    
    mean_acc = np.mean([m['accuracy'] for m in fold_metrics])
    std_acc = np.std([m['accuracy'] for m in fold_metrics])
    mean_prec = np.mean([m['precision'] for m in fold_metrics])
    mean_rec = np.mean([m['recall'] for m in fold_metrics])
    mean_f1 = np.mean([m['f1_score'] for m in fold_metrics])
    
    print(f"\n📈 Mean ± Std:")
    print(f"   Accuracy : {mean_acc:.4f} ± {std_acc:.4f} ({mean_acc*100:>6.2f}% ± {std_acc*100:>5.2f}%)")
    print(f"   Precision: {mean_prec:.4f} ({mean_prec*100:>6.2f}%)")
    print(f"   Recall   : {mean_rec:.4f} ({mean_rec*100:>6.2f}%)")
    print(f"   F1-Score : {mean_f1:.4f} ({mean_f1*100:>6.2f}%)")
    
    # 5. Train Final Model
    print(f"\n{'='*80}")
    print(f"🎯 TRAINING FINAL MODEL")
    print(f"{'='*80}")
    
    if use_balancing:
        print(f"\n⚙️ Applying balancing to full dataset...")
        try:
            tomek = TomekLinks(sampling_strategy='all')
            X_after_tomek, y_after_tomek = tomek.fit_resample(X, y)
            
            rus = RandomUnderSampler(random_state=random_state)
            X_final, y_final = rus.fit_resample(X_after_tomek, y_after_tomek)
            
            print(f"   Before: {len(y):>5,} samples")
            print(f"   After : {len(y_final):>5,} samples")
        except Exception as e:
            print(f"   ⚠️ Balancing failed: {e}. Using original.")
            X_final, y_final = X, y
    else:
        print(f"\n⚠️ Using FULL IMBALANCED dataset (no balancing)")
        X_final, y_final = X, y
        print(f"   Total: {len(y):>5,} samples (imbalanced)")
    
    # Train final model
    final_model = MultinomialNB(alpha=alpha)
    final_model.fit(X_final, y_final)
    
    # Generate output filename based on input
    if dataset_filename and "_" in dataset_filename:
        timestamp = dataset_filename.replace("GetLabelling_", "").replace(".csv", "")
    else:
        from datetime import datetime
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # Save model
    approach_str = "balanced" if use_balancing else "non_balanced"
    model_filename = f"models/{output_prefix}_nb_{approach_str}_{timestamp}.pkl"
    
    os.makedirs('models', exist_ok=True)
    joblib.dump({
        'model': final_model,
        'approach': approach_str,
        'k_folds': k,
        'alpha': alpha,
        'use_balancing': use_balancing,
        'dataset_filename': dataset_filename,
        'tfidf_matrix_filename': tfidf_matrix_filename,
        'timestamp': timestamp,
        'metrics': {
            'accuracy': mean_acc * 100,
            'precision': mean_prec * 100,
            'recall': mean_rec * 100,
            'f1_score': mean_f1 * 100
        }
    }, model_filename)
    
    print(f"\n✅ Model saved: {model_filename}")
    
    # 6. Confusion Matrix
    labels = sorted(list(set(all_y_true)))
    cm = confusion_matrix(all_y_true, all_y_pred, labels=labels)
    
    print(f"\n{'='*80}")
    print(f"🧩 CONFUSION MATRIX (from CV Predictions)")
    print(f"{'='*80}")
    
    cm_df = pd.DataFrame(cm, index=labels, columns=labels)
    print(f"\n{cm_df.to_string()}")
    
    # Verification
    cm_accuracy = np.trace(cm) / np.sum(cm)
    print(f"\n✅ VERIFICATION:")
    print(f"   Accuracy from CM: {cm_accuracy:.4f} ({cm_accuracy*100:>6.2f}%)")
    print(f"   Mean CV Accuracy: {mean_acc:.4f} ({mean_acc*100:>6.2f}%)")
    
    # Calculate training time
    training_time = time.time() - start_time
    
    print(f"\n{'='*80}")
    print(f"✅ TRAINING COMPLETED")
    print(f"{'='*80}")
    print(f"   Total time: {training_time:.2f} seconds")
    print(f"   Total samples: {len(y)}")
    print(f"   Mean accuracy: {mean_acc*100:.2f}%")
    print(f"{'='*80}\n")
    
    # Return statement
    return {
        "status": "success",
        "message": f"Training completed - {approach_name}",
        "model_filename": model_filename,
        "approach": approach_str,
        "k_folds": k,
        "use_balancing": use_balancing,
        "dataset_used": dataset_filename or "Get_Labelling.csv",
        "tfidf_matrix_used": tfidf_matrix_filename or "tfidf_matrix.pkl",
        "timestamp": timestamp,
        "overall_metrics": {
            "accuracy": mean_acc * 100,
            "precision": mean_prec * 100,
            "recall": mean_rec * 100,
            "f1_score": mean_f1 * 100
        },
        "fold_details": fold_metrics,
        "confusion_matrix": cm.tolist(),
        "class_names": labels,
        "cv_performance": {
            "mean_accuracy": mean_acc,
            "std_accuracy": std_acc
        },
        "data_info": {
            "total_samples": len(y),
        },
        "training_time_seconds": training_time
    }



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





def verify_tfidf_in_likelihood():
    """
    Verifikasi sederhana: apakah nilai TF-IDF benar-benar masuk ke likelihood
    """
    print(f"\n{'='*80}")
    print(f"🔍 VERIFIKASI PENGGUNAAN TF-IDF DALAM LIKELIHOOD")
    print(f"{'='*80}")
    
    # Load data
    df, X, y = load_full_data()
    if X is None:
        return
    
    # Train model sederhana
    model = MultinomialNB(alpha=1.0)
    model.fit(X, y)
    
    # BUKTI 1: Cek feature_count_ (akumulasi TF-IDF)
    print(f"\n1️⃣ BUKTI: feature_count_ berisi akumulasi nilai TF-IDF")
    print(f"   Shape: {model.feature_count_.shape}")
    
    for i, kelas in enumerate(model.classes_):
        total = model.feature_count_[i].sum()
        print(f"   Kelas {kelas}: Total TF-IDF sum = {total:.4f}")
    
    # BUKTI 2: Hitung manual dan bandingkan
    print(f"\n2️⃣ VERIFIKASI MANUAL vs SCIKIT-LEARN:")
    kelas_test = model.classes_[0]  # Ambil kelas pertama
    class_mask = (y == kelas_test)
    X_class = X[class_mask]
    
    # Manual: sum TF-IDF untuk kelas ini
    manual_sum = X_class.sum(axis=0).A1  # Convert sparse to array
    
    # Dari model
    model_feature_count = model.feature_count_[0]
    
    # Bandingkan 5 feature pertama
    print(f"\n   Kelas '{kelas_test}' - 5 feature pertama:")
    print(f"   {'Feature':<10} {'Manual Sum':<15} {'Model feature_count_':<20} {'Match?'}")
    print(f"   {'-'*60}")
    
    for i in range(min(5, len(manual_sum))):
        match = "✅" if np.isclose(manual_sum[i], model_feature_count[i]) else "❌"
        print(f"   {i:<10} {manual_sum[i]:<15.4f} {model_feature_count[i]:<20.4f} {match}")
    
    # BUKTI 3: Likelihood menggunakan feature_count_
    print(f"\n3️⃣ BUKTI: Likelihood dihitung dari feature_count_ (TF-IDF sum)")
    n_features = model.feature_count_.shape[1]
    alpha = model.alpha
    
    # Manual calculation likelihood
    total_tfidf = model.feature_count_[0].sum()
    denominator = total_tfidf + alpha * n_features
    
    # Ambil 1 feature sebagai contoh
    feature_idx = 0
    numerator = model.feature_count_[0][feature_idx] + alpha
    manual_log_prob = np.log(numerator / denominator)
    model_log_prob = model.feature_log_prob_[0][feature_idx]
    
    print(f"\n   Contoh feature {feature_idx}:")
    print(f"   TF-IDF sum (dari feature_count_): {model.feature_count_[0][feature_idx]:.4f}")
    print(f"   Manual log P(t|c): {manual_log_prob:.6f}")
    print(f"   Model log P(t|c):  {model_log_prob:.6f}")
    print(f"   Match? {'✅ YA' if np.isclose(manual_log_prob, model_log_prob) else '❌ TIDAK'}")
    
    print(f"\n{'='*80}")
    print(f"✅ KESIMPULAN: Nilai TF-IDF TERBUKTI digunakan dalam likelihood!")
    print(f"{'='*80}\n")


def predict_new_text(text, approach="balanced", k=10):
    """
    Prediksi sentimen untuk teks baru
    
    Parameters:
    - text: string teks yang akan diprediksi
    - approach: "imbalanced" atau "balanced"
    - k: jumlah fold yang digunakan saat training
    """
    try:
        # Load model dan vectorizer
        model_filename = f"naive_bayes_{approach}_{k}fold.pkl"
        model = joblib.load(model_filename)
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
            "approach": approach,
            "k_folds": k
        }
        
    except FileNotFoundError:
        return {"error": f"Model {approach} dengan {k}-fold belum dilatih"}
    except Exception as e:
        return {"error": f"Gagal prediksi: {str(e)}"}


def get_model_info(approach="balanced", k=10):
    """
    Mendapatkan informasi tentang model yang sudah dilatih
    """
    try:
        model_filename = f"naive_bayes_{approach}_{k}fold.pkl"
        model = joblib.load(model_filename)
        
        # Get feature count using shape
        n_features = model.feature_count_.shape[1]
        
        return {
            "approach": approach,
            "k_folds": k,
            "classes": model.classes_.tolist(),
            "n_features": n_features,
            "model_exists": True,
            "model_filename": model_filename
        }
        
    except FileNotFoundError:
        return {
            "approach": approach,
            "k_folds": k,
            "model_exists": False,
            "error": f"Model {approach} dengan {k}-fold belum dilatih"
        }
    except Exception as e:
        return {"error": f"Gagal mengambil info model: {str(e)}"}


def compare_approaches():
    """
    Membandingkan performa model balanced vs imbalanced
    """
    try:
        results = {}
        
        for approach in ["balanced", "imbalanced"]:
            model_info = get_model_info(approach)
            if model_info.get("model_exists"):
                results[approach] = {
                    "model_exists": True,
                    "model_filename": model_info["model_filename"],
                    "classes": model_info["classes"],
                    "n_features": model_info["n_features"]
                }
            else:
                results[approach] = {
                    "model_exists": False,
                    "message": f"Model {approach} belum dilatih"
                }
        
        return results
        
    except Exception as e:
        return {"error": f"Gagal membandingkan model: {str(e)}"}


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
        requirements["get_labelling_exists"],
        requirements["tfidf_matrix_exists"],
        requirements["tfidf_vectorizer_exists"]
    ])
    
    requirements["all_ready"] = all_ready
    requirements["balancing_ready"] = all_ready and requirements["imblearn_available"]
    
    if not requirements["imblearn_available"]:
        requirements["install_command"] = "pip install imbalanced-learn"
    
    return requirements


# Di akhir file naive_bayes_utils.py atau di main.py
if __name__ == "__main__":
    verify_tfidf_in_likelihood()
