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
        let s = new SpeechSynthesisUtterance(text); // "Yes sir" removal for cleaner flow
        s.rate = 1.1; 
        s.pitch = 0.9; // Slightly deeper Jarvis voice
        s.onend = resolve;
        speechSynthesis.speak(s);
    });
}

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

//////////////////////////////////////////////////////////
// 🌍 THREE.JS GLOBE (STABLE ROTATION)
//////////////////////////////////////////////////////////
let canvas = document.getElementById("globe");
let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
let renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });

scene.add(new THREE.AmbientLight(0xffffff, 1.5));

let globe = new THREE.Mesh(
    new THREE.SphereGeometry(5, 64, 64),
    new THREE.MeshStandardMaterial({
        map: new THREE.TextureLoader().load("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"),
        bumpScale: 0.05,
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
        // Smooth transition to location
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
    
    for (let i = 0; i < 15; i++) {
        if(camera.position.z > 8) camera.position.z -= 0.2;
        await delay(30);
    }
}

async function resetGlobe() {
    rotating = true;
    while(camera.position.z < 12) {
        camera.position.z += 0.2;
        await delay(20);
    }
}

//////////////////////////////////////////////////////////
// 📰 NEWS SYSTEM (WITH SCANNING EFFECT & IMAGES)
//////////////////////////////////////////////////////////
async function loadNews() {
    try {
        let res = await fetch("/news");
        let data = await res.json();
        let newsDiv = document.getElementById("news");
        newsDiv.innerHTML = ""; 

        for (let n of data.slice(0, 5)) {
            // Jarvis Style News Card with Image & Scanning Overlay
            newsDiv.innerHTML = `
              <div class="news-card jarvis-ui">
                <div class="scan-container">
                    <img src="${n.image}" class="news-img">
                    <div class="scan-bar"></div>
                </div>
                <div class="news-info">
                    <p class="intel-label">INTEL CORRELATION: ${n.country.toUpperCase()}</p>
                    <p class="news-title">${n.title}</p>
                </div>
              </div>`;

            let coords = await getCoords(n.country);
            if (coords) {
                await focusGlobe(coords[0], coords[1]);
                showLocation(coords[0], coords[1]);
            }

            await playVideo(n.title);
            await speak("Update from sector " + n.country + ". " + n.title);
            await delay(4000); 
            await resetGlobe();
        }
        speak("Global intel synchronization complete, Sir.");
    } catch (e) { console.log("News relay failed", e); }
}

// ... (playVideo & showLocation remain same)
