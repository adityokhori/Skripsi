import os
import re
import string
import json
import time
import pandas as pd
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from Sastrawi.StopWordRemover.StopWordRemoverFactory import StopWordRemoverFactory
from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
from langdetect import detect, DetectorFactory
from deep_translator import GoogleTranslator

# ========================================
# KONFIGURASI
# ========================================
DetectorFactory.seed = 0

# Paths
ANTONYM_JSON_PATH = "dict.json"
POSITIVE_CSV = "Positive.csv"
NEGATIVE_CSV = "Negative.csv"
TYPO_JSON_PATH = "typo_dict.json"

# Negation words
NEGATION_WORDS = {"tidak", "bukan", "gak", "nggak", "kurang", "tak", "ga", "tdk"}

# ========================================
# INISIALISASI LIBRARY
# ========================================
stop_factory = StopWordRemoverFactory()
stop_remover = stop_factory.create_stop_word_remover()

stem_factory = StemmerFactory()
stemmer = stem_factory.create_stemmer()

translator = GoogleTranslator(source="en", target="id")

# Progress state
progress_state = {"current": 0, "total": 0, "status": "idle"}

# Caches
translation_cache = {}
lang_detection_cache = {}

# ========================================
# LOAD WORD LISTS
# ========================================
def load_word_list(path):
    """Load positive/negative word list from CSV"""
    if not os.path.exists(path):
        print(f"[WARN] Word list not found: {path}")
        return set()
    try:
        df = pd.read_csv(path, header=None, encoding="utf-8", on_bad_lines="skip")
    except Exception:
        df = pd.read_csv(path, header=None, encoding="latin1", on_bad_lines="skip")
    words = set(df.iloc[:, 0].astype(str).str.lower().str.strip().tolist())
    print(f"[INFO] Loaded {len(words)} words from {path}")
    return words

positive_words = load_word_list(POSITIVE_CSV)
negative_words = load_word_list(NEGATIVE_CSV)

# ========================================
# LOAD ANTONYM DICTIONARY
# ========================================
def load_antonym_dict(json_path=ANTONYM_JSON_PATH):
    """Load antonym dictionary from JSON
    Expected format: {"word": {"antonim": ["antonym1", "antonym2"]}}
    Returns: dict mapping word -> primary antonym
    """
    if not os.path.exists(json_path):
        print(f"[WARN] Antonym JSON not found at {json_path}")
        return {}
    
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        mapping = {}
        for key, meta in data.items():
            antonyms = meta.get("antonim") if isinstance(meta, dict) else None
            if antonyms and isinstance(antonyms, list) and len(antonyms) > 0:
                primary = str(antonyms[0]).strip().lower()
                if primary:
                    mapping[str(key).strip().lower()] = primary
        
        print(f"[INFO] Loaded {len(mapping)} antonym mappings from {json_path}")
        return mapping
    except Exception as e:
        print(f"[ERROR] Failed to load antonym dict: {e}")
        return {}

ANTONYM_MAP = load_antonym_dict()

# ========================================
# LOAD TYPO DICTIONARY
# ========================================
def create_default_typo_dict():
    """Create comprehensive default typo dictionary"""
    return {
        # Kata umum - negasi
        "gk": "tidak", "gx": "tidak", "g": "tidak", "ga": "tidak",
        "gag": "tidak", "gak": "tidak", "tdk": "tidak", "tdak": "tidak",
        "nggak": "tidak", "ngga": "tidak", "enggk": "tidak", "engga": "tidak",
        
        # Kata umum - waktu
        "blm": "belum", "blom": "belum", "blum": "belum", "belom": "belum",
        "udh": "sudah", "udah": "sudah", "dah": "sudah", "sdh": "sudah",
        "skrg": "sekarang", "skrang": "sekarang", "skrng": "sekarang",
        
        # Kata umum - penghubung
        "emg": "memang", "emang": "memang", "emng": "memang", "mmg": "memang",
        "bgt": "banget", "bget": "banget", "bngt": "banget", "bngat": "banget",
        "jg": "juga", "jga": "juga", "jugak": "juga",
        "dgn": "dengan", "dg": "dengan", "dgan": "dengan",
        "sm": "sama", "sma": "sama",
        "tp": "tetapi", "tpi": "tetapi", "tapi": "tetapi",
        "klo": "kalau", "kalo": "kalau", "klu": "kalau", "kl": "kalau",
        "krn": "karena", "krna": "karena", "karna": "karena",
        "sgt": "sangat", "sngt": "sangat",
        "bnyk": "banyak", "bnyak": "banyak", "byk": "banyak",
        "aj": "saja", "aja": "saja", "aje": "saja", "ajah": "saja",
        "jd": "jadi", "jdi": "jadi",
        
        # Kata tanya
        "gmn": "bagaimana", "gmna": "bagaimana", "bgmn": "bagaimana", "gimana": "bagaimana",
        "knp": "kenapa", "knpa": "kenapa", "knapa": "kenapa",
        "ap": "apa", "apa": "apa", "apaa": "apa",
        "dmn": "dimana", "dmana": "dimana", "dimna": "dimana",
        "kmn": "kemana", "kmana": "kemana",
        "brp": "berapa", "brapa": "berapa",
        "kpn": "kapan", "kpan": "kapan",
        
        # Kata ganti orang
        "sy": "saya", "gw": "saya", "gue": "saya", "gua": "saya", "w": "saya",
        "aq": "aku", "ak": "aku",
        "lu": "kamu", "lo": "kamu", "km": "kamu", "kmu": "kamu", "u": "kamu", "elu": "kamu",
        "org": "orang", "orng": "orang",
        
        # Kata umum lainnya
        "trs": "terus", "trus": "terus",
        "yg": "yang", "yng": "yang",
        "utk": "untuk", "tuk": "untuk", "untk": "untuk",
        "bwt": "buat", "buat": "buat", "bwat": "buat",
        "pd": "pada", "pda": "pada",
        "dl": "dulu", "dlu": "dulu",
        "lg": "lagi", "lgi": "lagi",
        "mksd": "maksud", "mksud": "maksud",
        "mkn": "makan", "mkan": "makan",
        "tlp": "telepon", "tlpn": "telepon", "telpon": "telepon",
        "hp": "handphone", "hape": "handphone",
        
        # Kata sifat positif
        "bgus": "bagus", "bgs": "bagus", "baguss": "bagus",
        "mantap": "mantap", "mantep": "mantap", "mntap": "mantap", "mantab": "mantap", "mantul": "mantap",
        "keren": "keren", "kerenn": "keren", "kereen": "keren",
        "enak": "enak", "enk": "enak", "enakk": "enak",
        "hebat": "hebat", "hbat": "hebat",
        "puas": "puas", "puass": "puas",
        "top": "bagus", "toppp": "bagus",
        "terbaik": "bagus", "terbaikk": "bagus",
        "best": "terbaik", "the best": "terbaik",
        
        # Kata sifat negatif
        "jelek": "jelek", "jlek": "jelek", "jlk": "jelek", "jelekk": "jelek",
        "buruk": "buruk", "bruk": "buruk",
        "kecewa": "kecewa", "kcewa": "kecewa", "kecwa": "kecewa",
        "lmbt": "lambat", "lambat": "lambat", "lemot": "lambat", "lelet": "lambat",
        "slow": "lambat",
        
        # Kata kerja
        "pke": "pakai", "pkai": "pakai",
        "bli": "beli", "beli": "beli",
        "jln": "jalan", "jalan": "jalan",
        "mnum": "minum", "minum": "minum",
        "dtg": "datang", "dtang": "datang",
        "plg": "pulang", "plang": "pulang",
        
        # Kata ucapan
        "tq": "terima kasih", "thx": "terima kasih", "thanks": "terima kasih",
        "makasih": "terima kasih", "mksh": "terima kasih", "mksi": "terima kasih",
        "trimakasih": "terima kasih", "trmksh": "terima kasih",
        "ok": "oke", "oke": "oke", "okeh": "oke", "oce": "oke",
        "siap": "siap", "sip": "siap",
        "maaf": "maaf", "maap": "maaf", "maff": "maaf", "maf": "maaf",
        "sory": "maaf", "sorry": "maaf",
        
        # Kata deskripsi
        "hrs": "harus", "hrus": "harus",
        "bs": "bisa", "bsa": "bisa",
        "brg": "barang", "brang": "barang",
        "hrg": "harga", "harga": "harga",
        "cpt": "cepat", "cpat": "cepat", "cepet": "cepat", "fast": "cepat",
        "mhl": "mahal", "mahal": "mahal",
        "mrh": "murah", "murah": "murah",
        "bru": "baru", "baru": "baru",
        "lama": "lama", "lma": "lama",
        "besar": "besar", "bsr": "besar", "gede": "besar",
        "kecil": "kecil", "kcl": "kecil",
        "sedikit": "sedikit", "sdkt": "sedikit",
        
        # Kata perbandingan
        "kyk": "seperti", "kyak": "seperti", "kaya": "seperti", "kayak": "seperti",
        "cmn": "cuma", "cman": "cuma", "cuma": "cuma",
        "hny": "hanya", "hanya": "hanya",
        "lengkap": "lengkap", "lngkap": "lengkap",
        "kurang": "kurang", "krg": "kurang",
        "cukup": "cukup", "ckp": "cukup",
        "lebih": "lebih", "lbh": "lebih",
        "sama": "sama", "sma": "sama",
        "beda": "beda", "bd": "beda", "berbeda": "beda",
        "lain": "lain", "ln": "lain",
        
        # Kata konfirmasi
        "iya": "iya", "ya": "iya", "yaa": "iya", "iyaa": "iya",
        "iyap": "iya", "yap": "iya", "yoi": "iya", "yup": "iya", "yep": "iya",
        "salah": "salah", "slh": "salah",
        "benar": "benar", "bner": "benar", "bnr": "benar", "benerr": "benar",
        "betul": "betul", "btl": "betul",
        
        # Kata emosi
        "sbr": "sabar", "sabar": "sabar",
        "jls": "jelas", "jelas": "jelas",
        "bngung": "bingung", "bingung": "bingung", "bgung": "bingung",
        "seneng": "senang", "sng": "senang", "senang": "senang",
        "sdih": "sedih", "sedih": "sedih",
        "marah": "marah", "mrh": "marah",
        "takut": "takut", "tkut": "takut", "tkt": "takut",
        "suka": "suka", "ska": "suka",
        "benci": "benci", "bnci": "benci",
        "cinta": "cinta", "cnta": "cinta",
        "sayang": "sayang", "syg": "sayang",
        "rindu": "rindu", "rndu": "rindu", "kangen": "rindu", "kngen": "rindu",
        
        # Kata karakter
        "baik": "baik", "baikk": "baik",
        "jahat": "jahat", "jht": "jahat",
        "ramah": "ramah", "rmh": "ramah",
        "jutek": "jutek", "jtk": "jutek",
        "sopan": "sopan", "spn": "sopan",
        "kasar": "kasar", "ksr": "kasar",
        
        # Kata kondisi
        "bersih": "bersih", "brsih": "bersih",
        "kotor": "kotor", "ktr": "kotor",
        "rapi": "rapi", "rpii": "rapi",
        "acak": "acak", "acakacakan": "acak",
        "wangi": "wangi", "wngi": "wangi",
        "bau": "bau", "bauu": "bau",
        
        # Kata rasa
        "hambar": "hambar", "hmbr": "hambar",
        "manis": "manis", "mns": "manis",
        "asin": "asin", "asinn": "asin",
        "asem": "asam", "asam": "asam",
        "pahit": "pahit", "phit": "pahit",
        "pedas": "pedas", "pds": "pedas", "pedes": "pedas",
        
        # Kata kemungkinan
        "mungkin": "mungkin", "mgkn": "mungkin", "mngkin": "mungkin",
        "pasti": "pasti", "pst": "pasti",
        "penting": "penting", "pntg": "penting",
        "perlu": "perlu", "prlu": "perlu",
        "boleh": "boleh", "blh": "boleh", "bole": "boleh",
        
        # Kata e-commerce
        "rekomend": "rekomendasi", "rekomen": "rekomendasi",
        "recommended": "rekomendasi", "recomended": "rekomendasi",
        "pelayanan": "pelayanan", "plyanan": "pelayanan", "service": "pelayanan",
        "kualitas": "kualitas", "quality": "kualitas",
        "pengiriman": "pengiriman", "pngiriman": "pengiriman", "kirim": "pengiriman",
        "respon": "respon", "respons": "respon", "response": "respon",
        
        # Kata lainnya
        "ampunn": "ampun",
        "ampe": "sampai", "sampe": "sampai", "smpai": "sampai", "sampai": "sampai",
        "luarbiasa": "luar biasa", "luar byasa": "luar biasa",
    }

def load_typo_dict(json_path=TYPO_JSON_PATH):
    """Load typo dictionary from JSON or create default"""
    default_typos = create_default_typo_dict()
    
    if not os.path.exists(json_path):
        print(f"[INFO] Typo dictionary not found. Creating default at {json_path}")
        try:
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(default_typos, f, ensure_ascii=False, indent=2)
            print(f"[INFO] Default typo dictionary saved ({len(default_typos)} entries)")
        except Exception as e:
            print(f"[WARN] Could not save typo dict: {e}")
        return default_typos
    
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            custom_typos = json.load(f)
        print(f"[INFO] Loaded {len(custom_typos)} typo corrections from {json_path}")
        return custom_typos
    except Exception as e:
        print(f"[ERROR] Failed to load typo dict: {e}. Using defaults.")
        return default_typos

TYPO_MAP = load_typo_dict()

# ========================================
# TEXT PROCESSING FUNCTIONS
# ========================================
def reduce_repeated_characters(text: str) -> str:
    """Remove repeated characters at word endings
    Example: 'bagusss' -> 'bagus'
    """
    return re.sub(r'([a-zA-Z])\1{1,}\b', r'\1', text)

def clean_text(text: str) -> str:
    """Clean and normalize text"""
    if text is None:
        return ""
    
    text = str(text).lower()
    
    # Remove URLs
    text = re.sub(r"http\S+|www\.\S+", "", text)
    
    # Remove mentions
    text = re.sub(r"@\w+", "", text)
    
    # Remove punctuation
    text = text.translate(str.maketrans("", "", string.punctuation))
    
    # Remove numbers
    text = re.sub(r"\d+", "", text)
    
    # Remove emojis
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
    
    # Normalize whitespace
    text = re.sub(r"\s+", " ", text).strip()
    
    # Reduce repeated characters
    text = reduce_repeated_characters(text)
    
    return text

def normalize_typo(text: str, typo_map=TYPO_MAP) -> str:
    """Normalize typo words to correct form"""
    if not text or not isinstance(text, str) or not typo_map:
        return text
    
    words = text.split()
    normalized = []
    corrections_count = 0
    
    for word in words:
        corrected = typo_map.get(word.lower())
        if corrected:
            normalized.append(corrected)
            corrections_count += 1
            if corrections_count <= 5:  # Limit logging
                print(f"[DEBUG] Typo corrected: '{word}' -> '{corrected}'")
        else:
            normalized.append(word)
    
    return " ".join(normalized)

def detect_language_fast(text: str) -> str:
    """Detect language with caching"""
    if not text or len(text.strip()) < 3:
        return "id"
    
    cache_key = text[:200]
    if cache_key in lang_detection_cache:
        return lang_detection_cache[cache_key]
    
    try:
        lang = detect(text)
        lang_detection_cache[cache_key] = lang
        print(f"[DEBUG] Detected language '{lang}' for: {text[:50]}...")
        return lang
    except Exception as e:
        print(f"[DEBUG] Language detection failed: {e}")
        lang_detection_cache[cache_key] = "id"
        return "id"

def translate_text_cached(text: str, source_lang: str) -> str:
    """Translate English text to Indonesian with caching"""
    if not text or not text.strip() or source_lang != "en":
        return text
    
    cache_key = text[:200]
    if cache_key in translation_cache:
        print(f"[DEBUG] Using cached translation")
        return translation_cache[cache_key]
    
    try:
        print(f"[DEBUG] Translating: {text[:50]}...")
        result = translator.translate(text)
        print(f"[DEBUG] Translation result: {result[:50]}...")
        translation_cache[cache_key] = result
        return result
    except Exception as e:
        print(f"[WARN] Translation failed: {e}")
        translation_cache[cache_key] = text
        return text

def detect_and_translate(text: str) -> str:
    """Detect language and translate if needed"""
    if not text or not text.strip():
        return text
    
    lang = detect_language_fast(text)
    
    if lang == "en":
        return translate_text_cached(text, lang)
    return text

def remove_stopwords(text: str) -> str:
    """Remove Indonesian stopwords"""
    try:
        return stop_remover.remove(text)
    except Exception:
        return text

def tokenize(text: str):
    """Tokenize text into words"""
    return text.split()

def stemming_tokens(tokens: list) -> list:
    """Stem tokens while preserving sentiment words"""
    stemmed = []
    for word in tokens:
        if word in positive_words or word in negative_words:
            stemmed.append(word)
        else:
            try:
                stemmed.append(stemmer.stem(word))
            except Exception:
                stemmed.append(word)
    return stemmed

def replace_negation_with_antonym(text: str, antonym_map=ANTONYM_MAP) -> str:
    """Replace negation patterns with antonyms
    Example: 'tidak bagus' -> 'buruk'
    """
    if not text or not isinstance(text, str) or not antonym_map:
        return text
    
    words = text.split()
    result = []
    i = 0
    
    while i < len(words):
        word = words[i]
        
        if word in NEGATION_WORDS and (i + 1) < len(words):
            next_word = words[i + 1]
            
            # Check direct match
            antonym = antonym_map.get(next_word)
            
            # Check stemmed version if no direct match
            if not antonym:
                try:
                    next_stem = stemmer.stem(next_word)
                    antonym = antonym_map.get(next_stem)
                except Exception:
                    pass
            
            if antonym:
                result.append(antonym)
                print(f"[DEBUG] Negation handled: '{word} {next_word}' -> '{antonym}'")
                i += 2
                continue
        
        result.append(word)
        i += 1
    
    return " ".join(result)

# ========================================
# MAIN PROCESSING FUNCTION
# ========================================
def process_single_comment(row, index, skip_translation=False):
    """Process a single comment through all preprocessing steps"""
    try:
        comment = str(row.get("comment", "")).strip()
        row_id = row.get("id", index + 1)
        
        print(f"\n{'='*60}")
        print(f"[DEBUG] Processing row {index} (ID: {row_id})")
        print(f"[DEBUG] Original: {comment[:100]}...")
        
        if not comment:
            return {
                "id": row_id,
                "comment": "",
                "cleanText": "",
                "typoNormalized": "",
                "translated": "",
                "negationHandled": "",
                "noStopword": "",
                "tokens": [],
                "stemmed": "",
                "wordCount": 0,
                "finalText": ""
            }
        
        # Step 1: Clean text
        clean = clean_text(comment)
        print(f"[STEP 1] After cleaning: {clean}")
        
        # Step 2: Normalize typo
        typo_normalized = normalize_typo(clean)
        print(f"[STEP 2] After typo normalization: {typo_normalized}")
        
        # Step 3: Translate
        if skip_translation:
            translated = typo_normalized
            print(f"[STEP 3] Translation skipped")
        else:
            translated = detect_and_translate(typo_normalized)
            print(f"[STEP 3] After translation: {translated}")
        
        # Step 4: Handle negation
        negation_handled = replace_negation_with_antonym(translated)
        print(f"[STEP 4] After negation handling: {negation_handled}")
        
        # Step 5: Remove stopwords
        no_stop = remove_stopwords(negation_handled)
        print(f"[STEP 5] After stopword removal: {no_stop}")
        
        # Step 6: Tokenize
        tokens = tokenize(no_stop)
        print(f"[STEP 6] After tokenization: {tokens}")
        
        # Step 7: Stemming
        stemmed_tokens = stemming_tokens(tokens)
        print(f"[STEP 7] After stemming: {stemmed_tokens}")
        
        # Final result
        stemmed_text = " ".join(stemmed_tokens)
        word_count = len(stemmed_tokens)
        final_text = stemmed_text
        
        print(f"[FINAL] Result: {final_text}")
        print(f"[FINAL] Word count: {word_count}")
        
        return {
            "id": row_id,
            "comment": comment,
            "cleanText": clean,
            "typoNormalized": typo_normalized,
            "translated": translated,
            "negationHandled": negation_handled,
            "noStopword": no_stop,
            "tokens": tokens,
            "stemmed": stemmed_text,
            "wordCount": word_count,
            "finalText": final_text
        }
        
    except Exception as e:
        print(f"[ERROR] Failed processing row {index}: {e}")
        import traceback
        traceback.print_exc()
        
        return {
            "id": row.get("id", index + 1),
            "comment": row.get("comment", ""),
            "cleanText": "",
            "typoNormalized": "",
            "translated": "",
            "negationHandled": "",
            "noStopword": "",
            "tokens": [],
            "stemmed": "",
            "wordCount": 0,
            "finalText": ""
        }


# PreProcessing.py - Update function preprocess_comments_large

def preprocess_comments_large(
    input_path="GetComments.csv",
    output_path=None,  # ✅ NEW: Custom output path
    num_workers=8,
    batch_size=100,
    skip_translation=False
):
    global progress_state
    print(f"[INFO] Start preprocessing from {input_path}")
    start_time = time.time()
    
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")
    
    df = pd.read_csv(input_path)
    df["comment"] = df["comment"].fillna("")
    total = len(df)
    
    progress_state = {"current": 0, "total": total, "status": "processing"}
    print(f"[INFO] Total comments: {total} | Workers: {num_workers} | SkipTranslation: {skip_translation}")
    
    results = []
    
    # parallel processing
    with ThreadPoolExecutor(max_workers=num_workers) as executor:
        futures = []
        for i, (_, row) in enumerate(df.iterrows()):
            futures.append(executor.submit(process_single_comment, row, i, skip_translation))
        
        completed = 0
        for future in futures:
            try:
                result = future.result(timeout=60)
            except Exception as e:
                print(f"[ERROR] Task failed: {e}")
                result = None
            
            if result:
                results.append(result)
            
            completed += 1
            progress_state["current"] = completed
            
            if completed % batch_size == 0 or completed == total:
                elapsed = time.time() - start_time
                rate = completed / elapsed if elapsed > 0 else 0
                eta = (total - completed) / rate if rate > 0 else 0
                print(f"Progress: {completed}/{total} | Speed: {rate:.1f} items/sec | ETA: {int(eta)}s")
    
    # sort by id
    results.sort(key=lambda x: x["id"])
    df_out = pd.DataFrame(results)
    
    # ✅ Generate output path dengan timestamp jika tidak disediakan
    if output_path is None:
        # GetComments_20251226_112400.csv → GetProcessed_20251226_112400.csv
        if "_" in input_path and input_path.startswith("GetComments_"):
            timestamp = input_path.replace("GetComments_", "").replace(".csv", "")
            output_path = f"GetProcessed_{timestamp}.csv"
        else:
            # Fallback: generate new timestamp
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_path = f"GetProcessed_{timestamp}.csv"
    
    df_out.to_csv(output_path, index=False, encoding="utf-8")
    
    elapsed = time.time() - start_time
    progress_state["status"] = "done"
    
    print("\n" + "="*60)
    print("✓ Preprocessing FINISHED")
    print(f"Total comments: {total}")
    print(f"Time elapsed: {elapsed:.2f} seconds")
    print(f"Output saved: {output_path}")
    print("="*60)
    
    return {"file": output_path, "data": results, "time_elapsed": elapsed}

def get_progress():
    return progress_state