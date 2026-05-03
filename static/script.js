//////////////////////////////////////////////////////////
// 🎤 VOICE SETUP
//////////////////////////////////////////////////////////
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "en-US";
recognition.continuous = false;

recognition.onerror = () => console.log("Voice error");

function startListening() {
    recognition.start();
}

recognition.onresult = async function(event) {
    let text = event.results[0][0].transcript;
    document.getElementById("user").innerText = text;

    if (text.toLowerCase().includes("news")) {
        await speak("Scanning global updates, sir.");
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
    } catch (e) {
        console.log("Chat fetch error", e);
    }
};

//////////////////////////////////////////////////////////
// 🔊 SPEAK & DELAY
//////////////////////////////////////////////////////////
function speak(text) {
    return new Promise(resolve => {
        speechSynthesis.cancel();
        let s = new SpeechSynthesisUtterance("Yes sir, " + text);
        s.rate = 1.0;
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
        let res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`);
        let data = await res.json();
        if (data.length > 0) {
            let coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
            geoCache[place] = coords;
            return coords;
        }
    } catch (e) { console.log("Geo error", e); }
    return null;
}

//////////////////////////////////////////////////////////
// 🌍 THREE.JS GLOBE SETUP
//////////////////////////////////////////////////////////
let canvas = document.getElementById("globe");
let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
let renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });

function resize() {
    let w = canvas.clientWidth || 300;
    let h = canvas.clientHeight || 300;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
}
resize();
window.addEventListener("resize", resize);

scene.add(new THREE.AmbientLight(0xffffff, 1.2));

let globe = new THREE.Mesh(
    new THREE.SphereGeometry(5, 64, 64),
    new THREE.MeshStandardMaterial({
        map: new THREE.TextureLoader().load("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
    })
);
scene.add(globe);
camera.position.z = 11;

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
// 🌍 GLOBE ANIMATION (SMOOTH FOCUS)
//////////////////////////////////////////////////////////
async function focusGlobe(lat, lon) {
    rotating = false;
    let targetY = (lon + 180) * (Math.PI / 180);
    let targetX = (lat) * (Math.PI / 180);

    for (let i = 0; i < 25; i++) {
        globe.rotation.y += (targetY - globe.rotation.y) * 0.15;
        globe.rotation.x += (targetX - globe.rotation.x) * 0.15;
        if(camera.position.z > 7.5) camera.position.z -= 0.15;
        await delay(30);
    }
}

async function resetGlobe() {
    for (let i = 0; i < 15; i++) {
        camera.position.z += 0.25;
        globe.rotation.x *= 0.8; 
        await delay(20);
    }
    camera.position.z = 11;
    rotating = true;
}

//////////////////////////////////////////////////////////
// 🗺️ TRAFFIC & HYBRID MAP (GOOGLE STYLE)
//////////////////////////////////////////////////////////
var map = L.map('map').setView([20, 0], 2);

// Hybrid Satellite & Traffic Layer
L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains:['mt0','mt1','mt2','mt3']
}).addTo(map);

// Traffic Overlay
L.tileLayer('https://{s}.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains:['mt0','mt1','mt2','mt3']
}).addTo(map);

let marker;

function showLocation(lat, lon) {
    if (marker) map.removeLayer(marker);
    
    marker = L.circleMarker([lat, lon], {
        color: '#00ccff',
        fillColor: '#00ccff',
        fillOpacity: 0.6,
        radius: 12
    }).addTo(map);

    map.flyTo([lat, lon], 12, { animate: true, duration: 1.5 });
    document.getElementById("map").style.opacity = 1;
}

//////////////////////////////////////////////////////////
// 🎥 VIDEO & NEWS
//////////////////////////////////////////////////////////
async function playVideo(query) {
    let iframe = document.getElementById("video");
    try {
        let res = await fetch(`/youtube?q=${encodeURIComponent(query)}`);
        let data = await res.json();
        if (data.videoId) {
            iframe.src = `https://www.youtube.com/embed/${data.videoId}?autoplay=1&mute=1`;
        }
    } catch (e) { console.log("Video error", e); }
}

async function loadNews() {
    try {
        let res = await fetch("/news");
        let data = await res.json();
        let newsDiv = document.getElementById("news");
        newsDiv.innerHTML = ""; 

        for (let n of data.slice(0, 5)) {
            newsDiv.innerHTML += `
              <div class="news-card" style="border-left: 4px solid #00ccff; background: rgba(0,0,0,0.5); margin-bottom: 10px; padding: 10px; color: white;">
                <p><strong>${n.title}</strong></p>
              </div>`;

            let coords = await getCoords(n.country || "India");
            if (coords) {
                await focusGlobe(coords[0], coords[1]);
                showLocation(coords[0], coords[1]);
            }

            await playVideo(n.title);
            await speak(n.title);
            await delay(5000); 
            await resetGlobe();
        }
        speak("All system updates are completed, sir.");
    } catch (e) { console.log("News error", e); }
}
