const express = require('express');
const router = express.Router();
const { db, auth } = require('./firebase');

router.get('/', async (req, res) => {
  // 1. Verifikasi Token
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split('Bearer ')[1];
    await auth.verifyIdToken(token); 
  } catch (error) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  // 2. Ambil Data Dashboard
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ message: 'UID required' });

    const today = new Date().toISOString().split('T')[0];
    const docRef = db.collection('users').doc(uid).collection('daily_logs').doc(today);
    const docSnap = await docRef.get();

    let data = { foodList: [], totalCalories: 0 };

    if (docSnap.exists) {
      const docData = docSnap.data();
      data.foodList = docData.foodList || [];
      data.totalCalories = data.foodList.reduce((acc, curr) => acc + (parseInt(curr.calories) || 0), 0);
    }

    res.status(200).json(data);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;