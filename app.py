from flask import Flask, render_template, request, jsonify
from groq import Groq
import requests
import os
import time

app = Flask(__name__)

# 🔑 API KEYS
groq = Groq(api_key=os.getenv("GROQ_API_KEY"))
NEWS_API_KEY = os.getenv("NEWS_API_KEY")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")  # 🔥 ADD THIS

# 🧠 CACHE (avoid API overuse)
news_cache = {
    "data": [],
    "time": 0
}

CACHE_DURATION = 300  # 5 minutes

# 🌐 HOME
@app.route("/")
def home():
    return render_template("index.html")

# 🧠 AI CHAT (Aira)
@app.route("/chat", methods=["POST"])
def chat():
    msg = request.json.get("message")

    response = groq.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "system",
                "content": "You are Aira, an advanced AI like Jarvis. Speak short, confident, futuristic. Always call the user Sir."
            },
            {"role": "user", "content": msg}
        ]
    )

    reply = response.choices[0].message.content
    return jsonify({"reply": reply})

# 📰 NEWS (SMART + CACHE + NO DUPLICATE)
@app.route("/news")
def news():
    global news_cache

    # 🧠 CACHE CHECK
    if time.time() - news_cache["time"] < CACHE_DURATION:
        return jsonify(news_cache["data"])

    countries = ["us", "in", "gb"]
    articles = []
    seen_titles = set()

    for c in countries:
        url = f"https://newsapi.org/v2/top-headlines?country={c}&pageSize=10&apiKey={NEWS_API_KEY}"
        res = requests.get(url).json()

        if res.get("status") != "ok":
            continue

        for a in res.get("articles", []):
            title = a.get("title")

            if not title or title in seen_titles:
                continue

            seen_titles.add(title)

            articles.append({
                "title": title,
                "image": a.get("urlToImage") or "https://via.placeholder.com/300x200?text=No+Image",
                "url": a.get("url"),
                "country": c
            })

            if len(articles) >= 10:
                break

        if len(articles) >= 10:
            break

    # 🧠 SAVE CACHE
    news_cache["data"] = articles
    news_cache["time"] = time.time()

    return jsonify(articles)

# 🎥 YOUTUBE API ROUTE (🔥 IMPORTANT)
@app.route("/youtube")
def youtube():
    query = request.args.get("q")

    if not query:
        return jsonify({"videoId": None})

    try:
        url = (
            "https://www.googleapis.com/youtube/v3/search"
            f"?part=snippet&q={query}&key={YOUTUBE_API_KEY}&maxResults=1&type=video"
        )

        res = requests.get(url).json()

        items = res.get("items")

        if items:
            video_id = items[0]["id"]["videoId"]
            return jsonify({"videoId": video_id})

    except Exception as e:
        print("YouTube API Error:", e)

    return jsonify({"videoId": None})

# 🚀 RUN
if __name__ == "__main__":
    app.run(debug=True)
