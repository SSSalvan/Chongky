const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors()); // Mengizinkan akses dari frontend
app.use(express.json()); // Supaya bisa baca body JSON

// --- Import Route Handlers ---
// Pastikan file-file ini ada di folder api/ dan sudah diubah formatnya (lihat langkah 4)
const communityRoute = require('./community');
const dashboardRoute = require('./dashboard');
const foodsRoute = require('./foods');
const mealRoute = require('./meal');
const sleepRoute = require('./sleep');
const statsRoute = require('./stats');
const usersRoute = require('./users');

// --- Setup Routes ---
// URL akan menjadi: https://domain-anda.vercel.app/api/foods, dll.
app.use('/api/community', communityRoute);
app.use('/api/dashboard', dashboardRoute);
app.use('/api/foods', foodsRoute);
app.use('/api/meal', mealRoute);
app.use('/api/sleep', sleepRoute);
app.use('/api/stats', statsRoute);
app.use('/api/users', usersRoute);

// Test Route
app.get('/api', (req, res) => {
  res.send('API Sleep Tracker Berjalan!');
});

// Export app untuk Vercel
module.exports = app;