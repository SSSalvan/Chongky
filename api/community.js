// FILE: api/community.js
const { db, auth } = require('../firebase');

module.exports = async (req, res) => {
  // 1. Verifikasi Token (Satpam) - Wajib ada user login
  // Kecuali method GET (Jika kamu ingin orang asing bisa baca post)
  // Tapi biar aman, kita kunci semua saja.
  let user = null;
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await auth.verifyIdToken(token);
      user = decodedToken;
    }
  } catch (error) {
    // Token invalid/expired
  }

  // Jika method bukan GET, User WAJIB Login
  if (req.method !== 'GET' && !user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // --- GET: Ambil Semua Postingan ---
  if (req.method === 'GET') {
    try {
      const postsRef = db.collection('posts').orderBy('timestamp', 'desc');
      const snapshot = await postsRef.get();
      
      const posts = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        // Konversi Timestamp Firestore ke String ISO agar bisa dibaca JSON
        const date = data.timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString();
        
        posts.push({
          id: doc.id,
          ...data,
          timestamp: date 
        });
      });

      return res.status(200).json(posts);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // --- POST: Buat Postingan Baru ---
  if (req.method === 'POST') {
    const { postContent, userName, userAvatarUrl } = req.body;
    
    if (!postContent) return res.status(400).json({ message: 'Content empty' });

    try {
      const newPost = {
        postContent,
        userId: user.uid, // Ambil dari token, jangan dari body (agar tidak bisa dipalsukan)
        userName: userName || 'Anonymous',
        userAvatarUrl: userAvatarUrl || null,
        timestamp: new Date(), // Simpan sebagai Date object di Server
        isLiked: false
      };

      await db.collection('posts').add(newPost);
      return res.status(201).json({ message: 'Post created' });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // --- DELETE: Hapus Postingan ---
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ message: 'ID required' });

    try {
      const docRef = db.collection('posts').doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) return res.status(404).json({ message: 'Post not found' });

      // Cek Kepemilikan: Hanya pemilik post yang boleh hapus
      if (docSnap.data().userId !== user.uid) {
        return res.status(403).json({ message: 'Forbidden: Not your post' });
      }

      await docRef.delete();
      return res.status(200).json({ message: 'Post deleted' });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
};