// --- Global Variables ---
let map, marker;
let userLat = 28.7041, userLng = 77.1025; // Default to central location
let watchId;
let timerInterval;
let totalTime = 0;
let timeRemaining = 0;
let safetyScore = 100;
let lastLat = null;
let lastLng = null;
let movementTicks = 0;

let mediaRecorder;
let audioChunks = [];

// --- Initialization ---
window.onload = function() {
    checkLoginState();
    loadPrimaryContact();
    getLocation();

    // Stop audio playback when the modal is closed (via cross button or clicking outside)
    const evidenceModal = document.getElementById('evidenceModal');
    if (evidenceModal) {
        evidenceModal.addEventListener('hidden.bs.modal', () => {
            const audio = document.getElementById('audioPlayback');
            if (audio) {
                audio.pause();
                audio.currentTime = 0; // Reset to start
            }
        });
    }
};

// --- 1. Google Maps & Geolocation ---
function initMap() {
    // Default to a central location if geo fails initially
    const defaultLoc = { lat: 28.7041, lng: 77.1025 }; 
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 15,
        center: defaultLoc,
        disableDefaultUI: true // Clean look
    });
    marker = new google.maps.Marker({
        position: defaultLoc,
        map: map,
        title: "You are here",
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#4285F4",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "white",
        },
    });
}

function getLocation() {
    if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
            (position) => {
                userLat = position.coords.latitude;
                userLng = position.coords.longitude;
                const pos = { lat: userLat, lng: userLng };

                document.getElementById("locationStatus").innerHTML = 
                    `<i class="fas fa-map-marker-alt text-success"></i> Location Active: ${userLat.toFixed(4)}, ${userLng.toFixed(4)}`;

                if(map && marker) {
                    marker.setPosition(pos);
                    map.setCenter(pos);
                }
            },
            (error) => {
                document.getElementById("locationStatus").innerText = "Location Access Denied. SOS features limited.";
                alert("Please enable location services for SurakshaPath to work.");
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

// --- Load Contact from Profile ---
function loadPrimaryContact() {
    // Default if not set in profile
    const phone = localStorage.getItem("primaryContact") || "918149919375"; 
    const displayEl = document.getElementById("displayEmergencyPhone");
    if (displayEl) displayEl.innerText = phone;
    return phone;
}

// --- 2. SOS Functionality (WhatsApp + Audio) ---
async function triggerSOS() {
    // A. Visual Feedback
    const btn = document.querySelector('.btn-sos');
    btn.style.backgroundColor = "darkred";
    btn.innerText = "SENDING...";
    const phone = loadPrimaryContact();

    // B. Start Audio Recording
    startRecording();

    // Show 'I Reached Safely' button to allow stopping the recording manually
    document.getElementById("safeBtn").style.display = "block";

    // C. Send WhatsApp Message
    const mapLink = `https://www.google.com/maps?q=${userLat},${userLng}`;
    const message = `🚨 SOS! I feel unsafe. Here is my live location: ${mapLink}. Audio evidence is being recorded.`;
    
    // Send to Backend API (Automatic) - Removes the "Open App" popup
    const apiUrl = 'http://localhost:3000/send-sos';

    fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone, message: message })
    })
    .catch(error => {
        console.error("Backend failed, falling back to manual WhatsApp");
        // Only open WhatsApp manually if the automatic backend fails
        const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
    });

    // Reset Button UI after delay
    setTimeout(() => {
        btn.style.backgroundColor = "#e63946";
        btn.innerText = "SOS";
    }, 3000);
}

// --- 3. Audio Recording Logic (MediaRecorder API) ---
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        document.getElementById("recordingStatus").style.display = "block";

        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            // Stop all audio tracks to release microphone hardware
            stream.getTracks().forEach(track => track.stop());

            // Use the actual recording format (fixes playback issues on different devices)
            const mimeType = mediaRecorder.mimeType || 'audio/webm';
            const audioBlob = new Blob(audioChunks, { type: mimeType });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Update all audio playback sources (handles multiple elements with same ID)
            document.querySelectorAll('#audioPlayback').forEach(audio => audio.src = audioUrl);

            // Set completion timestamp and update modal text with date and time
            const now = new Date();
            const dateTimeStr = now.toLocaleString();
            const modalBody = document.querySelector('#evidenceModal .modal-body p');
            if (modalBody) {
                modalBody.innerHTML = `<strong>Recording completed:</strong> ${dateTimeStr}<br>Evidence has been saved to your profile.`;
            }
            
            // Show Modal and auto-hide after 5 seconds
            const modalEl = document.getElementById('evidenceModal');
            const evidenceModal = bootstrap.Modal.getOrCreateInstance(modalEl);
            evidenceModal.show();

            setTimeout(() => {
                evidenceModal.hide();
            }, 15000);
            
            document.getElementById("recordingStatus").style.display = "none";
        };

        mediaRecorder.start();
        
    } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("Microphone access required for evidence recording.");
    }
}

// --- 4. Smart Travel Timer ---
function startTimer() {
    const minutesSelect = document.getElementById("timeSelect");
    totalTime = parseInt(minutesSelect.value) * 60;
    timeRemaining = totalTime;
    safetyScore = 100;
    movementTicks = 0;

    document.getElementById("timerControls").style.display = "none";
    document.getElementById("journeyInputs").style.display = "none";
    document.getElementById("timerDisplayContainer").style.display = "flex";
    document.getElementById("timerActiveControls").style.display = "flex";
    document.getElementById("safeBtn").style.display = "block";

    runTimerInterval();
}

function runTimerInterval() {
    const circle = document.getElementById('progressRing');
    const circumference = 2 * Math.PI * 52; // Radius is 52
    circle.style.strokeDasharray = `${circumference} ${circumference}`;

    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        if (timeRemaining < 0) {
            clearInterval(timerInterval);
            alert("⚠️ Timer Expired! Sending Alert...");
            triggerSOS(); // Auto-trigger SOS
            resetTimerUI();
            return;
        }

        const m = Math.floor(timeRemaining / 60);
        const s = timeRemaining % 60;
        const display = document.getElementById("timerDisplay");
        display.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

        const percent = (timeRemaining / totalTime) * 100;
        const offset = circumference - (percent / 100 * circumference);
        circle.style.strokeDashoffset = offset;

        // Smart Mode Movement Detection (Every 10 seconds)
        movementTicks++;
        if (movementTicks % 10 === 0 && document.getElementById("smartModeToggle").checked) {
            checkSmartMovement();
        }

        updateSafetyIndicator(percent);

        timeRemaining--;
    }, 1000);
}

function checkSmartMovement() {
    if (lastLat && lastLng) {
        const dist = Math.sqrt(Math.pow(userLat - lastLat, 2) + Math.pow(userLng - lastLng, 2));
        // Threshold for no movement (approx ~5 meters in coordinate delta)
        if (dist < 0.00005) {
            safetyScore = Math.max(0, safetyScore - 15);
            if (safetyScore < 40) {
                alert("⚠️ Warning: No significant movement detected. Are you okay?");
            }
        } else {
            safetyScore = Math.min(100, safetyScore + 5);
        }
    }
    lastLat = userLat;
    lastLng = userLng;
}

function updateSafetyIndicator(timePercent) {
    const badge = document.getElementById("safetyScoreBadge");
    const display = document.getElementById("timerDisplay");
    
    // Composite Score: Average of time remaining and movement score
    let currentRiskScore = (timePercent + safetyScore) / 2;
    
    let status = "Safe";
    let color = "var(--safe-color)";
    badge.className = "badge bg-success shadow-sm";

    if (currentRiskScore <= 30) {
        status = "Risky";
        color = "var(--sos-red)";
        badge.className = "badge bg-danger shadow-sm";
    } else if (currentRiskScore <= 60) {
        status = "Moderate";
        color = "var(--warning-color)";
        badge.className = "badge bg-warning text-dark shadow-sm";
    }

    badge.innerText = `Score: ${Math.round(currentRiskScore)} (${status})`;
    display.style.color = color;
}

function togglePause() {
    const pauseBtn = document.getElementById("pauseBtn");
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        pauseBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
        pauseBtn.classList.replace("btn-outline-secondary", "btn-success");
    } else {
        runTimerInterval();
        pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
        pauseBtn.classList.replace("btn-success", "btn-outline-secondary");
    }
}

function resetTimer() {
    if (confirm("Are you sure you want to reset the timer?")) {
        clearInterval(timerInterval);
        timerInterval = null;
        resetTimerUI();
    }
}

function shareLiveLocation() {
    const mapLink = `https://www.google.com/maps?q=${userLat},${userLng}`;
    const message = `📍 My current live location: ${mapLink}`;
    const phone = loadPrimaryContact();
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
}

function markSafe() {
    clearInterval(timerInterval);
    
    // Stop Audio Recording if it is active
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
    }

    const phone = loadPrimaryContact();
    const message = "✅ I have reached my destination safely.";
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');

    resetTimerUI();
}

function resetTimerUI() {
    document.getElementById("timerControls").style.display = "block";
    document.getElementById("journeyInputs").style.display = "block";
    document.getElementById("timerDisplayContainer").style.display = "none";
    document.getElementById("timerActiveControls").style.display = "none";
    document.getElementById("safeBtn").style.display = "none";
    
    // Reset Pause Button State
    const pauseBtn = document.getElementById("pauseBtn");
    pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
    pauseBtn.classList.add("btn-outline-secondary");
    pauseBtn.classList.remove("btn-success");
}

// --- 5. Fake Call Logic ---
function scheduleFakeCall() {
    alert("Incoming call scheduled in 5 seconds. Get ready!");
    setTimeout(() => {
        const overlay = document.getElementById("fakeCallOverlay");
        overlay.style.display = "flex";
        // Optional: Play a ringtone here
    }, 5000);
}

function endFakeCall() {
    document.getElementById("fakeCallOverlay").style.display = "none";
}

// --- 6. Helper Functions ---
function callPrimary() {
    const phone = loadPrimaryContact();
    window.location.href = `tel:${phone}`;
}

// --- 7. UI Management ---
function checkLoginState() {
    // Simple simulation of login state using localStorage
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

    // If not logged in, redirect to registration page
    if (!isLoggedIn) {
        window.location.href = "register.html";
        return;
    }

    const authLinks = document.getElementById("authLinks");
    const logoutSection = document.getElementById("logoutSection");

    if (authLinks) authLinks.style.display = "none";
    if (logoutSection) logoutSection.style.display = "block";
}

function handleLogout() {
    localStorage.setItem("isLoggedIn", "false");
    window.location.href = "register.html";
}