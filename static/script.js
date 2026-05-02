const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "en-US";

// 🎤 Start voice
function startListening() {
  recognition.start();
}

// 🧠 Voice result
recognition.onresult = async function(event) {
  let text = event.results[0][0].transcript;
  document.getElementById("user").innerText = text;

  if(text.toLowerCase().includes("news")) {
    loadNews();
    speak("Showing latest global news");
    return;
  }

  let res = await fetch("/chat", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({message: text})
  });

  let data = await res.json();
  document.getElementById("bot").innerText = data.reply;

  speak(data.reply);
};

// 🔊 Speak
function speak(text) {
  let s = new SpeechSynthesisUtterance("Yes sir, " + text);
  speechSynthesis.speak(s);
}

// 📰 Load news
async function loadNews() {
  let res = await fetch("/news");
  let data = await res.json();

  let newsDiv = document.getElementById("news");
  newsDiv.innerHTML = "";

  data.forEach(n => {
    newsDiv.innerHTML += `
      <div>
        <img src="${n.image}">
        <p>${n.title}</p>
      </div>
    `;
  });

  playVideo(data[0].title);
}

// 🎥 Play video
function playVideo(query) {
  document.getElementById("video").src =
    "https://www.youtube.com/embed?listType=search&list=" + query;
}

// 🌍 Map
var map = L.map('map').setView([20, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

function showLocation(lat, lon) {
  L.marker([lat, lon]).addTo(map);
  map.setView([lat, lon], 4);
}
