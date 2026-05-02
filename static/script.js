// 🎤 VOICE SETUP
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "en-US";

// 🌍 COUNTRY COORDS (MATCH backend: us, in, gb)
const countryCoords = {
  "us": [37, -95],
  "in": [20.5, 78.9],
  "gb": [55, -3]
};

// 🎤 START
function startListening() {
  recognition.start();
}

// 🧠 VOICE RESULT
recognition.onresult = async function(event) {
  let text = event.results[0][0].transcript;
  document.getElementById("user").innerText = text;

  if (text.toLowerCase().includes("news")) {
    await speak("Yes sir, scanning global updates");
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

// 🔊 SPEAK (SYNC)
function speak(text) {
  return new Promise(resolve => {
    let s = new SpeechSynthesisUtterance("Yes sir, " + text);
    s.rate = 0.95;
    s.pitch = 1;
    s.onend = resolve;
    speechSynthesis.speak(s);
  });
}

// ⏳ DELAY
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

//////////////////////////////////////////////////////////
// 🌍 THREE.JS GLOBE
//////////////////////////////////////////////////////////

let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);

let renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("globe"),
  alpha: true
});

renderer.setSize(300, 300);

let geometry = new THREE.SphereGeometry(5, 32, 32);
let texture = new THREE.TextureLoader().load(
  "https://threejs.org/examples/textures/earth_atmos_2048.jpg"
);

let material = new THREE.MeshBasicMaterial({ map: texture });
let globe = new THREE.Mesh(geometry, material);

scene.add(globe);
camera.position.z = 10;

let rotating = true;

// 🔄 ROTATION
function animate() {
  requestAnimationFrame(animate);

  if (rotating) {
    globe.rotation.y += 0.004;
  }

  renderer.render(scene, camera);
}
animate();

// 🎯 FOCUS + ZOOM
function focusGlobe(lat, lon) {
  rotating = false;

  globe.rotation.y = lon * Math.PI / 180;
  globe.rotation.x = lat * Math.PI / 180;

  let zoom = 10;
  let interval = setInterval(() => {
    if (zoom > 6) {
      zoom -= 0.1;
      camera.position.z = zoom;
    } else {
      clearInterval(interval);
    }
  }, 30);
}

//////////////////////////////////////////////////////////
// 🗺️ MAP
//////////////////////////////////////////////////////////

var map = L.map('map').setView([20, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let marker;

function showLocation(lat, lon) {
  if (marker) map.removeLayer(marker);

  marker = L.marker([lat, lon]).addTo(map);
  map.setView([lat, lon], 4);

  // fade-in effect
  document.getElementById("map").style.opacity = 1;
}

//////////////////////////////////////////////////////////
// 🎥 VIDEO FIX (YouTube unavailable FIX 🔥)
//////////////////////////////////////////////////////////

function playVideo(query) {
  // safer embed (no playlist bug)
  let clean = encodeURIComponent(query + " news");
  document.getElementById("video").src =
    `https://www.youtube.com/embed?autoplay=1&mute=1&controls=1&rel=0&modestbranding=1&listType=search&list=${clean}`;
}

//////////////////////////////////////////////////////////
// 📰 NEWS SYSTEM (CINEMATIC)
//////////////////////////////////////////////////////////

async function loadNews() {
  let res = await fetch("/news");
  let data = await res.json();

  let newsDiv = document.getElementById("news");

  for (let i = 0; i < data.length; i++) {
    let n = data[i];

    // 🖼️ SHOW IMAGE
    newsDiv.innerHTML = `
      <div style="box-shadow:0 0 20px #00f0ff;">
        <img src="${n.image}">
        <p>${n.title}</p>
      </div>
    `;

    let country = n.country;

    if (countryCoords[country]) {
      let [lat, lon] = countryCoords[country];

      // 🌍 Globe animation
      focusGlobe(lat, lon);

      await delay(1500);

      // 🗺️ Map show
      showLocation(lat, lon);
    }

    // 🎥 Video
    playVideo(n.title);

    // 🔊 Speak
    await speak("Latest update. " + n.title);

    await delay(1200);
  }

  speak("All updates completed, sir.");
}
