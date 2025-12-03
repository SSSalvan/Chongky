const express = require('express');
const cors = require('cors');
const { admin, db, auth } = require('./firebase');   // ← FIX

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

/* -------------------------------
🔥 FIREBASE SERVICE ACCOUNT SETUP
--------------------------------*/

let serviceAccount = null;

try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("🔥 Firebase Admin Initialized!");
  }
} catch (err) {
  console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:", err);
}

// Firestore instance
const db = admin.firestore();
module.exports.db = db;

/* -------------------------------
🔥 ROUTES
--------------------------------*/
const communityRoute = require('./community');
const dashboardRoute = require('./dashboard');
const foodsRoute = require('./foods');
const mealRoute = require('./meal');
const sleepRoute = require('./sleep');
const statsRoute = require('./stats');
const usersRoute = require('./users');

// Test Route
app.get('/', (req, res) => {
  res.status(200).send('API Sleep Tracker Ready!');
});

// Register Routes
app.use('/api/community', communityRoute);
app.use('/api/dashboard', dashboardRoute);
app.use('/api/foods', foodsRoute);
app.use('/api/meal', mealRoute);
app.use('/api/sleep', sleepRoute);
app.use('/api/stats', statsRoute);
app.use('/api/users', usersRoute);

// 404
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

module.exports = app;