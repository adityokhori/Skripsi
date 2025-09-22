# main.py
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from get_comments import get_youtube_comments
from PreProcessing import preprocess_comments, get_progress

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
    

# @app.post("/preprocess")
# def run_preprocessing():
#     try:
#         result = preprocess_comments()
#         return {
#             "file": result["file"],
#             "processed": result["data"]
#         }
#     except Exception as e:
#         return {"error": str(e)}

@app.post("/preprocess")
def run_preprocessing():
    return preprocess_comments()

@app.get("/progress")
def progress():
    return get_progress()
