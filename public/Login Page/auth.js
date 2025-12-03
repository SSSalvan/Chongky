import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBYMuvPFOGnQhYUL5JKqVTMQIw_0_cy2ZI",
  authDomain: "sleeptrackermealplan.firebaseapp.com",
  projectId: "sleeptrackermealplan",
  storageBucket: "sleeptrackermealplan.firebasestorage.app",
  messagingSenderId: "926721645663",
  appId: "1:926721645663:web:e019bcb5b9c5f87d7a4fea",
  measurementId: "G-FFX27T8Z5T"
};

export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- AUTH STATE OBSERVER ---
onAuthStateChanged(auth, (user) => {
    const currentPage = window.location.pathname;
    
    if (user) {
        console.log("User logged in:", user.email);
        
        if (currentPage.includes("Login.html") || currentPage.includes("SignUp.html")) {
            if(!currentPage.includes("Questionnaire.html")) {
                 window.location.href = "../index_loggedIn.html";
            }
        }
    } else {
        console.log("No user logged in");
        if (currentPage.includes("index_loggedIn.html") || currentPage.includes("MealPlan.html")) {
            window.location.href = "index.html";
        }
    }
});

// --- 1. LOGIN LOGIC ---
const loginForm = document.getElementById('login-form'); 
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email-input').value;
        const password = document.getElementById('password-input').value;

        signInWithEmailAndPassword(auth, email, password)
            .then(() => {
                window.location.href = "../index_loggedIn.html";
            })
            .catch((error) => {
                alert("Login Failed: " + error.message);
            });
    });
}

// --- 2. SIGN UP LOGIC ---
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;

        createUserWithEmailAndPassword(auth, email, password)
            .then(async (userCredential) => {
                const user = userCredential.user;
                // Update Display Name di Auth Firebase
                await updateProfile(user, { displayName: name });
                // Redirect ke Questionnaire
                window.location.href = "Questionnaire.html";
            })
            .catch((error) => {
                alert("Sign Up Failed: " + error.message);
            });
    });
}

// --- 3. QUESTIONNAIRE LOGIC (UPDATED: LEWAT API) ---
const questForm = document.getElementById('questionnaire-form');
if (questForm) {
    questForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        // Ambil Token (KUNCI)
        const token = await user.getIdToken();

        const gender = document.getElementById('q-gender').value;
        const birthdate = document.getElementById('q-birthdate').value;
        const calories = parseInt(document.getElementById('q-calories').value);
        const sleepGoal = parseFloat(document.getElementById('q-sleep').value);

        // Data yang akan dikirim ke Backend
        const userData = {
            name: user.displayName,
            email: user.email,
            gender: gender,
            birthdate: birthdate,
            dailyCalories: calories,
            sleepGoalHours: sleepGoal
        };

        try {
            // GANTI: Tidak pakai setDoc, tapi fetch ke API
            const response = await fetch(`/api/users?id=${user.uid}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Bawa Kunci!
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Gagal menyimpan data via API");
            }

            alert("Profile Setup Complete!");
            window.location.href = "../index_loggedIn.html";
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("Error: " + error.message);
        }
    });
}

// --- 4. GOOGLE LOGIN LOGIC (UPDATED: LEWAT API) ---
const googleAuthProvider = new GoogleAuthProvider();
const googleLoginBtn = document.querySelector('button[aria-label="Login with Google"]');

if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        signInWithPopup(auth, googleAuthProvider)
            .then(async (result) => {
                const user = result.user;
                
                // Ambil Token (KUNCI)
                const token = await user.getIdToken();

                // GANTI: Cek user lewat API, bukan getDoc langsung
                try {
                    const response = await fetch(`/api/users?id=${user.uid}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}` // Bawa Kunci!
                        }
                    });

                    // Jika response OK (200), berarti user ada di DB -> Masuk Home
                    if (response.ok) {
                        window.location.href = "../index_loggedIn.html";
                    } else if (response.status === 404) {
                        // Jika 404, User baru -> Masuk Questionnaire
                        window.location.href = "Questionnaire.html";
                    } else {
                        throw new Error("Gagal mengecek user");
                    }

                } catch (err) {
                    console.error("API Error:", err);
                    alert("Terjadi kesalahan koneksi ke server.");
                }
            })
            .catch((error) => {
                alert("Google Login Failed: " + error.message);
            });
    });
}

// --- 5. LOGOUT LOGIC ---
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = "index.html";
        });
    });
}