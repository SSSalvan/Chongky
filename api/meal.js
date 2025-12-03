// FILE: api/meals.js
const { admin, db, auth } = require('./firebase');


module.exports = async (req, res) => {
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

  const { uid, date } = req.query;
  
  // GET: Ambil Data Kalori Tanggal Tertentu (Buat Kalender)
  if (req.method === 'GET') {
    if (!uid || !date) return res.status(400).json({ message: 'Missing params' });
    
    try {
      const docRef = db.collection('users').doc(uid).collection('daily_logs').doc(date);
      const docSnap = await docRef.get();
      
      if (!docSnap.exists) return res.status(200).json({ totalCalories: 0 });
      
      const data = docSnap.data();
      // Prioritaskan hitung ulang dari array foodList agar akurat
      const total = (data.foodList || []).reduce((acc, curr) => acc + (parseInt(curr.calories) || 0), 0);
      
      return res.status(200).json({ totalCalories: total });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST: Tambah Makanan Baru (Add to Log)
  if (req.method === 'POST') {
    const { calories, foodName, mealType } = req.body;
    
    // Default ke hari ini jika tanggal tidak dikirim
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      const docRef = db.collection('users').doc(uid).collection('daily_logs').doc(targetDate);

      // Gunakan Atomicity Firestore Admin SDK
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

      return res.status(200).json({ message: 'Success' });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
};