# PreProcessing.py
import pandas as pd
import re, string
from datetime import datetime
from Sastrawi.StopWordRemover.StopWordRemoverFactory import StopWordRemoverFactory
from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
from langdetect import detect
from deep_translator import GoogleTranslator

# Inisialisasi library
stop_factory = StopWordRemoverFactory()
stop_remover = stop_factory.create_stop_word_remover()

stem_factory = StemmerFactory()
stemmer = stem_factory.create_stemmer()

translator = GoogleTranslator(source="en", target="id")

# progress state global
progress_state = {"current": 0, "total": 0, "status": "idle"}

def clean_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"http\S+|www.\S+", "", text)   # hapus URL
    text = re.sub(r"@\w+", "", text)              # hapus mention
    text = text.translate(str.maketrans("", "", string.punctuation))  # hapus tanda baca
    text = re.sub(r"\d+", "", text)               # hapus angka

    # hapus emoji / sticker / simbol aneh
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emotikon
        "\U0001F300-\U0001F5FF"  # simbol & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map symbols
        "\U0001F700-\U0001F77F"  # alchemical symbols
        "\U0001F780-\U0001F7FF"  # geometri
        "\U0001F800-\U0001F8FF"
        "\U0001F900-\U0001F9FF"  # tambahan simbol & pictographs
        "\U0001FA00-\U0001FA6F"
        "\U0001FA70-\U0001FAFF"
        "\U00002702-\U000027B0"  # dingbats
        "\U000024C2-\U0001F251"
        "]+",
        flags=re.UNICODE
    )
    text = emoji_pattern.sub(r"", text)

    text = re.sub(r"\s+", " ", text).strip()      # hapus spasi ganda
    return text


def detect_and_translate(text: str) -> str:
    try:
        lang = detect(text)
        if lang == "en":  # jika bahasa Inggris, translate ke Indonesia
            return translator.translate(text)
        elif lang == "id":  # jika bahasa Indonesia, biarkan
            return text
        else:
            # selain Inggris & Indonesia -> abaikan, langsung return clean text
            return text
    except Exception as e:
        print(f"[WARN] Translasi gagal: {text[:30]}... | {e}")
    return text


def remove_stopwords(text: str) -> str:
    return stop_remover.remove(text)

def stemming(text: str) -> str:
    return stemmer.stem(text)

def tokenize(text: str):
    return text.split()

def preprocess_comments(input_path="GetComments.csv"):
    global progress_state

    df = pd.read_csv(input_path)
    df["comment"] = df["comment"].fillna("")

    total = len(df)
    progress_state = {"current": 0, "total": total, "status": "processing"}

    results = []
    for i, row in df.iterrows():
        comment = str(row["comment"])
        clean = clean_text(comment)
        translated = detect_and_translate(clean)
        no_stop = remove_stopwords(translated)
        stemmed = stemming(no_stop)
        tokens = tokenize(stemmed)
        word_count = len(tokens)

        # final text setelah stopword removal + stemming
        final_text = stemmed

        results.append({
            "id": row.get("id", i + 1),  # preserve original ID or create new one
            "comment": comment,
            "cleanText": clean,
            "translated": translated,
            "noStopword": no_stop,
            "stemmed": stemmed,
            "tokens": tokens,
            "wordCount": word_count,
            "finalText": final_text
        })

        progress_state["current"] = i + 1

    # simpan hasil ke dataframe
    df_out = pd.DataFrame(results)

    # simpan ke CSV dengan nama tetap
    output_path = "GetProcessed.csv"
    df_out.to_csv(output_path, index=False, encoding="utf-8")

    progress_state["status"] = "done"

    return {
        "file": output_path,
        "data": results
    }


def get_progress():
    """Fungsi untuk dicek frontend"""
    return progress_state