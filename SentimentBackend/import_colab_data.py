import pandas as pd
import joblib
import os
from collections import Counter

def import_from_colab():
    """
    Import data dari Google Colab ke format yang digunakan website
    """
    try:
        print("=== Starting Import from Colab ===\n")
        
        # 1. Load data dari Colab
        print("Loading Labelling.csv...")
        df = pd.read_csv("Labelling.csv")
        
        print(f"✓ Loaded {len(df)} rows")
        print(f"Columns: {df.columns.tolist()}\n")
        
        # 2. Mapping kolom ke format yang dibutuhkan website
        print("Mapping columns...")
        
        # Buat kolom 'id' dari index jika belum ada
        if 'id' not in df.columns:
            df['id'] = range(1, len(df) + 1)
        
        # Rename Comment menjadi comment (lowercase)
        column_mapping = {
            'Comment': 'comment',
            'finalText': 'finalText',
            'sentiment': 'sentiment'
        }
        
        df = df.rename(columns=column_mapping)
        
        # 3. Pastikan kolom yang diperlukan ada
        required_columns = ['id', 'comment', 'finalText', 'sentiment']
        
        for col in required_columns:
            if col not in df.columns:
                print(f"✗ Missing required column: {col}")
                return {"error": f"Missing column: {col}"}
        
        # 4. Tambahkan confidence berdasarkan sentiment_score
        if 'sentiment_score' in df.columns:
            # Konversi sentiment_score ke confidence level
            df['confidence'] = df['sentiment_score'].apply(lambda x: 
                'High' if abs(x) >= 2 else 
                'Medium' if abs(x) >= 1 else 
                'Low'
            )
        else:
            df['confidence'] = 'High'
        
        # 5. Standardisasi label sentiment
        # Pastikan format: Positif, Negatif, Netral (huruf kapital di awal)
        sentiment_mapping = {
            'positive': 'Positif',
            'Positive': 'Positif',
            'POSITIVE': 'Positif',
            'negative': 'Negatif',
            'Negative': 'Negatif',
            'NEGATIVE': 'Negatif',
            'neutral': 'Netral',
            'Neutral': 'Netral',
            'NEUTRAL': 'Netral',
            'Positif': 'Positif',  # already correct
            'Negatif': 'Negatif',
            'Netral': 'Netral'
        }
        
        df['sentiment'] = df['sentiment'].map(sentiment_mapping)
        
        # Check for unmapped sentiments
        unmapped = df[df['sentiment'].isna()]
        if len(unmapped) > 0:
            print(f"⚠ Warning: {len(unmapped)} rows have unmapped sentiment values")
            print(f"Unique unmapped values: {unmapped['sentiment'].unique()}")
        
        # 6. Pilih kolom yang diperlukan dan tambahan dari Colab
        final_columns = [
            'id', 
            'comment', 
            'finalText', 
            'sentiment', 
            'confidence',
            'Timestamp',
            'Username',
            'VideoID',
            'Date',
            'positive_count',
            'negative_count',
            'sentiment_score'
        ]
        
        # Hanya ambil kolom yang ada
        available_columns = [col for col in final_columns if col in df.columns]
        df_final = df[available_columns]
        
        # 7. Save sebagai GetProcessed.csv
        output_filename = "GetProcessed.csv"
        df_final.to_csv(output_filename, index=False)
        print(f"✓ Saved as {output_filename}")
        
        # 8. Verifikasi TF-IDF files
        tfidf_files = {
            'vectorizer': 'tfidf_vectorizer.pkl',
            'matrix': 'tfidf_matrix.pkl'
        }
        
        print("\n=== Verifying TF-IDF Files ===")
        for name, filename in tfidf_files.items():
            if os.path.exists(filename):
                print(f"✓ {filename} found")
                if name == 'matrix':
                    X = joblib.load(filename)
                    print(f"  Shape: {X.shape}")
                    print(f"  Type: {type(X)}")
                elif name == 'vectorizer':
                    vectorizer = joblib.load(filename)
                    print(f"  Vocabulary size: {len(vectorizer.vocabulary_)}")
            else:
                print(f"✗ {filename} NOT found")
                return {"error": f"Missing file: {filename}"}
        
        # 9. Summary
        sentiment_dist = Counter(df_final['sentiment'].values)
        
        print("\n=== Import Summary ===")
        print(f"Total data: {len(df_final)}")
        print(f"Columns saved: {df_final.columns.tolist()}")
        print(f"\nSentiment Distribution:")
        for sentiment, count in sentiment_dist.items():
            percentage = (count / len(df_final)) * 100
            print(f"  {sentiment}: {count} ({percentage:.1f}%)")
        
        print("\n✓ Import from Colab completed successfully!")
        
        return {
            "status": "success",
            "total_data": len(df_final),
            "columns": df_final.columns.tolist(),
            "sentiment_distribution": dict(sentiment_dist),
            "sentiment_percentages": {
                k: round(v / len(df_final) * 100, 2) 
                for k, v in sentiment_dist.items()
            },
            "output_file": output_filename
        }
        
    except Exception as e:
        print(f"\n✗ Error importing from Colab: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}


def verify_colab_files():
    """
    Verifikasi file dari Colab dan kompatibilitasnya
    """
    print("\n" + "="*50)
    print("VERIFICATION REPORT - Colab Files")
    print("="*50 + "\n")
    
    # 1. Check file existence
    files_to_check = [
        "Labelling.csv",
        "labeled_df.pkl",
        "tfidf_vectorizer.pkl",
        "tfidf_matrix.pkl"
    ]
    
    print("1. File Existence Check:")
    all_exists = True
    for file in files_to_check:
        exists = os.path.exists(file)
        status = "✓ Found" if exists else "✗ Not found"
        print(f"   {status}: {file}")
        if not exists and file in ["Labelling.csv", "tfidf_vectorizer.pkl", "tfidf_matrix.pkl"]:
            all_exists = False
    
    if not all_exists:
        print("\n⚠ Missing required files! Please upload all files from Colab.")
        return
    
    # 2. Check CSV structure
    print("\n2. CSV Structure:")
    try:
        df = pd.read_csv("Labelling.csv")
        print(f"   Shape: {df.shape} (rows × columns)")
        print(f"   Columns: {df.columns.tolist()}")
        
        print("\n   Sample data (first 3 rows):")
        print(df.head(3).to_string())
        
        if "sentiment" in df.columns:
            print(f"\n   Sentiment Distribution:")
            sentiment_counts = df["sentiment"].value_counts()
            for sentiment, count in sentiment_counts.items():
                percentage = (count / len(df)) * 100
                print(f"     {sentiment}: {count} ({percentage:.1f}%)")
        
        # Check for missing values
        print("\n   Missing Values:")
        missing = df.isnull().sum()
        for col, count in missing.items():
            if count > 0:
                print(f"     {col}: {count} missing ({count/len(df)*100:.1f}%)")
        
    except Exception as e:
        print(f"   ✗ Error reading CSV: {e}")
    
    # 3. Check TF-IDF compatibility
    print("\n3. TF-IDF Compatibility:")
    try:
        X = joblib.load("tfidf_matrix.pkl")
        vectorizer = joblib.load("tfidf_vectorizer.pkl")
        
        print(f"   Matrix shape: {X.shape}")
        print(f"   Matrix type: {type(X)}")
        print(f"   Vocabulary size: {len(vectorizer.vocabulary_)}")
        print(f"   Matrix density: {X.nnz / (X.shape[0] * X.shape[1]) * 100:.2f}%")
        
        # Check if matrix rows match CSV rows
        if df.shape[0] == X.shape[0]:
            print(f"   ✓ Matrix rows match CSV rows: {X.shape[0]}")
        else:
            print(f"   ⚠ WARNING: Matrix rows ({X.shape[0]}) ≠ CSV rows ({df.shape[0]})")
        
    except Exception as e:
        print(f"   ✗ Error checking TF-IDF: {e}")
    
    # 4. Recommendation
    print("\n4. Recommendations:")
    if all_exists:
        print("   ✓ All required files are present")
        print("   ✓ Ready to import data")
        print("\n   Next step: Run import_from_colab() to import data")
    else:
        print("   ✗ Upload missing files before proceeding")
    
    print("\n" + "="*50 + "\n")


def check_compatibility_with_website():
    """
    Check if imported data is compatible with website workflow
    """
    print("\n=== Checking Website Compatibility ===\n")
    
    required_files = {
        "GetProcessed.csv": "Preprocessed data",
        "tfidf_vectorizer.pkl": "TF-IDF vectorizer",
        "tfidf_matrix.pkl": "TF-IDF feature matrix"
    }
    
    all_compatible = True
    
    for filename, description in required_files.items():
        if os.path.exists(filename):
            print(f"✓ {description}: {filename}")
        else:
            print(f"✗ Missing {description}: {filename}")
            all_compatible = False
    
    if all_compatible:
        # Try to load and verify
        try:
            df = pd.read_csv("GetProcessed.csv")
            X = joblib.load("tfidf_matrix.pkl")
            vectorizer = joblib.load("tfidf_vectorizer.pkl")
            
            print(f"\n✓ All files loaded successfully")
            print(f"  Data shape: {df.shape}")
            print(f"  TF-IDF shape: {X.shape}")
            print(f"  Vocabulary: {len(vectorizer.vocabulary_)} terms")
            
            # Check required columns
            required_cols = ["id", "comment", "finalText", "sentiment"]
            missing_cols = [col for col in required_cols if col not in df.columns]
            
            if not missing_cols:
                print(f"\n✓ All required columns present")
                print(f"  Ready for: Splitting → Balancing → Training")
            else:
                print(f"\n✗ Missing columns: {missing_cols}")
                all_compatible = False
                
        except Exception as e:
            print(f"\n✗ Error verifying files: {e}")
            all_compatible = False
    
    return all_compatible


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "verify":
        # Verifikasi saja
        verify_colab_files()
        check_compatibility_with_website()
    elif len(sys.argv) > 1 and sys.argv[1] == "import":
        # Import data
        result = import_from_colab()
        if result.get("status") == "success":
            print("\n✓ Ready to use in website!")
            print("\nNext steps:")
            print("1. Go to Data Splitting page")
            print("2. Split data into train/test")
            print("3. Apply data balancing")
            print("4. Train Naive Bayes model")
    else:
        print("Usage:")
        print("  python import_colab_data.py verify  - Verify Colab files")
        print("  python import_colab_data.py import  - Import data to website format")