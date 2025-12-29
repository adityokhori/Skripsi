# get_comments.py
from googleapiclient.discovery import build
import pandas as pd
import os
from datetime import datetime

API_KEY = "AIzaSyBhpFQ8V1GI3VSq7UQ7pvW3oS6gsKh777s"

def get_youtube_comments_raw(video_url: str, max_comments: int = 10000):
    """
    Fetch YouTube comments (tidak langsung save ke file)
    Return: list of comments
    """
    try:
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
                    "video_id": video_id,  # ✅ Tambahkan video_id untuk tracking
                    "video_url": video_url,  # ✅ Tambahkan video_url
                    "id": len(comments) + 1,
                    "comment": top["textDisplay"],
                    "author": top["authorDisplayName"],
                    "likes": top["likeCount"],
                    "timestamp": top["publishedAt"],
                    "is_reply": False,
                    "parent_id": None
                })
                
                total_replies = item["snippet"]["totalReplyCount"]
                
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
                                "video_id": video_id,
                                "video_url": video_url,
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
        
        print(f"✅ Fetched {len(comments)} comments from {video_url}")
        return comments
        
    except Exception as e:
        print(f"❌ Error fetching from {video_url}: {str(e)}")
        raise Exception(f"Failed to fetch YouTube comments: {str(e)}")


def get_youtube_comments(video_url: str, max_results: int = 100):
    """
    Single URL wrapper - untuk backward compatibility
    """
    try:
        print(f"📥 Fetching comments from: {video_url}")
        print(f"📊 Max results: {max_results}")
        
        # Generate unique filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"GetComments_{timestamp}.csv"
        
        # Fetch comments
        comments = get_youtube_comments_raw(video_url, max_results)
        
        # Save to CSV
        df = pd.DataFrame(comments)
        df.to_csv(unique_filename, index=False, encoding="utf-8")
        
        preview_size = min(50, len(comments))
        print(f"✅ Success! Total: {len(comments)}, Preview: {preview_size}")
        
        return {
            "success": True,
            "count": len(comments),
            "file": unique_filename,
            "comments": comments[:preview_size],
            "message": f"Successfully fetched {len(comments)} comments"
        }
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Exception: {error_msg}")
        return {
            "success": False,
            "count": 0,
            "message": f"Error: {error_msg}"
        }


def get_youtube_comments_batch(video_urls: list, max_results_per_video: int = 100):
    """
    ✅ NEW FUNCTION: Batch crawling multiple URLs → 1 file
    """
    try:
        print(f"📥 Batch fetching from {len(video_urls)} videos")
        
        all_comments = []
        successful_urls = []
        failed_urls = []
        
        # Crawl semua URL
        for idx, video_url in enumerate(video_urls, 1):
            try:
                print(f"📹 [{idx}/{len(video_urls)}] Crawling: {video_url}")
                comments = get_youtube_comments_raw(video_url, max_results_per_video)
                all_comments.extend(comments)
                successful_urls.append(video_url)
                print(f"✅ Got {len(comments)} comments from video {idx}")
            except Exception as e:
                print(f"❌ Failed to crawl {video_url}: {str(e)}")
                failed_urls.append({"url": video_url, "error": str(e)})
        
        if len(all_comments) == 0:
            return {
                "success": False,
                "count": 0,
                "message": "No comments fetched from any video",
                "failed_urls": failed_urls
            }
        
        # Generate unique filename dengan timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"GetComments_{timestamp}.csv"
        
        # Save semua comments ke 1 file
        df = pd.DataFrame(all_comments)
        df.to_csv(unique_filename, index=False, encoding="utf-8")
        
        preview_size = min(50, len(all_comments))
        
        print(f"✅ Batch complete! Total: {len(all_comments)} comments from {len(successful_urls)} videos")
        print(f"📁 Saved to: {unique_filename}")
        
        return {
            "success": True,
            "count": len(all_comments),
            "file": unique_filename,
            "comments": all_comments[:preview_size],
            "successful_videos": len(successful_urls),
            "failed_videos": len(failed_urls),
            "video_urls": successful_urls,
            "failed_urls": failed_urls,
            "message": f"Successfully fetched {len(all_comments)} comments from {len(successful_urls)}/{len(video_urls)} videos"
        }
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Batch error: {error_msg}")
        return {
            "success": False,
            "count": 0,
            "message": f"Batch error: {error_msg}"
        }
