from flask import Flask, render_template, request, jsonify
from groq import Groq
import requests
import os

app = Flask(__name__)

# 🔑 API KEYS
groq = Groq(api_key=os.getenv("GROQ_API_KEY"))
NEWS_API_KEY = os.getenv("NEWS_API_KEY")

# 🌐 HOME
@app.route("/")
def home():
    return render_template("index.html")

# 🧠 AI CHAT (Aira)
@app.route("/chat", methods=["POST"])
def chat():
    msg = request.json.get("message")

    response = groq.chat.completions.create(
        model="llama-3.1-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "You are Aira, an advanced AI like Jarvis. Speak short, confident, futuristic. Always address the user as 'Sir'."
            },
            {"role": "user", "content": msg}
        ]
    )

    reply = response.choices[0].message.content
    return jsonify({"reply": reply})

# 📰 NEWS (MULTI COUNTRY)
@app.route("/news")
def news():
    countries = ["us", "in", "gb"]  # USA, India, UK
    articles = []

    for c in countries:
        url = f"https://newsapi.org/v2/top-headlines?country={c}&apiKey={NEWS_API_KEY}"
        res = requests.get(url).json()

        if res.get("status") != "ok":
            continue

        for a in res.get("articles", [])[:2]:
            articles.append({
                "title": a.get("title", "No title"),
                "image": a.get("urlToImage") or "https://via.placeholder.com/300x200?text=No+Image",
                "url": a.get("url"),
                "country": c  # 🌍 IMPORTANT for map sync
            })

    return jsonify(articles)

# 🚀 RUN
if __name__ == "__main__":
    app.run(debug=True)
