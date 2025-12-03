const express = require('express');
const router = express.Router();
const { db, auth } = require('./firebase');

// Helper untuk verify token (opsional untuk GET)
const getUser = async (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      return await auth.verifyIdToken(token);
    }
  } catch (error) {
    console.warn("⚠️ Token verification failed:", error.message);
    return null;
  }
  return null;
};

// --- GET: Ambil Semua Postingan ---
router.get('/', async (req, res) => {
  try {
    console.log("📝 Fetching all posts...");

    if (!db) {
      return res.status(500).json({ message: 'Database not initialized' });
    }

    const postsRef = db.collection('posts').orderBy('timestamp', 'desc');
    const snapshot = await postsRef.get();
    
    console.log(`✅ Found ${snapshot.size} posts`);

    const posts = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const timestamp = data.timestamp ? data.timestamp.toDate?.() : new Date();
      
      posts.push({
        id: doc.id,
        ...data,
        timestamp: timestamp.toISOString()
      });
    });

    // Return as array directly
    res.status(200).json(posts);

  } catch (error) {
    console.error("❌ Error in GET /posts:", error.message);
    
    if (error.message.includes('index')) {
      return res.status(400).json({ 
        message: 'Missing Firestore index for sorting. Check Firestore console.',
        error: error.message 
      });
    }

    res.status(500).json({ 
      message: 'Error fetching posts',
      error: error.message 
    });
  }
});

// --- POST: Buat Postingan Baru ---
router.post('/', async (req, res) => {
  try {
    console.log("✏️ Creating new post...");

    const user = await getUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: Please login' });
    }

    const { postContent, userName, userAvatarUrl } = req.body;
    
    if (!postContent || postContent.trim().length === 0) {
      return res.status(400).json({ message: 'Post content cannot be empty' });
    }

    const newPost = {
      postContent: postContent.trim(),
      userId: user.uid,
      userName: userName || user.email || 'Anonymous',
      userAvatarUrl: userAvatarUrl || null,
      timestamp: new Date(),
      isLiked: false
    };

    const docRef = await db.collection('posts').add(newPost);
    console.log(`✅ Post created with ID: ${docRef.id}`);

    res.status(201).json({ 
      message: 'Post created successfully',
      postId: docRef.id
    });

  } catch (error) {
    console.error("❌ Error in POST /posts:", error.message);
    res.status(500).json({ 
      message: 'Error creating post',
      error: error.message 
    });
  }
});

// --- DELETE: Hapus Postingan ---
router.delete('/', async (req, res) => {
  try {
    console.log("🗑️ Deleting post...");

    const user = await getUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: Please login' });
    }

    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ message: 'Post ID required' });
    }

    const docRef = db.collection('posts').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check ownership
    if (docSnap.data().userId !== user.uid) {
      console.warn(`⚠️ User ${user.uid} tried to delete post by ${docSnap.data().userId}`);
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }

    await docRef.delete();
    console.log(`✅ Post ${id} deleted`);

    res.status(200).json({ message: 'Post deleted successfully' });

  } catch (error) {
    console.error("❌ Error in DELETE /posts:", error.message);
    res.status(500).json({ 
      message: 'Error deleting post',
      error: error.message 
    });
  }
});

module.exports = router;