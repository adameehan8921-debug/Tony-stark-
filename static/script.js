//////////////////////////////////////////////////////////
// 🎤 VOICE SETUP
//////////////////////////////////////////////////////////

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "en-US";

function startListening() {
  recognition.start();
}

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

//////////////////////////////////////////////////////////
// 🔊 SPEAK
//////////////////////////////////////////////////////////

function speak(text) {
  return new Promise(resolve => {
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
// 🌍 COUNTRY COORDS
//////////////////////////////////////////////////////////

const countryCoords = {
  "us": [37, -95],
  "in": [20.5, 78.9],
  "gb": [55, -3]
};

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

function animate() {
  requestAnimationFrame(animate);

  if (rotating) {
    globe.rotation.y += 0.003;
  }

  renderer.render(scene, camera);
}
animate();

//////////////////////////////////////////////////////////
// 🌍 GLOBE ANIMATION
//////////////////////////////////////////////////////////

async function focusGlobe(lat, lon) {
  rotating = false;

  let targetY = THREE.MathUtils.degToRad(lon);
  let targetX = THREE.MathUtils.degToRad(-lat);

  for (let i = 0; i < 30; i++) {
    globe.rotation.y += (targetY - globe.rotation.y) * 0.1;
    globe.rotation.x += (targetX - globe.rotation.x) * 0.1;
    await delay(30);
  }

  // 🔍 Zoom inside
  for (let i = 0; i < 20; i++) {
    camera.position.z -= 0.15;
    await delay(25);
  }
}

async function resetGlobe() {
  for (let i = 0; i < 20; i++) {
    camera.position.z += 0.15;
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
// 🎥 VIDEO
//////////////////////////////////////////////////////////

function playVideo(query) {
  let clean = encodeURIComponent(query + " news");
  document.getElementById("video").src =
    `https://www.youtube.com/embed?autoplay=1&mute=1&controls=1&rel=0&modestbranding=1&listType=search&list=${clean}`;
}

//////////////////////////////////////////////////////////
// 📰 NEWS SYSTEM
//////////////////////////////////////////////////////////

async function loadNews() {
  let res = await fetch("/news");
  let data = await res.json();

  data = data.slice(0, 10); // ✅ limit

  let newsDiv = document.getElementById("news");
  let seen = new Set();

  for (let i = 0; i < data.length; i++) {
    let n = data[i];

    if (seen.has(n.title)) continue;
    seen.add(n.title);

    // 🖼️ Show news
    newsDiv.innerHTML = `
      <div style="box-shadow:0 0 20px #00f0ff;">
        <img src="${n.image}">
        <p>${n.title}</p>
      </div>
    `;

    let country = n.country;

    if (countryCoords[country]) {
      let [lat, lon] = countryCoords[country];

      await focusGlobe(lat, lon);
      showLocation(lat, lon);
    }

    playVideo(n.title);

    await speak("Latest update. " + n.title);

    await delay(1200);

    await resetGlobe();
  }

  speak("All updates completed, sir.");
}
