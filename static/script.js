//////////////////////////////////////////////////////////
// 🎤 VOICE SETUP
//////////////////////////////////////////////////////////

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "en-US";

recognition.onerror = () => console.log("Voice error");

function startListening() {
  recognition.start();
}

recognition.onresult = async function(event) {
  let text = event.results[0][0].transcript;
  document.getElementById("user").innerText = text;

  if (text.toLowerCase().includes("news")) {
    await speak("Scanning global updates");
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

  await speak(data.reply);
};

//////////////////////////////////////////////////////////
// 🔊 SPEAK
//////////////////////////////////////////////////////////

function speak(text) {
  return new Promise(resolve => {
    speechSynthesis.cancel();

    let s = new SpeechSynthesisUtterance("Yes sir, " + text);
    s.rate = 0.9;
    s.pitch = 1;

    s.onend = resolve;
    speechSynthesis.speak(s);
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

//////////////////////////////////////////////////////////
// 🌍 GEO (OpenStreetMap)
//////////////////////////////////////////////////////////

const geoCache = {};

async function getCoords(place) {
  if (geoCache[place]) return geoCache[place];

  try {
    let res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`,
      { headers: { "User-Agent": "Aira-AI" } }
    );

    let data = await res.json();

    if (data.length > 0) {
      let coords = [
        parseFloat(data[0].lat),
        parseFloat(data[0].lon)
      ];

      geoCache[place] = coords;
      return coords;
    }
  } catch (e) {
    console.log("Geo error", e);
  }

  return null;
}

//////////////////////////////////////////////////////////
// 🌍 THREE.JS GLOBE
//////////////////////////////////////////////////////////

let globeCanvas = document.getElementById("globe");

let scene = new THREE.Scene();

let camera = new THREE.PerspectiveCamera(
  75,
  globeCanvas.clientWidth / globeCanvas.clientHeight,
  0.1,
  1000
);

let renderer = new THREE.WebGLRenderer({
  canvas: globeCanvas,
  alpha: true,
  antialias: true
});

renderer.setSize(globeCanvas.clientWidth, globeCanvas.clientHeight);

let geometry = new THREE.SphereGeometry(5, 32, 32);
let texture = new THREE.TextureLoader().load(
  "https://threejs.org/examples/textures/earth_atmos_2048.jpg"
);

let globe = new THREE.Mesh(
  geometry,
  new THREE.MeshBasicMaterial({ map: texture })
);

scene.add(globe);
camera.position.z = 10;

let rotating = true;

function animate() {
  requestAnimationFrame(animate);

  if (rotating) globe.rotation.y += 0.003;

  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  let w = globeCanvas.clientWidth;
  let h = globeCanvas.clientHeight;

  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
});

//////////////////////////////////////////////////////////
// 🌍 GLOBE ANIMATION
//////////////////////////////////////////////////////////

async function focusGlobe(lat, lon) {
  rotating = false;

  let targetY = THREE.MathUtils.degToRad(lon);
  let targetX = THREE.MathUtils.degToRad(-lat);

  for (let i = 0; i < 25; i++) {
    globe.rotation.y += (targetY - globe.rotation.y) * 0.1;
    globe.rotation.x += (targetX - globe.rotation.x) * 0.1;
    await delay(25);
  }

  for (let i = 0; i < 15; i++) {
    camera.position.z -= 0.2;
    await delay(20);
  }
}

async function resetGlobe() {
  for (let i = 0; i < 15; i++) {
    camera.position.z += 0.2;
    await delay(20);
  }

  rotating = true;
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

  document.getElementById("map").style.opacity = 1;
}

//////////////////////////////////////////////////////////
// 🎥 VIDEO FIX
//////////////////////////////////////////////////////////

function playVideo(query) {
  let clean = encodeURIComponent(query + " news");
  let iframe = document.getElementById("video");

  iframe.src =
    `https://www.youtube.com/embed?listType=search&list=${clean}&autoplay=1&mute=1`;

  setTimeout(() => {
    if (!iframe.src) {
      window.open("https://www.youtube.com/results?search_query=" + clean);
    }
  }, 4000);
}

//////////////////////////////////////////////////////////
// 📰 NEWS SYSTEM
//////////////////////////////////////////////////////////

async function loadNews() {
  let res = await fetch("/news");
  let data = await res.json();

  data = data.slice(0, 10);

  let newsDiv = document.getElementById("news");
  let seen = new Set();

  for (let n of data) {

    if (!n.title || seen.has(n.title)) continue;
    seen.add(n.title);

    // 🖼️ UI
    newsDiv.innerHTML = `
      <div style="box-shadow:0 0 20px #00f0ff;">
        <img src="${n.image}">
        <p>${n.title}</p>
      </div>
    `;

    // 🌍 GEO
    let coords = await getCoords(n.country);

    if (coords) {
      let [lat, lon] = coords;

      await focusGlobe(lat, lon);
      showLocation(lat, lon);

      await delay(800); // API safe
    }

    // 🎥 VIDEO
    playVideo(n.title);

    // 🔊 VOICE
    await speak("Latest update. " + n.title);

    await delay(1200);

    await resetGlobe();
  }

  speak("All updates completed, sir.");
}
