const express = require('express');
const router = express.Router();
const { db, auth } = require('./firebase');

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

// GET: Ambil Data Tidur
router.get('/', async (req, res) => {
  const { uid, date } = req.query;
  if (!uid || !date) return res.status(400).json({ message: 'Missing params' });

  try {
    const docRef = db.collection('users').doc(uid).collection('sleep_logs').doc(date);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(200).json({ found: false });
    }

    res.status(200).json({ found: true, ...docSnap.data() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST: Simpan Data Tidur
router.post('/', async (req, res) => {
  const { uid } = req.query; // Asumsi UID dikirim via query atau perlu diambil dari token
  const { score, durationHours, startTime, endTime, date: targetDate } = req.body;
  
  const docDate = targetDate || new Date().toISOString().split('T')[0];

  try {
    // Pastikan UID ada. Jika tidak ada di query, harusnya diambil dari decoded token
    if (!uid) return res.status(400).json({message: "UID required"});

    const docRef = db.collection('users').doc(uid).collection('sleep_logs').doc(docDate);

    await docRef.set({
      date: docDate,
      score: parseInt(score),
      durationHours: parseFloat(durationHours),
      startTime: startTime,
      endTime: endTime,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ message: 'Sleep saved successfully' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;