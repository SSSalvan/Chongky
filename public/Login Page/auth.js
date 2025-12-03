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

// Helper: Get API base URL (works from any page)
function getApiBaseUrl() {
  const currentHost = window.location.origin;
  return currentHost;
}

// Helper: Safe API call
async function apiCall(endpoint, options = {}) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const token = await user.getIdToken();
  const baseUrl = getApiBaseUrl();
  const fullUrl = `${baseUrl}${endpoint}`;

  console.log(`📡 API Call: ${fullUrl}`);
  console.log(`   Method: ${options.method || 'GET'}`);
  console.log(`   Token: ${token.substring(0, 20)}...`);

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers: { ...defaultHeaders, ...options.headers }
    });

    console.log(`   Status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`   ❌ Error:`, errorData);
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log(`   ✅ Success`);
    return data;
  } catch (error) {
    console.error(`   ❌ API Error:`, error.message);
    throw error;
  }
}

// --- AUTH STATE OBSERVER ---
onAuthStateChanged(auth, (user) => {
    const currentPage = window.location.pathname;
    console.log(`🔐 Auth State Changed`);
    console.log(`   Current Page: ${currentPage}`);
    console.log(`   User: ${user ? user.email : 'None'}`);
    
    if (user) {
        if (currentPage.includes("Login.html") || currentPage.includes("signup.html")) {
            if (!currentPage.includes("Questionnaire.html")) {
                console.log("   → Redirecting to home (user already logged in)");
                window.location.href = "/index_loggedIn.html";
            }
        }
    } else {
        if (currentPage.includes("index_loggedIn.html") || currentPage.includes("MealPlan.html")) {
            console.log("   → Redirecting to login (user not logged in)");
            window.location.href = "index.html";
        }
    }
});

// --- 1. LOGIN LOGIC ---
const loginForm = document.getElementById('login-form'); 
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email-input').value;
        const password = document.getElementById('password-input').value;

        try {
            console.log("🔐 Attempting login for:", email);
            const result = await signInWithEmailAndPassword(auth, email, password);
            console.log("✅ Login successful");
            window.location.href = "../index_loggedIn.html";
        } catch (error) {
            console.error("❌ Login failed:", error.message);
            alert("Login Failed: " + error.message);
        }
    });
}

// --- 2. SIGN UP LOGIC ---
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;

        try {
            console.log("📝 Attempting signup for:", email);
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Update Display Name
            console.log("   Updating profile with name:", name);
            await updateProfile(user, { displayName: name });
            
            console.log("✅ Signup successful");
            window.location.href = "Questionnaire.html";
        } catch (error) {
            console.error("❌ Signup failed:", error.message);
            alert("Sign Up Failed: " + error.message);
        }
    });
}

// --- 3. QUESTIONNAIRE LOGIC ---
const questForm = document.getElementById('questionnaire-form');
if (questForm) {
    questForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error("User not authenticated");
            }

            console.log("📋 Submitting questionnaire for user:", user.uid);

            const gender = document.getElementById('q-gender').value;
            const birthdate = document.getElementById('q-birthdate').value;
            const calories = parseInt(document.getElementById('q-calories').value);
            const sleepGoal = parseFloat(document.getElementById('q-sleep').value);

            const userData = {
                name: user.displayName || "User",
                email: user.email,
                gender: gender,
                birthdate: birthdate,
                dailyCalories: calories,
                sleepGoalHours: sleepGoal
            };

            console.log("   Data:", userData);

            // Save via API
            await apiCall(`/api/users?id=${user.uid}`, {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            console.log("✅ Profile saved successfully");
            alert("Profile Setup Complete!");
            window.location.href = "../index_loggedIn.html";
        } catch (error) {
            console.error("❌ Questionnaire error:", error.message);
            alert("Error: " + error.message);
        }
    });
}

// --- 4. GOOGLE LOGIN LOGIC ---
const googleAuthProvider = new GoogleAuthProvider();
const googleLoginBtn = document.querySelector('button[aria-label="Login with Google"]');

if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        try {
            console.log("🔐 Attempting Google login...");
            const result = await signInWithPopup(auth, googleAuthProvider);
            const user = result.user;
            console.log("   Google user:", user.email);

            // Check if user exists in database
            try {
                console.log("   Checking if user profile exists...");
                const data = await apiCall(`/api/users?id=${user.uid}`, {
                    method: 'GET'
                });

                console.log("✅ User profile exists, redirecting to home");
                window.location.href = "../index_loggedIn.html";
            } catch (error) {
                if (error.message.includes("404")) {
                    console.log("   User profile not found, redirecting to questionnaire");
                    window.location.href = "Questionnaire.html";
                } else {
                    throw error;
                }
            }
        } catch (error) {
            console.error("❌ Google login failed:", error.message);
            alert("Google Login Failed: " + error.message);
        }
    });
}

// --- 5. LOGOUT LOGIC ---
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            console.log("🚪 Logging out...");
            await signOut(auth);
            console.log("✅ Logout successful");
            window.location.href = "index.html";
        } catch (error) {
            console.error("❌ Logout failed:", error.message);
            alert("Logout Failed: " + error.message);
        }
    });
}