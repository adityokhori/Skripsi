# get_comments.py
from googleapiclient.discovery import build
import pandas as pd
import os

API_KEY = "AIzaSyBhpFQ8V1GI3VSq7UQ7pvW3oS6gsKh777s"

def get_youtube_comments(video_url: str, max_comments: int = 10000, save_path="GetComments.csv"):
    youtube = build("youtube", "v3", developerKey=API_KEY)

    # Ambil ID video dari URL
    if "v=" in video_url:
        video_id = video_url.split("v=")[1].split("&")[0]
    else:
        raise ValueError("URL video tidak valid")

    comments = []
    next_page_token = None

    while len(comments) < max_comments:
        request = youtube.commentThreads().list(
            part="snippet",
            videoId=video_id,
            maxResults=min(100, max_comments - len(comments)),
            pageToken=next_page_token,
            textFormat="plainText"
        )
        response = request.execute()

        for item in response["items"]:
            top = item["snippet"]["topLevelComment"]["snippet"]
            comments.append({
                "id": len(comments) + 1,
                "comment": top["textDisplay"],
                "author": top["authorDisplayName"],
                "likes": top["likeCount"],
                "timestamp": top["publishedAt"],
                "is_reply": False,
                "parent_id": None
            })

            total_replies = item["snippet"]["totalReplyCount"]

            # kalau ada replies → ambil dengan comments().list
            if total_replies > 0:
                replies_next_page = None
                while True:
                    reply_request = youtube.comments().list(
                        part="snippet",
                        parentId=item["id"],
                        maxResults=100,
                        pageToken=replies_next_page,
                        textFormat="plainText"
                    )
                    reply_response = reply_request.execute()

                    for reply in reply_response["items"]:
                        rep = reply["snippet"]
                        comments.append({
                            "id": len(comments) + 1,
                            "comment": rep["textDisplay"],
                            "author": rep["authorDisplayName"],
                            "likes": rep["likeCount"],
                            "timestamp": rep["publishedAt"],
                            "is_reply": True,
                            "parent_id": item["id"]
                        })

                        if len(comments) >= max_comments:
                            break

                    replies_next_page = reply_response.get("nextPageToken")
                    if not replies_next_page or len(comments) >= max_comments:
                        break

            if len(comments) >= max_comments:
                break

        next_page_token = response.get("nextPageToken")
        if not next_page_token:
            break
    df = pd.DataFrame(comments)
    if os.path.exists(save_path):
        df.to_csv(save_path, mode='a', header=False, index=False, encoding="utf-8")
    else:
            df.to_csv(save_path, index=False, encoding="utf-8")
    
    return comments