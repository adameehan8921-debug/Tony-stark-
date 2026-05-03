from flask import Flask, render_template, request, jsonify
from groq import Groq
import requests
import os
import time

app = Flask(__name__)

# 🔑 API KEYS (Make sure these are set in your environment)
# Groq API Key check
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("⚠️ WARNING: GROQ_API_KEY NOT FOUND!")

groq = Groq(api_key=GROQ_API_KEY)
NEWS_API_KEY = os.getenv("NEWS_API_KEY")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

# 🧠 CACHE (avoid API overuse)
news_cache = {
    "data": [],
    "time": 0
}

CACHE_DURATION = 600  # Increased to 10 minutes to save API limits

# 🌐 HOME
@app.route("/")
def home():
    return render_template("index.html")

# 🧠 AI CHAT (Aira)
@app.route("/chat", methods=["POST"])
def chat():
    try:
        msg = request.json.get("message")
        if not msg:
            return jsonify({"reply": "I am waiting for your command, Sir."})

        # Aira Response Logic
        response = groq.chat.completions.create(
            model="llama-3.3-70b-versatile", # Updated model for better performance
            messages=[
                {
                    "role": "system",
                    "content": "You are Aira, a high-end AI assistant like Jarvis. Your personality is professional, concise, and loyal. Always address the user as Sir. Use technical but understandable language."
                },
                {"role": "user", "content": msg}
            ]
        )

        reply = response.choices[0].message.content
        return jsonify({"reply": reply})
    except Exception as e:
        print(f"Chat Error: {e}")
        return jsonify({"reply": "Apologies Sir, my communication sub-systems are experiencing interference."})

# 📰 NEWS (SMART + CACHE)
@app.route("/news")
def news():
    global news_cache

    if time.time() - news_cache["time"] < CACHE_DURATION and news_cache["data"]:
        return jsonify(news_cache["data"])

    # List of news categories or countries for global feel
    countries = ["us", "in"] 
    articles = []
    seen_titles = set()

    try:
        for c in countries:
            url = f"https://newsapi.org/v2/top-headlines?country={c}&pageSize=8&apiKey={NEWS_API_KEY}"
            res = requests.get(url, timeout=5).json()

            if res.get("status") != "ok":
                continue

            for a in res.get("articles", []):
                title = a.get("title")
                if not title or title in seen_titles:
                    continue

                seen_titles.add(title)
                articles.append({
                    "title": title,
                    "image": a.get("urlToImage") or "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=500", # Better fallback image
                    "country": c
                })
        
        news_cache["data"] = articles
        news_cache["time"] = time.time()
        return jsonify(articles)

    except Exception as e:
        print(f"News API Error: {e}")
        return jsonify([])

# 🎥 YOUTUBE API (OPTIMIZED)
@app.route("/youtube")
def youtube():
    query = request.args.get("q")
    if not query or not YOUTUBE_API_KEY:
        return jsonify({"videoId": None})

    try:
        # Adding 'news' or 'update' to query for better relevance
        search_query = f"{query} news update"
        url = (
            "https://www.googleapis.com/youtube/v3/search"
            f"?part=snippet&q={search_query}&key={YOUTUBE_API_KEY}&maxResults=1&type=video"
        )
        res = requests.get(url, timeout=5).json()
        items = res.get("items")
        
        if items:
            video_id = items[0]["id"]["videoId"]
            return jsonify({"videoId": video_id})
    except Exception as e:
        print(f"YouTube Error: {e}")

    return jsonify({"videoId": None})

# 🚀 RUN
if __name__ == "__main__":
    # Host 0.0.0.0 useful if you test on local network
    app.run(host='0.0.0.0', port=5000, debug=True)
