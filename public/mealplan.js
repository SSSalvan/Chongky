// FILE: public/mealplan.js
import { auth } from "./Login Page/auth.js"; 
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
// TIDAK ADA LAGI IMPORT FIRESTORE!

const DAYS_RANGE = 30; 
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAILY_TARGET = 2000; 

// Helper: Get Token
async function getToken() {
    if (auth.currentUser) return await auth.currentUser.getIdToken();
    return null;
}

// --- BAGIAN 1: HEADER & PROGRESS BAR ---

function updateHeaderDate(dateObj) {
    const dateElement = document.querySelector('.meal-plan-date');
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

function updateCalorieProgress(current, target) {
    const fillBar = document.querySelector('.progress-bar-fill');
    const textElement = document.querySelector('.calorie-count');
    
    if (fillBar && textElement) {
        let percentage = (current / target) * 100;
        if (percentage > 100) percentage = 100;
        
        fillBar.style.width = `${percentage}%`;
        fillBar.style.transition = "width 0.5s ease-in-out"; 
        textElement.innerText = `${current}/${target} kcal`;
    }
}

// UPDATE: Pake Fetch API ke /api/meals
async function loadDailyCalories(dateString) {
    const user = auth.currentUser;
    if (user) {
        try {
            const token = await getToken();
            const response = await fetch(`/api/meals?uid=${user.uid}&date=${dateString}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("API Error");

            const data = await response.json();
            // Backend sudah mengembalikan { totalCalories: 1234 }
            updateCalorieProgress(data.totalCalories || 0, DAILY_TARGET);

        } catch (error) {
            console.error("Gagal mengambil data kalori:", error);
            updateCalorieProgress(0, DAILY_TARGET);
        }
    }
}

// --- BAGIAN 2: KALENDER (LOGIKA CLIENT SIDE SAMA SAJA) ---

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
            
            // Load data via API
            console.log("Loading data for:", dateString);
            loadDailyCalories(dateString);
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

// --- BAGIAN 3: FETCH MAKANAN (VIA API) ---

async function fetchFoodOptions(mealType) {
    const mealListContainer = document.getElementById('meal-list-container');
    if (!mealListContainer) return;
    
    mealListContainer.innerHTML = '<p>Loading...</p>';

    try {
        // UPDATE: Fetch ke /api/foods
        let url = '/api/foods';
        if (mealType) url += `?type=${mealType.toLowerCase()}`;

        const response = await fetch(url);
        const foods = await response.json();

        mealListContainer.innerHTML = '';

        if (foods.length === 0) {
            mealListContainer.innerHTML = "<p>No food items found.</p>";
            return;
        }
        
        foods.forEach(item => {
            const imgUrl = item.imageUrl ? item.imageUrl : 'Assets/icon.png';
            const itemHtml = `
                <div class="meal-item" data-id="${item.id}" 
                     style="display: flex; gap: 15px; background: var(--secondary-color); padding: 15px; border-radius: 15px; cursor: pointer; align-items: center; margin-bottom: 10px;">
                    <img src="${imgUrl}" class="meal-img" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">
                    <div class="meal-info">
                        <p class="meal-name" style="font-weight: bold; margin: 0;">${item.name}</p>
                        <p class="meal-calories" style="color: gray; font-size: 0.9em; margin: 5px 0 0 0;">${item.calories} kcal</p>
                    </div>
                </div>
            `;
            mealListContainer.innerHTML += itemHtml;
        });

        // Add Listeners
        document.querySelectorAll('.meal-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const foodId = e.currentTarget.dataset.id;
                const currentUrlParams = new URLSearchParams(window.location.search);
                const currentType = currentUrlParams.get('type') || 'snack';
                window.location.href = `recipe_detail.html?id=${foodId}&type=${currentType}`; 
            });
        });

    } catch (error) {
        console.error("Error fetching food:", error);
        mealListContainer.innerHTML = "<p>Error loading foods.</p>";
    }
}

// --- BAGIAN 4: DETAIL RESEP & ADD TO LOG (VIA API) ---

async function displayRecipeDetail(foodId) {
    try {
        // UPDATE: Fetch detail via API
        const response = await fetch(`/api/foods?id=${foodId}`);
        if(!response.ok) throw new Error("Food not found");
        
        const data = await response.json();
        const detailParams = new URLSearchParams(window.location.search);
        const mealType = detailParams.get('type') || 'Snack';

        document.getElementById('recipe-image-placeholder').innerHTML = `
            <img src="${data.imageUrl}" alt="${data.name}">
            <h2 style="margin-bottom: 5px;">${data.name}</h2>
            <p style="color: var(--tertiary-color); font-weight: bold;">${data.calories} kcal</p>
        `;
        const instructions = data.recipeText || data.description || "No instructions available.";
        document.getElementById('recipe-instructions-placeholder').innerText = instructions;
        
        const videoBtn = document.getElementById('view-video-btn');
        if(data.videoUrl) videoBtn.onclick = () => window.open(data.videoUrl, '_blank');
        else videoBtn.style.display = 'none';

        const addBtn = document.getElementById('add-to-library-btn');
        addBtn.onclick = () => {
            addToDailyLog(data.calories, data.name, mealType);
        };

    } catch (error) {
        console.error("Error display recipe:", error);
    }
}

async function addToDailyLog(calories, foodName, mealType) {
    const user = auth.currentUser;
    if (!user) {
        alert("Please login first!");
        return;
    }

    try {
        const token = await getToken();
        // UPDATE: POST ke /api/meals
        const response = await fetch(`/api/meals?uid=${user.uid}`, { // tanggal default hari ini di backend
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                calories: calories,
                foodName: foodName,
                mealType: mealType
            })
        });

        if (!response.ok) throw new Error("Gagal menyimpan");

        alert(`Added ${foodName} to ${mealType}!`);
        window.location.href = "index_loggedIn.html"; 

    } catch (error) {
        console.error("Error adding log:", error);
        alert("Failed to add meal. Connection error.");
    }
}

function setupMealSlotListeners() {
    const slots = document.querySelectorAll('.meal-slot');
    slots.forEach(slot => {
        slot.addEventListener('click', (e) => {
            const mealType = e.currentTarget.dataset.type;
            if (mealType) window.location.href = `meal_selector.html?type=${mealType}`;
        });
    });
}

// --- BAGIAN 5: REMINDER (TETAP SAMA - CLIENT SIDE) ---
function initReminders() {
    const modal = document.getElementById('reminder-modal');
    const openBtn = document.querySelector('.reminders-button');
    const cancelBtn = document.getElementById('cancel-reminder-btn');
    const saveBtn = document.getElementById('save-reminder-btn');

    if(openBtn) {
        openBtn.addEventListener('click', () => {
            if(modal) {
                modal.style.display = 'flex';
                loadSavedReminders(); 
            }
        });
    }

    if(cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if(modal) modal.style.display = 'none';
        });
    }

    if(saveBtn) {
        saveBtn.addEventListener('click', () => {
            requestNotificationPermission().then(granted => {
                if (granted) {
                    saveReminders();
                    if(modal) modal.style.display = 'none';
                    alert("Reminders set!");
                } else {
                    alert("You must allow notifications.");
                }
            });
        });
    }
    setInterval(checkReminders, 60000);
}

function requestNotificationPermission() {
    if (!("Notification" in window)) return Promise.resolve(false);
    return Notification.requestPermission().then(permission => permission === "granted");
}

function saveReminders() {
    const reminders = {
        breakfast: document.getElementById('time-breakfast').value,
        lunch: document.getElementById('time-lunch').value,
        dinner: document.getElementById('time-dinner').value
    };
    localStorage.setItem('meal_reminders', JSON.stringify(reminders));
}

function loadSavedReminders() {
    const saved = localStorage.getItem('meal_reminders');
    if (saved) {
        const reminders = JSON.parse(saved);
        const bInput = document.getElementById('time-breakfast');
        const lInput = document.getElementById('time-lunch');
        const dInput = document.getElementById('time-dinner');
        if(bInput && reminders.breakfast) bInput.value = reminders.breakfast;
        if(lInput && reminders.lunch) lInput.value = reminders.lunch;
        if(dInput && reminders.dinner) dInput.value = reminders.dinner;
    }
}

function checkReminders() {
    const saved = localStorage.getItem('meal_reminders');
    if (!saved) return;
    const reminders = JSON.parse(saved);
    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMinute = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;

    if (reminders.breakfast === currentTime) sendNotification("Breakfast Time! 🍞", "Don't forget breakfast.");
    if (reminders.lunch === currentTime) sendNotification("Lunch Time! 🍱", "Re-energize with lunch.");
    if (reminders.dinner === currentTime) sendNotification("Dinner Time! 🥗", "Enjoy your dinner.");
}

function sendNotification(title, body) {
    if (Notification.permission === "granted") {
        new Notification("VITAHABIT", { body: body, icon: 'Assets/icon.png' });
    }
}


// --- INISIALISASI HALAMAN ---
const urlParams = new URLSearchParams(window.location.search);

// 1. HALAMAN KALENDER
if (document.querySelector('.day-selector')) {
    const today = new Date();
    updateHeaderDate(today); 
    updateDaySelector(); 
    setupMealSlotListeners(); 
    initReminders();
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const todayString = `${year}-${month}-${day}`;
            loadDailyCalories(todayString);
        }
    });
}
// 2. HALAMAN PILIH MAKANAN
else if (document.getElementById('meal-list-container')) {
    const type = urlParams.get('type'); 
    if (type) {
        const titleEl = document.getElementById('current-meal-type');
        if(titleEl) titleEl.innerText = type.charAt(0).toUpperCase() + type.slice(1);
        fetchFoodOptions(type);
    } else {
        fetchFoodOptions();
    }
}
// 3. HALAMAN DETAIL RESEP
else if (document.getElementById('recipe-image-placeholder')) {
    const id = urlParams.get('id'); 
    if (id) displayRecipeDetail(id);
}