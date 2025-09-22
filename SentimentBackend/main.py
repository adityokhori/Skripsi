# main.py
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from get_comments import get_youtube_comments
from PreProcessing import preprocess_comments, get_progress
from typing import List
import pandas as pd
from label_utils import label_text, get_latest_preprocessed
import os

app = FastAPI()

# CORS supaya bisa diakses dari React (localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RequestData(BaseModel):
    video_url: str
    max_comments: int

@app.post("/get-comments")
def fetch_comments(data: RequestData):
    try:
        comments = get_youtube_comments(data.video_url, data.max_comments)
        return {"comments": comments}
    except Exception as e:
        return {"error": str(e)}

@app.post("/preprocess")
def run_preprocessing():
    return preprocess_comments()

@app.get("/progress")
def progress():
    return get_progress()

# Fixed: Changed from @app.get to @app.post to match the frontend call
@app.post("/auto-label")
def auto_label():
    try:
        print("Starting auto labelling process...")
        latest_file, df = get_latest_preprocessed("./")
        
        if latest_file is None or df is None:
            return {"error": "Tidak ada file data ditemukan. Pastikan sudah melakukan preprocessing atau ada file GetComments.csv"}

        print(f"Found file: {latest_file} with {len(df)} rows")
        print(f"Columns: {list(df.columns)}")

        if "finalText" not in df.columns:
            return {"error": f"Kolom finalText tidak ditemukan. Kolom tersedia: {list(df.columns)}"}

        if len(df) == 0:
            return {"error": "File data kosong"}

        labelled = []
        for _, row in df.iterrows():
            text_to_label = row["finalText"] if pd.notna(row["finalText"]) else row.get("comment", "")
            if not text_to_label:
                continue
                
            sentiment, confidence = label_text(text_to_label)
            labelled.append({
                "id": row["id"],
                "comment": row.get("comment", ""),
                "finalText": row["finalText"],
                "sentiment": sentiment,
                "confidence": confidence,
                "labelMethod": "Auto"
            })

        if len(labelled) == 0:
            return {"error": "Tidak ada data valid untuk dilabeli"}

        print(f"Successfully labelled {len(labelled)} comments")
        return {"filename": os.path.basename(latest_file), "data": labelled}
        
    except Exception as e:
        print(f"Auto label error: {str(e)}")
        return {"error": f"Terjadi kesalahan: {str(e)}"}