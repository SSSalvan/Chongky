// FILE: api/sleep.js
const { db, auth } = require('../firebase');

module.exports = async (req, res) => {
  // 1. Verifikasi Token (Satpam)
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

  const { uid, date } = req.query;

  // GET: Ambil Data Tidur per Tanggal
  if (req.method === 'GET') {
    if (!uid || !date) return res.status(400).json({ message: 'Missing params' });

    try {
      const docRef = db.collection('users').doc(uid).collection('sleep_logs').doc(date);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        // Return kosong tapi status 200 (agar frontend tau tidak ada data hari ini)
        return res.status(200).json({ found: false });
      }

      return res.status(200).json({ found: true, ...docSnap.data() });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST: Simpan Data Tidur Baru
  if (req.method === 'POST') {
    // Data dikirim dari frontend via Body
    const { score, durationHours, startTime, endTime, date: targetDate } = req.body;
    
    // Gunakan tanggal yang dikirim atau default hari ini
    const docDate = targetDate || new Date().toISOString().split('T')[0];

    try {
      const docRef = db.collection('users').doc(uid).collection('sleep_logs').doc(docDate);

      await docRef.set({
        date: docDate,
        score: parseInt(score),
        durationHours: parseFloat(durationHours),
        startTime: startTime, // String ISO format
        endTime: endTime,     // String ISO format
        timestamp: new Date().toISOString()
      });

      return res.status(200).json({ message: 'Sleep saved successfully' });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
};