const express = require('express');
const router = express.Router();
const { db, auth } = require('./firebase');
const admin = require('firebase-admin'); 

// Middleware Auth
router.use(async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split('Bearer ')[1];
    await auth.verifyIdToken(token);
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Forbidden' });
  }
});

// GET: Ambil Data Kalori
router.get('/', async (req, res) => {
  const { uid, date } = req.query;
  if (!uid || !date) return res.status(400).json({ message: 'Missing params' });
  
  try {
    const docRef = db.collection('users').doc(uid).collection('daily_logs').doc(date);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) return res.status(200).json({ totalCalories: 0 });
    
    const data = docSnap.data();
    const total = (data.foodList || []).reduce((acc, curr) => acc + (parseInt(curr.calories) || 0), 0);
    
    res.status(200).json({ totalCalories: total });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST: Tambah Makanan
router.post('/', async (req, res) => {
  const { uid, date } = req.query; // Ambil UID dari query (sesuai logika asli)
  const { calories, foodName, mealType } = req.body;
  
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    const docRef = db.collection('users').doc(uid).collection('daily_logs').doc(targetDate);

    await docRef.set({
      totalCalories: admin.firestore.FieldValue.increment(parseInt(calories)),
      lastUpdated: new Date(),
      foodList: admin.firestore.FieldValue.arrayUnion({
        name: foodName,
        calories: parseInt(calories),
        type: mealType,
        timestamp: new Date().toISOString()
      })
    }, { merge: true });

    res.status(200).json({ message: 'Success' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;