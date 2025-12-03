const express = require('express');
const router = express.Router();
const { db, auth } = require('./firebase');

// Middleware untuk cek Auth (Opsional untuk GET, Wajib untuk POST/DELETE)
const getUser = async (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      return await auth.verifyIdToken(token);
    }
  } catch (error) {
    return null;
  }
  return null;
};

// --- GET: Ambil Semua Postingan ---
router.get('/', async (req, res) => {
  try {
    const postsRef = db.collection('posts').orderBy('timestamp', 'desc');
    const snapshot = await postsRef.get();
    
    const posts = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const date = data.timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString();
      
      posts.push({
        id: doc.id,
        ...data,
        timestamp: date 
      });
    });

    res.status(200).json(posts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- POST: Buat Postingan Baru ---
router.post('/', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const { postContent, userName, userAvatarUrl } = req.body;
  if (!postContent) return res.status(400).json({ message: 'Content empty' });

  try {
    const newPost = {
      postContent,
      userId: user.uid,
      userName: userName || 'Anonymous',
      userAvatarUrl: userAvatarUrl || null,
      timestamp: new Date(),
      isLiked: false
    };

    await db.collection('posts').add(newPost);
    res.status(201).json({ message: 'Post created' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- DELETE: Hapus Postingan ---
router.delete('/', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ message: 'ID required' });

  try {
    const docRef = db.collection('posts').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) return res.status(404).json({ message: 'Post not found' });

    // Cek Kepemilikan
    if (docSnap.data().userId !== user.uid) {
      return res.status(403).json({ message: 'Forbidden: Not your post' });
    }

    await docRef.delete();
    res.status(200).json({ message: 'Post deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;