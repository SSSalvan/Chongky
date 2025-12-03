const express = require('express');
const router = express.Router();
const { db, auth, admin } = require('./index');

// Middleware: Verify Token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split('Bearer ')[1];
    req.user = await auth.verifyIdToken(token);
    next();
  } catch (error) {
    console.error("Auth Error:", error.message);
    return res.status(403).json({ message: 'Forbidden', error: error.message });
  }
};

// Terapkan middleware ke semua rute DI BAWAH baris ini
router.use(verifyToken);

// GET: Get user info
router.get('/', async (req, res) => {
  try {
    const { id } = req.query;
    if (id) {
      const doc = await db.collection('users').doc(id).get();
      if (!doc.exists) return res.status(404).json({ message: 'User not found' });
      return res.status(200).json({ id: doc.id, ...doc.data() });
    }
    
    // Hati-hati mengambil semua user di production!
    const snap = await db.collection('users').get();
    const data = [];
    snap.forEach(d => data.push({ id: d.id, ...d.data() }));
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST: Create/Overwrite User
router.post('/', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ message: 'Query id required' });
    
    const { name, email, ...otherData } = req.body || {};
    
    const userRef = db.collection('users').doc(id);
    const doc = await userRef.get();
    
    if (doc.exists) {
      return res.status(409).json({ message: `User ${id} already exists` });
    }

    await userRef.set({
      id,
      name: name || 'No Name',
      email: email || req.user.email || null, // Ambil dari token jika body kosong
      createdAt: new Date().toISOString(),
      ...otherData
    });

    res.status(201).json({ message: 'User created', id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH: Update user
router.patch('/', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ message: 'Query id required' });
    
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: 'Body cannot be empty' });
    }

    await db.collection('users').doc(id).update(req.body);
    res.status(200).json({ message: 'User updated' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;