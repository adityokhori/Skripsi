import os
import glob
import pandas as pd

# Load lexicon with error handling
def load_lexicon_file(filename):
    """Load lexicon file with proper error handling"""
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

# Load lexicon files
positive_words = load_lexicon_file("Positive.csv")
negative_words = load_lexicon_file("Negative.csv")

def label_text(text: str):
    """
    Hitung sentimen berdasarkan lexicon.
    """
    if not isinstance(text, str):
        text = str(text) if text is not None else ""
    
    text = text.lower()
    
    # Count positive and negative words
    pos_score = sum(1 for word in positive_words if word in text)
    neg_score = sum(1 for word in negative_words if word in text)

    # Determine sentiment
    if pos_score > neg_score:
        sentiment = "Positif"
    elif neg_score > pos_score:
        sentiment = "Negatif"
    else:
        sentiment = "Netral"

    # Determine confidence based on score difference and total words found
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
    Ambil file preprocessing terbaru.
    """
    try:
        # Priority order for finding processed files
        file_priorities = [
            "GetProcessed.csv",       # New consistent naming
            #"GetComments.csv"         # Fallback to original file
        ]
        
        latest_file = None
        for filename in file_priorities:
            filepath = os.path.join(data_dir, filename)
            if os.path.exists(filepath):
                latest_file = filepath
                break
        
        if not latest_file:
            print("No data files found (GetProcessed.csv or GetComments.csv)")
            return None, None
        
        print(f"Reading file: {latest_file}")
        df = pd.read_csv(latest_file, encoding="utf-8")
        
        # Handle missing finalText column - use different column names as fallback
        text_columns = ["finalText", "processed_text", "cleaned_text", "comment"]
        text_column = None
        
        for col in text_columns:
            if col in df.columns:
                text_column = col
                break
        
        if text_column is None:
            print(f"Warning: No text column found in {latest_file}")
            print(f"Available columns: {list(df.columns)}")
            return None, None
        
        # If not using finalText, rename the column for consistency
        if text_column != "finalText":
            df["finalText"] = df[text_column]
        
        # Ensure ID column exists
        if "id" not in df.columns:
            df.insert(0, "id", range(1, len(df) + 1))
        
        # Fill missing values
        df["comment"] = df["comment"].fillna("") if "comment" in df.columns else ""
        df["finalText"] = df["finalText"].fillna("")

        print(f"Successfully loaded {len(df)} rows from {os.path.basename(latest_file)}")
        return latest_file, df
        
    except Exception as e:
        print(f"Error reading file: {e}")
        return None, None