// FILE: public/sleeptracker.js
import { auth } from "./Login Page/auth.js"; 
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
// TIDAK ADA LAGI IMPORT FIRESTORE

// --- KONSTANTA KALENDER ---
const DAYS_RANGE = 30; 
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Helper: Get Token
async function getToken() {
    if (auth.currentUser) return await auth.currentUser.getIdToken();
    return null;
}

// --- KONFIGURASI LINGKARAN SVG (UI) ---
const circle = document.querySelector('.progress-ring-circle');
// Cek jika elemen ada (mencegah error di halaman lain)
const radius = circle ? circle.r.baseVal.value : 0;
const circumference = radius * 2 * Math.PI;

if (circle) {
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = circumference; 
}

function setProgress(percent) {
    if (!circle) return;
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
    
    if (percent < 50) circle.style.stroke = "#ef4444"; 
    else if (percent < 80) circle.style.stroke = "#facc15"; 
    else circle.style.stroke = "#4ade80"; 
}

// --- FITUR KALENDER (UI CLIENT SIDE) ---
function updateHeaderDate(dateObj) {
    const dateElement = document.getElementById('current-date-display');
    if (dateElement) {
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = monthNames[dateObj.getMonth()];
        const year = dateObj.getFullYear();
        
        const today = new Date();
        const isToday = (
            dateObj.getDate() === today.getDate() && 
            dateObj.getMonth() === today.getMonth() && 
            dateObj.getFullYear() === today.getFullYear()
        );
        const prefix = isToday ? "Today" : dayNames[dateObj.getDay()]; 
        dateElement.innerText = `${prefix} ${day} ${month} ${year}`;
    }
}

function updateDaySelector() {
    const selectorContainer = document.querySelector('.day-selector');
    if (!selectorContainer) return; 
    
    selectorContainer.innerHTML = ''; 
    const today = new Date();
    today.setHours(0,0,0,0); 
    
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - DAYS_RANGE);

    for (let i = 0; i <= (DAYS_RANGE * 2); i++) { 
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        date.setHours(0,0,0,0);
        
        const dayAbbrev = dayNames[date.getDay()];
        const dayNumber = String(date.getDate()).padStart(2, '0');
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        const isToday = date.getTime() === today.getTime();
        const blockClass = isToday ? 'day-block selected-day-block' : 'day-block';

        const dayDiv = document.createElement('div');
        dayDiv.className = blockClass;
        dayDiv.id = `day-index-${i}`;
        dayDiv.innerHTML = `<p>${dayAbbrev}</p><p>${dayNumber}</p>`;

        dayDiv.addEventListener('click', function() {
            const previousSelected = document.querySelector('.selected-day-block');
            if (previousSelected) previousSelected.classList.remove('selected-day-block');
            this.classList.add('selected-day-block');
            
            centerElement(this);
            updateHeaderDate(date);
            
            // LOAD DATA VIA API
            loadSleepData(dateString);
        });

        selectorContainer.appendChild(dayDiv);
    }
    setTimeout(autoScrollToToday, 100);
}

function centerElement(element) {
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

function autoScrollToToday() {
    const todayElement = document.querySelector('.selected-day-block');
    if (todayElement) todayElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

// --- LOGIKA UTAMA TRACKER ---

function initSleepTracker() {
    const sleepBtn = document.getElementById('sleep-action-btn');
    if (!sleepBtn) return;
    
    // Cek status "LIVE" di LocalStorage (Client Side)
    const sleepStatus = JSON.parse(localStorage.getItem('sleep_status'));

    if (sleepStatus && sleepStatus.isSleeping) {
        toggleSleepUI(true, sleepStatus.startTime);
    }

    sleepBtn.addEventListener('click', () => {
        const currentStatus = JSON.parse(localStorage.getItem('sleep_status'));
        
        if (currentStatus && currentStatus.isSleeping) {
            finishSleep(currentStatus.startTime);
        } else {
            startSleep();
        }
    });
}

function startSleep() {
    const now = new Date();
    const status = {
        isSleeping: true,
        startTime: now.getTime()
    };
    
    localStorage.setItem('sleep_status', JSON.stringify(status));
    toggleSleepUI(true, now.getTime());
    
    if (Notification.permission === "granted") {
        new Notification("Good Night!", { body: "Sleep tracking started." });
    }
}

function finishSleep(startTimeMs) {
    const endTime = new Date();
    const startTime = new Date(startTimeMs);
    
    const durationMs = endTime - startTime;
    const durationMinutes = Math.floor(durationMs / (1000 * 60));
    const durationHours = (durationMinutes / 60).toFixed(1); 

    // Logic Skor
    let score = 0;
    if (durationMinutes < 300) score = 50; 
    else if (durationMinutes <= 480) score = Math.round(50 + ((durationMinutes - 300) * (50 / 180)));
    else { 
        const overMinutes = durationMinutes - 480;
        const penalty = Math.floor(overMinutes / 15);
        score = Math.max(50, 100 - penalty);
    }

    localStorage.removeItem('sleep_status');
    toggleSleepUI(false);

    // Update UI dulu biar responsif
    updateUIResults(score, durationHours, startTime, endTime);
    
    // SIMPAN KE DATABASE VIA API
    saveSleepToFirebase(score, durationHours, startTime, endTime);
}

function toggleSleepUI(isSleeping, startTimeMs = null) {
    const sleepBtn = document.getElementById('sleep-action-btn');
    const sleepText = sleepBtn.querySelector('p');
    const bedTimeVal = document.getElementById('bed-time-val');

    if (isSleeping) {
        sleepBtn.style.backgroundColor = "#ef4444"; 
        sleepText.innerText = "Stop Now ⏹";
        
        const date = new Date(startTimeMs);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        bedTimeVal.innerText = timeStr;
        
        document.getElementById('wakeup-time-val').innerText = "--:--";
        document.getElementById('sleep-duration-val').innerText = "Tracking...";
        setProgress(0);
        document.getElementById('score-val').innerText = "zZ";
    } else {
        sleepBtn.style.backgroundColor = "var(--tertiary-color)"; 
        sleepText.innerText = "Sleep Now";
    }
}

function updateUIResults(score, duration, startTime, endTime) {
    // Pastikan input berupa Object Date
    const start = (typeof startTime === 'string') ? new Date(startTime) : startTime;
    const end = (typeof endTime === 'string') ? new Date(endTime) : endTime;

    const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    document.getElementById('score-val').innerText = score;
    document.getElementById('sleep-duration-val').innerText = duration + " HRS";
    document.getElementById('bed-time-val').innerText = startStr;
    document.getElementById('wakeup-time-val').innerText = endStr;

    setProgress(score);
}

function resetUIResults() {
    document.getElementById('score-val').innerText = "0";
    document.getElementById('sleep-duration-val').innerText = "--";
    document.getElementById('bed-time-val').innerText = "--:--";
    document.getElementById('wakeup-time-val').innerText = "--:--";
    setProgress(0);
}

// --- DATABASE ACCESS VIA API ---

// UPDATE: Pakai Fetch POST
async function saveSleepToFirebase(score, duration, start, end) {
    const user = auth.currentUser;
    if (!user) return;
    
    // Simpan ke tanggal hari ini (saat bangun)
    const today = new Date().toISOString().split('T')[0];

    try {
        const token = await getToken();
        const response = await fetch(`/api/sleep?uid=${user.uid}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                date: today,
                score: score,
                durationHours: parseFloat(duration),
                startTime: start.toISOString(),
                endTime: end.toISOString()
            })
        });

        if (!response.ok) throw new Error("Gagal menyimpan data tidur");

        alert(`Good Morning! Your sleep score is ${score}.`);
    } catch (e) {
        console.error("Error saving sleep:", e);
        alert("Gagal menyimpan data ke server.");
    }
}

// UPDATE: Pakai Fetch GET
async function loadSleepData(dateString) {
    const user = auth.currentUser;
    if (user) {
        try {
            const token = await getToken();
            const response = await fetch(`/api/sleep?uid=${user.uid}&date=${dateString}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("API Error");

            const data = await response.json();
            
            if (data.found) {
                // Data dari API berupa string ISO, konversi ke Date Object untuk UI
                const start = new Date(data.startTime);
                const end = new Date(data.endTime);
                updateUIResults(data.score, data.durationHours, start, end);
            } else {
                resetUIResults();
            }
        } catch (error) {
            console.error("Error loading sleep data:", error);
            resetUIResults();
        }
    }
}

// --- REMINDER (TETAP SAMA - CLIENT SIDE) ---
function initSleepReminder() {
    const openBtn = document.getElementById('open-reminder-btn');
    const modal = document.getElementById('sleep-reminder-modal');
    const saveBtn = document.getElementById('save-sleep-btn');
    const cancelBtn = document.getElementById('cancel-sleep-btn');

    if(openBtn) {
        openBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
            const savedTime = localStorage.getItem('sleep_reminder_time');
            if (savedTime) document.getElementById('sleep-reminder-time').value = savedTime;
        });
    }

    if(cancelBtn) cancelBtn.addEventListener('click', () => modal.style.display = 'none');

    if(saveBtn) {
        saveBtn.addEventListener('click', () => {
            const time = document.getElementById('sleep-reminder-time').value;
            if (time) {
                localStorage.setItem('sleep_reminder_time', time);
                Notification.requestPermission().then(perm => {
                    if (perm === 'granted') {
                        alert(`Reminder set for ${time}`);
                        modal.style.display = 'none';
                    }
                });
            }
        });
    }

    setInterval(() => {
        const savedTime = localStorage.getItem('sleep_reminder_time');
        if (savedTime) {
            const now = new Date();
            const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            if (currentTime === savedTime) {
                new Notification("Time to Sleep! 😴", {
                    body: "Maintain your streak! Go to bed now.",
                    icon: "Assets/icon.png"
                });
            }
        }
    }, 60000);
}

// --- INITIALIZE ---
const today = new Date();
updateHeaderDate(today);
updateDaySelector();
initSleepTracker();
initSleepReminder();

onAuthStateChanged(auth, (user) => {
    if (user) {
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayString = `${year}-${month}-${day}`;        
        
        // Hanya load data dari API jika sedang TIDAK tidur
        const sleepStatus = JSON.parse(localStorage.getItem('sleep_status'));
        if (!sleepStatus || !sleepStatus.isSleeping) {
            loadSleepData(todayString);
        }
    }
});