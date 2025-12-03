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

// Helper: Safe API call dengan token
async function apiCall(endpoint, options = {}) {
    const token = await getToken();
    
    if (!token) {
        console.warn("⚠️ No token available. User may not be authenticated.");
        throw new Error("User not authenticated");
    }

    const defaultHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const response = await fetch(endpoint, {
        ...options,
        headers: { ...defaultHeaders, ...options.headers }
    });

    console.log(`📡 API Call: ${endpoint} - Status: ${response.status}`);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ API Error: ${endpoint}`, errorData);
        throw new Error(`API Error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    return await response.json();
}

// --- BAGIAN 1: LOAD DATA DASHBOARD ---
async function loadDashboardData(uid) {
    console.log("📊 Loading dashboard data for UID:", uid);
    
    const listContainer = document.getElementById('dashboard-meals-list');
    const progressFill = document.getElementById('dashboard-progress-fill');
    const consumedText = document.getElementById('dashboard-consumed');
    const dailyTarget = 2000;

    try {
        const data = await apiCall(`/api/dashboard?uid=${uid}`);

        const totalCalories = data.totalCalories || 0;
        const foods = data.foodList || [];

        console.log(`✅ Dashboard loaded: ${foods.length} meals, ${totalCalories} calories`);

        if (foods.length > 0) {
            if (listContainer) listContainer.innerHTML = '';
            
            foods.forEach(food => {
                const type = food.type || food.mealType || 'snack';
                const timeLabel = `Today | ${type.charAt(0).toUpperCase() + type.slice(1)}`;

                const itemHTML = `
                    <div class="today-meals-block" style="margin-bottom: 10px; display: flex; gap: 10px; background-color: var(--secondary-color); padding: 1em; border-radius: 25px; align-items: center;">
                        <div style="background: var(--tertiary-color); width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <i class="fa-solid fa-bowl-food" style="color: black;"></i>
                        </div>
                        <div class="meal-data">
                            <p class="meal" style="margin: 0; font-weight: bold;">${food.name || 'Unknown'}</p>
                            <p class="meal-time-data" style="margin: 0; font-size: 0.8em; color: gray;">${timeLabel}</p>
                        </div>
                        <div style="margin-left: auto;">
                            <p style="font-size: 0.9em; font-weight: bold; color: var(--tertiary-color);">${food.calories || 0} kcal</p>
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
        console.error("❌ Error loading dashboard:", error);
        if (listContainer) listContainer.innerHTML = `<p style="color: red;">Error loading meals: ${error.message}</p>`;
    }
}

// --- BAGIAN 2: SLEEP TRACKER CHART ---
async function initSleepChart(uid) {
    const ctx = document.getElementById('sleeptrackerChart');
    if (!ctx) return;
    if (typeof Chart === 'undefined') {
        console.warn("⚠️ Chart.js not loaded");
        return;
    }

    try {
        const apiData = await apiCall(`/api/stats?uid=${uid}&type=sleep`);
        
        // Handle response - bisa berupa { data: [...] } atau langsung [...]
        const statsArray = Array.isArray(apiData) ? apiData : (apiData.data || []);
        
        console.log(`✅ Sleep stats loaded: ${statsArray.length} records`);

        const labels = [];
        const dataPoints = [];
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = dayNames[d.getDay()];
            
            labels.push(dayName);
            
            const foundData = statsArray.find(item => item.date === dateStr);
            dataPoints.push(foundData ? (foundData.durationHours || 0) : 0);
        }

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
        console.error("❌ Error initializing sleep chart:", error);
    }
}

// --- BAGIAN 3: CALORIE CHART ---
async function initCalorieHistoryChart(uid) {
    const ctx = document.getElementById('caloriesComparisonChart');
    if (!ctx) return;

    try {
        const apiData = await apiCall(`/api/stats?uid=${uid}&type=calories`);
        
        // Handle response format
        const statsArray = Array.isArray(apiData) ? apiData : (apiData.data || []);
        
        console.log(`✅ Calorie stats loaded: ${statsArray.length} records`);

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
            
            const foundData = statsArray.find(item => item.date === dateStr);
            let cals = 0;
            
            if (foundData) {
                if (foundData.totalCalories) {
                    cals = foundData.totalCalories;
                } else if (foundData.foodList && Array.isArray(foundData.foodList)) {
                    cals = foundData.foodList.reduce((acc, curr) => acc + (parseInt(curr.calories) || 0), 0);
                }
            }
            dataPoints.push(cals);
        }

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
        console.error("❌ Error initializing calorie chart:", error);
    }
}

// --- BAGIAN 4: LOAD DYNAMIC MEAL IMAGES ---
async function loadDynamicMealImages() {
    const categories = ['breakfast', 'lunch', 'dinner'];
    console.log("🖼️ Fetching meal images...");

    for (const category of categories) {
        try {
            // Foods API tidak perlu token
            const response = await fetch(`/api/foods?category=${category}`);
            
            if (!response.ok) {
                console.warn(`⚠️ Foods API returned ${response.status} for ${category}`);
                continue;
            }

            const foods = await response.json();
            const foodsArray = Array.isArray(foods) ? foods : [];

            if (foodsArray.length > 0) {
                const randomIndex = Math.floor(Math.random() * foodsArray.length);
                const foodData = foodsArray[randomIndex];

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
            console.error(`❌ Error loading images for ${category}:`, error);
        }
    }
}

// --- EKSEKUSI ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log(`🔐 User authenticated: ${user.email}`);
        loadDashboardData(user.uid);
        initSleepChart(user.uid);
        initCalorieHistoryChart(user.uid);
        loadDynamicMealImages();
    } else {
        console.log("❌ User not logged in");
    }
});