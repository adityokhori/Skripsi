# PreProcessing.py
import pandas as pd
import re, string
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from Sastrawi.StopWordRemover.StopWordRemoverFactory import StopWordRemoverFactory
from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
from langdetect import detect, DetectorFactory
from deep_translator import GoogleTranslator
import time

# Set seed untuk konsistensi deteksi bahasa
DetectorFactory.seed = 0

# Inisialisasi library
stop_factory = StopWordRemoverFactory()
stop_remover = stop_factory.create_stop_word_remover()

stem_factory = StemmerFactory()
stemmer = stem_factory.create_stemmer()

translator = GoogleTranslator(source="en", target="id")

# progress state global
progress_state = {"current": 0, "total": 0, "status": "idle"}

# Cache untuk hasil translasi & deteksi
translation_cache = {}
lang_detection_cache = {}


def clean_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"http\S+|www.\S+", "", text)
    text = re.sub(r"@\w+", "", text)
    text = text.translate(str.maketrans("", "", string.punctuation))
    text = re.sub(r"\d+", "", text)

    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"
        "\U0001F300-\U0001F5FF"
        "\U0001F680-\U0001F6FF"
        "\U0001F700-\U0001F77F"
        "\U0001F780-\U0001F7FF"
        "\U0001F800-\U0001F8FF"
        "\U0001F900-\U0001F9FF"
        "\U0001FA00-\U0001FA6F"
        "\U0001FA70-\U0001FAFF"
        "\U00002702-\U000027B0"
        "\U000024C2-\U0001F251"
        "]+",
        flags=re.UNICODE
    )
    text = emoji_pattern.sub(r"", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def detect_language_fast(text: str) -> str:
    """Deteksi bahasa dengan caching dan validasi cepat"""
    if not text or len(text.strip()) < 3:
        return "id"
    
    cache_key = text[:100]
    if cache_key in lang_detection_cache:
        return lang_detection_cache[cache_key]
    
    try:
        lang = detect(text)
        lang_detection_cache[cache_key] = lang
        return lang
    except Exception as e:
        lang_detection_cache[cache_key] = "id"
        return "id"


def translate_text_cached(text: str, source_lang: str) -> str:
    """Translasi dengan caching"""
    if source_lang != "en":
        return text
    
    cache_key = text[:100]
    
    if cache_key in translation_cache:
        return translation_cache[cache_key]
    
    try:
        result = translator.translate(text)
        translation_cache[cache_key] = result
        return result
    except Exception as e:
        print(f"[WARN] Translasi gagal: {text[:30]}... | {e}")
        translation_cache[cache_key] = text
        return text


def detect_and_translate(text: str) -> str:
    lang = detect_language_fast(text)
    return translate_text_cached(text, lang)


def remove_stopwords(text: str) -> str:
    return stop_remover.remove(text)


def stemming(text: str) -> str:
    return stemmer.stem(text)


def tokenize(text: str):
    return text.split()


def process_single_comment(row, index):
    """Proses satu komentar - untuk parallel processing"""
    try:
        comment = str(row.get("comment", "")).strip()
        
        if not comment or len(comment) == 0:
            return {
                "id": row.get("id", index + 1),
                "comment": comment,
                "cleanText": "",
                "translated": "",
                "noStopword": "",
                "stemmed": "",
                "tokens": [],
                "wordCount": 0,
                "finalText": ""
            }
        
        clean = clean_text(comment)
        
        if not clean or len(clean) == 0:
            return {
                "id": row.get("id", index + 1),
                "comment": comment,
                "cleanText": clean,
                "translated": "",
                "noStopword": "",
                "stemmed": "",
                "tokens": [],
                "wordCount": 0,
                "finalText": ""
            }
        
        translated = detect_and_translate(clean)
        no_stop = remove_stopwords(translated)
        stemmed = stemming(no_stop)
        tokens = tokenize(stemmed)
        word_count = len(tokens)

        return {
            "id": row.get("id", index + 1),
            "comment": comment,
            "cleanText": clean,
            "translated": translated,
            "noStopword": no_stop,
            "stemmed": stemmed,
            "tokens": tokens,
            "wordCount": word_count,
            "finalText": stemmed
        }
    except Exception as e:
        print(f"[ERROR] Gagal memproses baris {index}: {e}")
        return None


def preprocess_comments_large(input_path="GetComments.csv", 
                              num_workers=8, 
                              batch_size=100,
                              skip_translation=False):
    """
    Preprocessing untuk dataset besar dengan optimasi maksimal
    
    Args:
        input_path: Path ke file CSV
        num_workers: Jumlah worker threads (default 8, bisa sampai 16)
        batch_size: Ukuran batch untuk progress update
        skip_translation: Skip translasi (gunakan jika semua data sudah Bahasa Indonesia)
    """
    global progress_state

    print(f"[INFO] Memulai preprocessing dari {input_path}")
    start_time = time.time()

    df = pd.read_csv(input_path)
    df["comment"] = df["comment"].fillna("")

    total = len(df)
    progress_state = {"current": 0, "total": total, "status": "processing"}

    print(f"[INFO] Total komentar: {total}")
    print(f"[INFO] Workers: {num_workers}")
    print(f"[INFO] Skip Translation: {skip_translation}")

    results = []

    # Parallel processing dengan ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=num_workers) as executor:
        futures = []
        
        # Submit semua task sekaligus
        for i, (idx, row) in enumerate(df.iterrows()):
            future = executor.submit(process_single_comment, row, idx)
            futures.append((future, i))

        # Process hasil saat selesai
        completed = 0
        for future, idx in futures:
            try:
                result = future.result(timeout=30)
                if result:
                    results.append(result)
                completed += 1
            except Exception as e:
                print(f"[ERROR] Task gagal: {e}")
                completed += 1

            progress_state["current"] = completed
            
            # Update progress setiap batch_size
            if completed % batch_size == 0 or completed == total:
                elapsed = time.time() - start_time
                rate = completed / elapsed if elapsed > 0 else 0
                eta = (total - completed) / rate if rate > 0 else 0
                print(f"Progress: {completed}/{total} | "
                      f"Speed: {rate:.1f} items/sec | "
                      f"ETA: {int(eta)}s")

    # Urutkan hasil berdasarkan ID asli
    results.sort(key=lambda x: x["id"])
    
    # Simpan hasil ke dataframe
    df_out = pd.DataFrame(results)

    # Simpan ke CSV
    output_path = "GetProcessed.csv"
    df_out.to_csv(output_path, index=False, encoding="utf-8")

    elapsed = time.time() - start_time
    progress_state["status"] = "done"
    
    print(f"\n" + "="*60)
    print(f"✓ Preprocessing SELESAI!")
    print(f"="*60)
    print(f"Total comments: {total}")
    print(f"Time elapsed: {elapsed:.2f} seconds ({elapsed/60:.2f} minutes)")
    print(f"Speed: {total/elapsed:.1f} items/second")
    print(f"Translation cache size: {len(translation_cache)}")
    print(f"Language detection cache size: {len(lang_detection_cache)}")
    print(f"Output saved: {output_path}")
    print(f"="*60)

    return {
        "file": output_path,
        "data": results,
        "time_elapsed": elapsed
    }


def get_progress():
    """Fungsi untuk dicek frontend"""
    return progress_state