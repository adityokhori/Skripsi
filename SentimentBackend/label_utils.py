# label_utils.py
"""
Utility untuk labeling otomatis. Disesuaikan agar memprioritaskan kolom
`negationHandled` jika tersedia pada hasil preprocessing.
Menyimpan Get_Labelling.csv yang berisi kolom negationHandled juga.
"""

import os
import pandas as pd

# ---------- Load lexicon ----------
def load_lexicon_file(filename):
    """Load lexicon file (one word per line), toleran terhadap encoding."""
    try:
        if not os.path.exists(filename):
            print(f"Warning: {filename} not found. Using empty word list.")
            return []
        with open(filename, encoding="utf-8") as f:
            words = f.read().splitlines()
        return [w.strip().lower() for w in words if w.strip()]
    except Exception as e:
        print(f"Error loading {filename}: {e}")
        return []

positive_words = load_lexicon_file("Positive.csv")
negative_words = load_lexicon_file("Negative.csv")

# ---------- Labeling function ----------
def label_text(text: str):
    """
    Hitung sentimen berdasarkan kehadiran kata dari positive_words dan negative_words.
    Mengembalikan tuple (sentiment, confidence).
    """
    if not isinstance(text, str):
        text = str(text) if text is not None else ""

    text = text.lower()

    pos_score = sum(1 for word in positive_words if word in text)
    neg_score = sum(1 for word in negative_words if word in text)

    if pos_score > neg_score:
        sentiment = "Positif"
    elif neg_score > pos_score:
        sentiment = "Negatif"
    else:
        sentiment = "Netral"

    total_sentiment_words = pos_score + neg_score
    score_diff = abs(pos_score - neg_score)

    if total_sentiment_words == 0:
        confidence = "Low"
    elif score_diff >= 2 and total_sentiment_words >= 3:
        confidence = "High"
    elif score_diff >= 1 or total_sentiment_words >= 2:
        confidence = "Medium"
    else:
        confidence = "Low"

    return sentiment, confidence

def get_latest_preprocessed(data_dir="./"):
    """
    Ambil file preprocessing terbaru (GetProcessed.csv).
    Menghasilkan tuple (filepath, dataframe) atau (None, None).
    """
    try:
        candidate = os.path.join(data_dir, "GetProcessed.csv")
        if not os.path.exists(candidate):
            print("No data files found (GetProcessed.csv).")
            return None, None
        print(f"Reading file: {candidate}")
        df = pd.read_csv(candidate, encoding="utf-8")
        
        # fallback column names
        text_columns = ["negationHandled", "finalText", "processed_text", "cleaned_text", "comment"]
        found = None
        for c in text_columns:
            if c in df.columns:
                found = c
                break
        if found is None:
            print(f"Warning: No text-like column found in {candidate}. Available columns: {list(df.columns)}")
            return candidate, df

        # Ensure finalText column exists (for backward compatibility)
        if "finalText" not in df.columns:
            if found != "finalText":
                df["finalText"] = df[found]
        # Make sure negationHandled present (may be absent)
        if "negationHandled" not in df.columns:
            df["negationHandled"] = df["finalText"]

        # Ensure id exists
        if "id" not in df.columns:
            df.insert(0, "id", range(1, len(df) + 1))

        # Fill missing di comment saja
        if "comment" not in df.columns:
            df["comment"] = ""
        
        # ✅ CLEANING prioritas kolom teks (untuk labelling)
        text_columns_priority = ["negationHandled", "finalText", "processed_text", "cleaned_text", "comment"]
        text_col = None
        for c in text_columns_priority:
            if c in df.columns:
                text_col = c
                break

        if text_col is not None:
            print(f"Before cleaning: {len(df)} rows")
            
            # Drop baris yang teks-nya NaN
            df = df.dropna(subset=[text_col])
            print(f"After dropna on {text_col}: {len(df)} rows")
            
            # Konversi ke string dan strip
            df[text_col] = df[text_col].astype(str).str.strip()
            
            # Buang string kosong dan 'nan'
            df = df[df[text_col] != ""]
            df = df[df[text_col] != "nan"]
            df = df[df[text_col].str.len() > 0]
            print(f"After cleaning empty strings on {text_col}: {len(df)} rows")

        # ✅ TAMBAHAN: Validasi khusus untuk finalText (yang akan dipakai TFIDF)
        if "finalText" in df.columns:
            print(f"Before finalText validation: {len(df)} rows")
            
            # Drop baris yang finalText-nya NaN atau kosong
            df = df.dropna(subset=["finalText"])
            df["finalText"] = df["finalText"].astype(str).str.strip()
            df = df[df["finalText"] != ""]
            df = df[df["finalText"] != "nan"]
            df = df[df["finalText"].str.len() > 0]
            
            print(f"After finalText validation: {len(df)} rows")
        
        # Pastikan negationHandled juga bersih
        if "negationHandled" in df.columns:
            df["negationHandled"] = df["negationHandled"].fillna("").astype(str).str.strip()
        
        # Reset index setelah drop rows
        df = df.reset_index(drop=True)

        print(f"Successfully loaded {len(df)} rows from {os.path.basename(candidate)}")
        return candidate, df
    except Exception as e:
        print(f"Error reading preprocessed file: {e}")
        return None, None


def get_labelled_data(data_dir="./"):
    """
    Jika ada Get_Labelling.csv, baca itu (jika lengkap), jika tidak, fallback ke GetProcessed.csv
    """
    try:
        labelling_file = os.path.join(data_dir, "Get_Labelling.csv")
        if os.path.exists(labelling_file):
            print(f"Reading labelled file: {labelling_file}")
            df = pd.read_csv(labelling_file, encoding="utf-8")
            required_cols = ["id", "finalText", "sentiment"]
            if all(col in df.columns for col in required_cols):
                return labelling_file, df
            else:
                print("Warning: Get_Labelling.csv missing required columns; falling back.")
        return get_latest_preprocessed(data_dir)
    except Exception as e:
        print(f"Error reading labelled data: {e}")
        return get_latest_preprocessed(data_dir)

# ---------- Save helper ----------
def save_labelled_data(df, output_file="Get_Labelling.csv"):
    """
    Simpan df menjadi CSV. Pastikan kolom yang dibutuhkan tersedia.
    Kita sertakan 'negationHandled' agar tidak hilang.
    """

    try:
        required_columns = ["id", "comment", "negationHandled", "finalText", "sentiment", "confidence"]
        for col in required_columns:
            if col not in df.columns:
                print(f"Warning: Column '{col}' not found in dataframe. Cannot save.")
                return False
        df.to_csv(output_file, index=False, encoding="utf-8")
        print(f"Successfully saved labelled data to {output_file}")
        return True
    except Exception as e:
        print(f"Error saving labelled data: {e}")
        return False
    
# label_utils.py - Update function auto_label_and_save

def auto_label_and_save(input_file=None, output_file=None, data_dir="./"):
    """
    Lakukan auto-labelling dengan prioritas kolom:
    negationHandled -> finalText -> comment
    
    Args:
        input_file: Path ke file GetProcessed_TIMESTAMP.csv (opsional)
        output_file: Path output GetLabelling_TIMESTAMP.csv (opsional)
        data_dir: Directory untuk file (default: current dir)
    
    Returns:
        dict dengan status, filename, total_labelled, data
    """
    print("[DEBUG] auto_label_and_save() DIPANGGIL")
    
    try:
        print("Starting auto labelling...")
        
        # ✅ Load file berdasarkan input_file yang dipilih
        if input_file:
            # User memilih file spesifik
            filepath = input_file if os.path.isabs(input_file) else os.path.join(data_dir, input_file)
            
            if not os.path.exists(filepath):
                return {"error": f"Input file not found: {filepath}"}
            
            print(f"Reading specified file: {filepath}")
            df = pd.read_csv(filepath, encoding="utf-8")
            
            # ✅ Generate output filename berdasarkan input
            # GetProcessed_20251226_112400.csv → GetLabelling_20251226_112400.csv
            if output_file is None:
                if "_" in os.path.basename(filepath) and filepath.startswith("GetProcessed_"):
                    timestamp = os.path.basename(filepath).replace("GetProcessed_", "").replace(".csv", "")
                    output_file = f"GetLabelling_{timestamp}.csv"
                else:
                    # Fallback
                    from datetime import datetime
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    output_file = f"GetLabelling_{timestamp}.csv"
            
        else:
            # Fallback ke behavior lama (cari GetProcessed.csv)
            latest_file, df = get_latest_preprocessed(data_dir)
            if latest_file is None or df is None:
                return {"error": "No preprocessed data found. Run preprocessing first."}
            
            filepath = latest_file
            if output_file is None:
                output_file = "Get_Labelling.csv"
        
        print(f"Found file: {filepath} with {len(df)} rows")
        
        # Validasi kolom yang dibutuhkan
        text_columns = ["negationHandled", "finalText", "processed_text", "cleaned_text", "comment"]
        found = None
        for c in text_columns:
            if c in df.columns:
                found = c
                break
        
        if found is None:
            return {"error": f"No valid text column found. Available columns: {list(df.columns)}"}
        
        # Ensure required columns exist
        if "finalText" not in df.columns:
            df["finalText"] = df[found]
        
        if "negationHandled" not in df.columns:
            df["negationHandled"] = df["finalText"]
        
        if "id" not in df.columns:
            df.insert(0, "id", range(1, len(df) + 1))
        
        if "comment" not in df.columns:
            df["comment"] = ""
        
        # ✅ CLEANING data
        print(f"Before cleaning: {len(df)} rows")
        
        # Clean finalText (yang akan dipakai TFIDF)
        df = df.dropna(subset=["finalText"])
        df["finalText"] = df["finalText"].astype(str).str.strip()
        df = df[df["finalText"] != ""]
        df = df[df["finalText"] != "nan"]
        df = df[df["finalText"].str.len() > 0]
        
        # Clean negationHandled
        df["negationHandled"] = df["negationHandled"].fillna("").astype(str).str.strip()
        
        # Reset index
        df = df.reset_index(drop=True)
        
        print(f"After cleaning: {len(df)} rows")
        
        if len(df) == 0:
            return {"error": "Empty dataset after cleaning."}
        
        # choose column to use for labelling
        text_col = "negationHandled" if "negationHandled" in df.columns else "finalText"
        print(f"[INFO] Auto-labelling uses column: {text_col}")
        
        # Labelling process
        sentiments = []
        confidences = []
        
        for _, row in df.iterrows():
            text_to_label = ""
            
            # prefer negationHandled if available and not empty
            if pd.notna(row.get("negationHandled", "")) and str(row.get("negationHandled", "")).strip():
                text_to_label = str(row.get("negationHandled", ""))
            elif pd.notna(row.get("finalText", "")) and str(row.get("finalText", "")).strip():
                text_to_label = str(row.get("finalText", ""))
            else:
                text_to_label = str(row.get("comment", ""))
            
            if not text_to_label:
                sentiments.append("Netral")
                confidences.append("Low")
                continue
            
            sentiment, confidence = label_text(text_to_label)
            sentiments.append(sentiment)
            confidences.append(confidence)
        
        df["sentiment"] = sentiments
        df["confidence"] = confidences
        df["labelMethod"] = "Auto"
        
        # ✅ Save dengan output_file yang sudah di-generate
        output_path = output_file if os.path.isabs(output_file) else os.path.join(data_dir, output_file)
        save_success = save_labelled_data(df, output_path)
        
        if not save_success:
            return {"error": f"Failed to save {output_file}"}
        
        labelled_data = df[["id", "comment", "negationHandled", "finalText", "sentiment", "confidence", "labelMethod"]].to_dict(orient="records")
        
        print(f"Successfully labelled and saved {len(labelled_data)} rows to {output_path}")
        
        return {
            "status": "success",
            "filename": os.path.basename(output_path),
            "total_labelled": len(labelled_data),
            "data": labelled_data
        }
        
    except Exception as e:
        print(f"Auto label error: {e}")
        import traceback
        traceback.print_exc()
        return {"error": f"An error occurred: {str(e)}"}
