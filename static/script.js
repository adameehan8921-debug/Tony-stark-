const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "en-US";

// 🌍 Country coordinates (basic demo)
const countryCoords = {
  "usa": [37, -95],
  "india": [20.5, 78.9],
  "uk": [55, -3],
  "china": [35, 103],
  "russia": [60, 90]
};

// 🎤 Start voice
function startListening() {
  recognition.start();
}

// 🧠 Voice result
recognition.onresult = async function(event) {
  let text = event.results[0][0].transcript;
  document.getElementById("user").innerText = text;

  if (text.toLowerCase().includes("news")) {
    speak("Yes sir, I am checking global updates");
    loadNews();
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

// 🔊 Speak function (promise for sync)
function speak(text) {
  return new Promise(resolve => {
    let s = new SpeechSynthesisUtterance("Yes sir, " + text);
    s.rate = 0.95;
    s.pitch = 1;
    s.onend = resolve;
    speechSynthesis.speak(s);
  });
}

// 📰 Load news + animate
async function loadNews() {
  let res = await fetch("/news");
  let data = await res.json();

  let newsDiv = document.getElementById("news");
  newsDiv.innerHTML = "";

  for (let i = 0; i < data.length; i++) {
    let n = data[i];

    // 🖼️ Show image
    newsDiv.innerHTML = `
      <div style="box-shadow:0 0 15px #00f0ff;">
        <img src="${n.image}">
        <p>${n.title}</p>
      </div>
    `;

    // 🎥 Play video
    playVideo(n.title);

    // 🌍 Detect country (simple keyword match)
    let country = detectCountry(n.title);
    if (country && countryCoords[country]) {
      let [lat, lon] = countryCoords[country];
      showLocation(lat, lon);
    }

    // 🔊 Speak news (wait until finished)
    await speak("Latest update. " + n.title);

    // ⏳ Small delay between news
    await delay(1500);
  }

  speak("That's all for now.");
}

// 🌍 Detect country from title
function detectCountry(text) {
  text = text.toLowerCase();

  if (text.includes("india")) return "india";
  if (text.includes("america") || text.includes("us")) return "usa";
  if (text.includes("uk") || text.includes("britain")) return "uk";
  if (text.includes("china")) return "china";
  if (text.includes("russia")) return "russia";

  return null;
}

// ⏳ Delay helper
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 🎥 Play video
function playVideo(query) {
  document.getElementById("video").src =
    "https://www.youtube.com/embed?autoplay=1&mute=1&listType=search&list=" + query;
}

// 🌍 Map
var map = L.map('map').setView([20, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let marker;

// 📍 Show location
function showLocation(lat, lon) {
  if (marker) {
    map.removeLayer(marker);
  }

  marker = L.marker([lat, lon]).addTo(map);
  map.setView([lat, lon], 4);
}
