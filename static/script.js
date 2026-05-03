//////////////////////////////////////////////////////////
// 🎤 VOICE SETUP
//////////////////////////////////////////////////////////
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "en-US";
recognition.continuous = false;

function startListening() {
    recognition.start();
}

recognition.onresult = async function(event) {
    let text = event.results[0][0].transcript;
    document.getElementById("user").innerText = text;

    if (text.toLowerCase().includes("news")) {
        await speak("Scanning global data streams. Synchronizing updates, Sir.");
        loadNews();
        return;
    }

    try {
        let res = await fetch("/chat", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({message: text})
        });
        let data = await res.json();
        document.getElementById("bot").innerText = data.reply;
        await speak(data.reply);
    } catch (e) { console.log("Comms error", e); }
};

//////////////////////////////////////////////////////////
// 🔊 SPEAK & DELAY
//////////////////////////////////////////////////////////
function speak(text) {
    return new Promise(resolve => {
        speechSynthesis.cancel();
        let s = new SpeechSynthesisUtterance(text);
        s.rate = 1.1; 
        s.pitch = 0.9;
        s.onend = resolve;
        speechSynthesis.speak(s);
    });
}

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

//////////////////////////////////////////////////////////
// 🌍 GEO (OpenStreetMap)
//////////////////////////////////////////////////////////
async function getCoords(place) {
    try {
        let res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`);
        let data = await res.json();
        if (data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    } catch (e) { console.log("Geo error", e); }
    return [20, 77]; // Default to India if not found
}

//////////////////////////////////////////////////////////
// 🌍 THREE.JS GLOBE (FIXED ROTATION)
//////////////////////////////////////////////////////////
let canvas = document.getElementById("globe");
let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
let renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });

scene.add(new THREE.AmbientLight(0xffffff, 1.5));

let globe = new THREE.Mesh(
    new THREE.SphereGeometry(5, 64, 64),
    new THREE.MeshStandardMaterial({
        map: new THREE.TextureLoader().load("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
    })
);
scene.add(globe);
camera.position.z = 12;

let rotating = true;
let targetX = 0, targetY = 0;

function animate() {
    requestAnimationFrame(animate);
    if (rotating) {
        globe.rotation.y += 0.003; 
    } else {
        globe.rotation.y += (targetY - globe.rotation.y) * 0.1;
        globe.rotation.x += (targetX - globe.rotation.x) * 0.1;
    }
    renderer.render(scene, camera);
}
animate();

async function focusGlobe(lat, lon) {
    rotating = false;
    targetY = (lon + 180) * (Math.PI / 180);
    targetX = (lat) * (Math.PI / 180);
    while(camera.position.z > 8) { camera.position.z -= 0.1; await delay(20); }
}

async function resetGlobe() {
    rotating = true;
    while(camera.position.z < 12) { camera.position.z += 0.1; await delay(20); }
}

//////////////////////////////////////////////////////////
// 🗺️ RADAR MAP SETUP
//////////////////////////////////////////////////////////
var map = L.map('map', {zoomControl: false}).setView([20, 0], 2);
L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
    subdomains:['mt0','mt1','mt2','mt3']
}).addTo(map);

function showLocation(lat, lon) {
    map.flyTo([lat, lon], 10, { animate: true, duration: 1.5 });
}

//////////////////////////////////////////////////////////
// 📰 NEWS SYSTEM (THE REAL JARVIS FEEL)
//////////////////////////////////////////////////////////
async function loadNews() {
    try {
        let res = await fetch("/news");
        let data = await res.json();
        let newsDiv = document.getElementById("news");
        
        newsDiv.innerHTML = ""; // Clear old

        // 1. Inject cards for scrolling
        data.forEach(n => {
            newsDiv.innerHTML += `
              <div class="news-card">
                <div class="scan-container">
                    <img src="${n.image}" class="news-img">
                    <div class="scan-bar"></div>
                </div>
                <p class="news-title">${n.title.substring(0, 50)}...</p>
              </div>`;
        });

        // 2. Sequential Analysis
        for (let n of data.slice(0, 5)) {
            let coords = await getCoords(n.country);
            await focusGlobe(coords[0], coords[1]);
            showLocation(coords[0], coords[1]);

            // Play video if available
            let vRes = await fetch(`/youtube?q=${encodeURIComponent(n.title)}`);
            let vData = await vRes.json();
            if(vData.videoId) document.getElementById("video").src = `https://www.youtube.com/embed/${vData.videoId}?autoplay=1&mute=1`;

            await speak(n.title);
            await delay(5000);
            await resetGlobe();
        }
        speak("All systems updated, Sir.");
    } catch (e) { console.log("News Error", e); }
}
