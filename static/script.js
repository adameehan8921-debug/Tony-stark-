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
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`
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

let canvas = document.getElementById("globe");

let scene = new THREE.Scene();

let camera = new THREE.PerspectiveCamera(
  75,
  canvas.clientWidth / canvas.clientHeight,
  0.1,
  1000
);

let renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  alpha: true,
  antialias: true
});

function resize() {
  let w = canvas.clientWidth || 300;
  let h = canvas.clientHeight || 300;

  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

resize();
window.addEventListener("resize", resize);

let globe = new THREE.Mesh(
  new THREE.SphereGeometry(5, 32, 32),
  new THREE.MeshBasicMaterial({
    map: new THREE.TextureLoader().load(
      "https://threejs.org/examples/textures/earth_atmos_2048.jpg"
    )
  })
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

//////////////////////////////////////////////////////////
// 🌍 GLOBE ANIMATION
//////////////////////////////////////////////////////////

async function stopRotation() {
  for (let i = 0; i < 20; i++) {
    globe.rotation.y += 0.003 * (1 - i / 20);
    await delay(20);
  }
  rotating = false;
}

async function focusGlobe(lat, lon) {
  await stopRotation();

  let targetY = THREE.MathUtils.degToRad(lon);
  let targetX = THREE.MathUtils.degToRad(-lat);

  for (let i = 0; i < 25; i++) {
    globe.rotation.y += (targetY - globe.rotation.y) * 0.1;
    globe.rotation.x += (targetX - globe.rotation.x) * 0.1;
    await delay(20);
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
// 🎥 VIDEO (FIXED NO REDIRECT)
//////////////////////////////////////////////////////////

async function playVideo(query) {
  let iframe = document.getElementById("video");

  try {
    let res = await fetch(`/youtube?q=${encodeURIComponent(query)}`);
    let data = await res.json();

    if (data.videoId) {
      iframe.src = `https://www.youtube.com/embed/${data.videoId}?autoplay=1&mute=1&controls=1`;
    } else {
      iframe.src = ""; // no redirect
    }

  } catch (e) {
    iframe.src = "";
  }
}

//////////////////////////////////////////////////////////
// 📰 NEWS SYSTEM
//////////////////////////////////////////////////////////

async function loadNews() {
  let res = await fetch("/news");
  let data = await res.json();

  data = data.slice(0, 50);

  let newsDiv = document.getElementById("news");
  let seen = new Set();

  for (let n of data) {

    if (!n.title || seen.has(n.title)) continue;
    seen.add(n.title);

    newsDiv.innerHTML += `
      <div class="news-card">
        <img src="${n.image}">
        <p>${n.title}</p>
      </div>
    `;

    let coords = await getCoords(n.country);

    if (coords) {
      let [lat, lon] = coords;

      await focusGlobe(lat, lon);
      showLocation(lat, lon);
    }

    await playVideo(n.title);

    await speak("Latest update. " + n.title);

    await delay(1000);

    await resetGlobe();
  }

  speak("All updates are completed, sir.");
}
