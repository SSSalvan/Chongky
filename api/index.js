// ==========================================
// API Index - Clean Version (NO DUPLICATE INIT)
// ==========================================

const express = require('express');
const cors = require('cors');

// Ambil admin, db, auth dari firebase.js (satu-satunya tempat init)
const { admin, db, auth } = require('./firebase');

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// ------------------------------------------
// ROUTES
// ------------------------------------------
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

// Register API Routes
app.use('/api/community', communityRoute);
app.use('/api/dashboard', dashboardRoute);
app.use('/api/foods', foodsRoute);
app.use('/api/meal', mealRoute);
app.use('/api/sleep', sleepRoute);
app.use('/api/stats', statsRoute);
app.use('/api/users', usersRoute);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

module.exports = app;
