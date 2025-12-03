// FILE: public/script.js
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth } from "./Login Page/auth.js"; 

// Helper: Fungsi untuk mendapatkan token saat ini
async function getToken() {
    if (auth.currentUser) {
        return await auth.currentUser.getIdToken();
    }
    return null;
}

// --- BAGIAN 1: LOAD DATA DASHBOARD (VIA API) ---
async function loadDashboardData(uid) {
    console.log("Loading dashboard via API:", uid); 
    const savedReminders = localStorage.getItem('meal_reminders');
    const reminders = savedReminders ? JSON.parse(savedReminders) : {};

    try {
        const token = await getToken();
        // CALL API DASHBOARD
        const response = await fetch(`/api/dashboard?uid=${uid}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("API Dashboard Error");
        const data = await response.json(); // { foodList: [], totalCalories: ... }

        // --- UPDATE UI (Logika Render HTML tetap sama) ---
        const listContainer = document.getElementById('dashboard-meals-list');
        const progressFill = document.getElementById('dashboard-progress-fill');
        const consumedText = document.getElementById('dashboard-consumed');
        const dailyTarget = 2000; 
        
        const totalCalories = data.totalCalories;
        const foods = data.foodList;

        if (foods.length > 0) {
            if (listContainer) listContainer.innerHTML = ''; 
            foods.forEach(food => {
                let timeLabel = "Today";
                const type = food.type || 'snack'; 
                const typeKey = type.toLowerCase();
                
                if (reminders[typeKey]) timeLabel = `Today | ${reminders[typeKey]}`; 
                else timeLabel = `Today | ${type.charAt(0).toUpperCase() + type.slice(1)}`;

                const itemHTML = `
                    <div class="today-meals-block" style="margin-bottom: 10px; display: flex; gap: 10px; background-color: var(--secondary-color); padding: 1em; border-radius: 25px; align-items: center;">
                        <div style="background: var(--tertiary-color); width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <i class="fa-solid fa-bowl-food" style="color: black;"></i>
                        </div>
                        <div class="meal-data">
                            <p class="meal" style="margin: 0; font-weight: bold;">${food.name}</p>
                            <p class="meal-time-data" style="margin: 0; font-size: 0.8em; color: gray;">${timeLabel}</p>
                        </div>
                        <div style="margin-left: auto;">
                            <p style="font-size: 0.9em; font-weight: bold; color: var(--tertiary-color);">${food.calories} kcal</p>
                        </div>
                    </div>
                `;
                if (listContainer) listContainer.innerHTML += itemHTML;
            });
        } else {
             if (listContainer) listContainer.innerHTML = '<p style="color: gray; font-size: 0.9em; padding: 10px;">No meals added yet.</p>';
        }

        if (consumedText && progressFill) {
            consumedText.innerText = totalCalories;
            let percentage = (totalCalories / dailyTarget) * 100;
            if (percentage > 100) percentage = 100;
            progressFill.style.width = `${percentage}%`;
            progressFill.style.backgroundColor = (totalCalories > dailyTarget) ? "#ff4444" : "var(--tertiary-color)";
        }

    } catch (error) {
        console.error("Error loading dashboard:", error);
    }
}

// --- BAGIAN 2: SLEEP TRACKER CHART (VIA API) ---
async function initSleepChart(uid) {
    const ctx = document.getElementById('sleeptrackerChart');
    if (!ctx) return; 
    if (typeof Chart === 'undefined') return;

    try {
        const token = await getToken();
        // CALL API STATS (TYPE=SLEEP)
        const response = await fetch(`/api/stats?uid=${uid}&type=sleep`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const apiData = await response.json(); // Array data tidur

        // Siapkan data 7 hari terakhir
        const labels = [];
        const dataPoints = [];
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = dayNames[d.getDay()];
            
            labels.push(dayName); 
            // Cari data yang tanggalnya cocok
            const foundData = apiData.find(item => item.date === dateStr);
            
            if (foundData) dataPoints.push(foundData.durationHours);
            else dataPoints.push(0); 
        }

        // --- Render Chart (Logika Visual Chart.js Sama Persis) ---
        const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(250, 204, 21, 0.5)'); 
        gradient.addColorStop(1, 'rgba(250, 204, 21, 0.0)'); 

        new Chart(ctx, {
            type: "line",
            data: {
                labels: labels,
                datasets: [{
                    label: 'Hours slept',
                    fill: true,
                    tension: 0.4, 
                    backgroundColor: gradient, 
                    borderColor: "#facc15", 
                    borderWidth: 3,
                    pointBackgroundColor: "#1f1f1f", 
                    pointBorderColor: "#facc15", 
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    data: dataPoints
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                scales: {
                    y: { beginAtZero: true, suggestedMax: 10, grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "#aaa", stepSize: 2 } },
                    x: { grid: { display: false }, ticks: { color: "#aaa" } }
                },
                plugins: { legend: { display: true }, tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#fff', bodyColor: '#fff' } }
            }
        });
    } catch (error) {
        console.error("Error sleep chart:", error);
    }
}

// --- BAGIAN 3: CALORIE CHART (VIA API) ---
async function initCalorieHistoryChart(uid) {
    const ctx = document.getElementById('caloriesComparisonChart');
    if (!ctx) return;

    try {
        const token = await getToken();
        // CALL API STATS (TYPE=CALORIES)
        const response = await fetch(`/api/stats?uid=${uid}&type=calories`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const apiData = await response.json();

        const labels = [];
        const dataPoints = [];
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dailyTarget = 2000; 

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = i === 0 ? "Today" : dayNames[d.getDay()]; 
            
            labels.push(dayName);
            
            const foundData = apiData.find(item => item.date === dateStr);
            let cals = 0;
            
            if (foundData) {
                // Jika totalCalories sudah dihitung di backend (opsi A) atau hitung manual disini (opsi B)
                // Karena api/dashboard.js menghitungnya, api/stats.js mungkin mengembalikan raw. 
                // Mari kita asumsikan api/stats.js mengembalikan raw data 'foodList' juga atau 'totalCalories' jika ada.
                if(foundData.totalCalories) {
                    cals = foundData.totalCalories;
                } else if (foundData.foodList) {
                    cals = foundData.foodList.reduce((acc, curr) => acc + (parseInt(curr.calories) || 0), 0);
                }
            }
            dataPoints.push(cals);
        } 

        // --- Render Chart (Logika Visual Sama) ---
        const existingChart = Chart.getChart(ctx);
        if (existingChart) existingChart.destroy();

        new Chart(ctx, {
            type: "bar", 
            data: {
                labels: labels,
                datasets: [{
                    label: 'Calories',
                    data: dataPoints,
                    backgroundColor: (context) => {
                        const value = context.raw;
                        return value > dailyTarget ? '#ef4444' : '#facc15'; 
                    },
                    borderRadius: 5,
                    barThickness: 20
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: "rgba(255, 255, 255, 0.1)" }, ticks: { color: "#aaa" }, suggestedMax: 2500 },
                    x: { grid: { display: false }, ticks: { color: "#fff" } }
                }
            }
        });
    } catch (error) {
        console.error("Error calorie chart:", error);
    }
}

// --- BAGIAN 4: LOAD DYNAMIC IMAGES (VIA API) ---
async function loadDynamicMealImages() {
    const categories = ['breakfast', 'lunch', 'dinner'];
    console.log("Fetching images via API...");

    for (const category of categories) {
        try {
            // CALL API FOODS
            const response = await fetch(`/api/foods?category=${category}`);
            const foods = await response.json();

            if (foods.length > 0) {
                const randomIndex = Math.floor(Math.random() * foods.length);
                const foodData = foods[randomIndex];

                const blockId = `block-${category.toLowerCase()}`; 
                const blockEl = document.getElementById(blockId);

                if (blockEl && foodData.imageUrl) {
                    blockEl.style.backgroundImage = `
                        linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6)),
                        url('${foodData.imageUrl}')
                    `;
                    blockEl.style.border = "none"; 
                }
            }
        } catch (error) {
            console.error(`Error loading image for ${category}:`, error);
        }
    }
}

// --- EKSEKUSI ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadDashboardData(user.uid);
        initSleepChart(user.uid);
        initCalorieHistoryChart(user.uid);
        loadDynamicMealImages();
    } else {
        console.log("User belum login.");
    }
});