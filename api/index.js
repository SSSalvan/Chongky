const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors({ origin: true })); // Allow all origins (sesuaikan jika perlu keamanan lebih)
app.use(express.json());

// Import Routes
const communityRoute = require('./community');
const dashboardRoute = require('./dashboard');
const foodsRoute = require('./foods');
const mealRoute = require('./meal');
const sleepRoute = require('./sleep');
const statsRoute = require('./stats');
const usersRoute = require('./users');

// Test Route (Health Check)
app.get('/', (req, res) => {
  res.status(200).send('API Sleep Tracker Ready!');
});

console.log("🔥 ENV CHECK → FIREBASE_CREDENTIALS_BASE64:", 
  process.env.FIREBASE_CREDENTIALS_BASE64 ? "FOUND" : "NOT FOUND"
);

// Register Routes
app.use('/api/community', communityRoute);
app.use('/api/dashboard', dashboardRoute);
app.use('/api/foods', foodsRoute);
app.use('/api/meal', mealRoute);
app.use('/api/sleep', sleepRoute);
app.use('/api/stats', statsRoute);
app.use('/api/users', usersRoute);

// Error Handler Terakhir (Opsional tapi bagus)
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});


module.exports = app;