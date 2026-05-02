from flask import Flask, render_template, request, jsonify
from groq import Groq
import requests
import os

app = Flask(__name__)

groq = Groq(api_key=os.getenv("GROQ_API_KEY"))
NEWS_API_KEY = os.getenv("NEWS_API_KEY")

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    msg = request.json.get("message")

    response = groq.chat.completions.create(
        model="llama3-70b-8192",
        messages=[
            {"role": "system", "content": "You are Aira, a smart AI like Jarvis. Speak short, confident, futuristic."},
            {"role": "user", "content": msg}
        ]
    )

    return jsonify({"reply": response.choices[0].message.content})

@app.route("/news")
def news():
    url = f"https://newsapi.org/v2/top-headlines?country=us&apiKey={NEWS_API_KEY}"
    res = requests.get(url).json()

    articles = []
    for a in res["articles"][:5]:
        articles.append({
            "title": a["title"],
            "image": a["urlToImage"],
            "url": a["url"]
        })

    return jsonify(articles)

if __name__ == "__main__":
    app.run()
