const express = require('express');
const router = express.Router();
const { db, auth } = require('./firebase');

// Helper: Verify Token Middleware
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Unauthorized');
    }
    const token = authHeader.split('Bearer ')[1];
    req.user = await auth.verifyIdToken(token);
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized: No valid token' });
  }
};

router.use(verifyToken);

// GET: List users or get single user
router.get('/', async (req, res) => {
  try {
    const { id } = req.query;
    if (id) {
      const doc = await db.collection('users').doc(id).get();
      if (!doc.exists) return res.status(404).json({ message: 'User not found' });
      return res.status(200).json({ id: doc.id, ...doc.data() });
    }

    const snap = await db.collection('users').get();
    const data = [];
    snap.forEach(d => data.push({ id: d.id, ...d.data() }));
    res.status(200).json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST: Create new user
router.post('/', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ message: 'Query id required, example ?id=7' });
    
    const { name, status, email, ...otherData } = req.body || {};
    if (!name) return res.status(400).json({ message: 'Field name is required' });

    const ref = db.collection('users').doc(id);
    if ((await ref.get()).exists) {
      return res.status(409).json({ message: `User ${id} already exists` });
    }

    await ref.set({
      id,
      name,
      status: status || 'active',
      email: email || null,
      createdAt: Date.now(),
      ...otherData
    });

    res.status(201).json({ message: 'User created', id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PATCH: Update user
router.patch('/', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ message: 'Query id required' });
    
    const body = req.body || {};
    if (!Object.keys(body).length) {
      return res.status(400).json({ message: 'Body cannot be empty' });
    }

    await db.collection('users').doc(id).update(body);
    res.status(200).json({ message: `User ${id} updated`, data: body });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE: Delete user
router.delete('/', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ message: 'Query id required' });
    
    await db.collection('users').doc(id).delete();
    res.status(200).json({ message: `User ${id} deleted` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;