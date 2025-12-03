const express = require('express');
const router = express.Router();
const { admin, db, auth } = require('./firebase');


// Middleware Auth
router.use(async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken; // Simpan user di request
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Forbidden' });
  }
});

// GET: Ambil Data Tidur
router.get('/', async (req, res) => {
  const { uid, date } = req.query;
  // Gunakan uid dari query, atau fallback ke uid dari token (req.user.uid)
  const targetUid = uid || req.user.uid; 
  
  if (!targetUid || !date) return res.status(400).json({ message: 'Missing params (uid/date)' });

  try {
    const docRef = db.collection('users').doc(targetUid).collection('sleep_logs').doc(date);
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
  const { uid } = req.query;
  const targetUid = uid || req.user.uid;

  const { score, durationHours, startTime, endTime, date } = req.body;
  const docDate = date || new Date().toISOString().split('T')[0];

  try {
    const docRef = db.collection('users').doc(targetUid).collection('sleep_logs').doc(docDate);

    await docRef.set({
      date: docDate,
      score: parseInt(score),
      durationHours: parseFloat(durationHours),
      startTime,
      endTime,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ message: 'Sleep saved successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;