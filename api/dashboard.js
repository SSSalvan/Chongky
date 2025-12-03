const express = require('express');
const router = express.Router();
const { db, auth } = require('./firebase');

router.get('/', async (req, res) => {
  try {
    // 1. Verifikasi Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Missing Token' });
    }
    const token = authHeader.split('Bearer ')[1];
    await auth.verifyIdToken(token);

    // 2. Ambil Data Dashboard
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ message: 'UID required' });

    const today = new Date().toISOString().split('T')[0];
    const docRef = db.collection('users').doc(uid).collection('daily_logs').doc(today);
    const docSnap = await docRef.get();

    let data = { foodList: [], totalCalories: 0 };

    if (docSnap.exists) {
      const docData = docSnap.data();
      data.foodList = docData.foodList || [];
      // Hitung ulang total kalori untuk memastikan akurasi
      data.totalCalories = data.foodList.reduce((acc, curr) => acc + (parseInt(curr.calories) || 0), 0);
    }

    res.status(200).json(data);

  } catch (error) {
    console.error("Dashboard Error:", error);
    // Handle error auth spesifik
    if (error.code && error.code.startsWith('auth/')) {
      return res.status(403).json({ message: 'Forbidden: Invalid Token' });
    }
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;