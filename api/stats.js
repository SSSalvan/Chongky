const express = require('express');
const router = express.Router();
const { db, auth, admin } = require('./index');


router.get('/', async (req, res) => {
  try {
    console.log("\n📊 Stats API Request:");
    console.log("   Headers:", Object.keys(req.headers));
    console.log("   Authorization:", req.headers.authorization ? "Present" : "Missing");
    
    // 1. Verify Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error("❌ Missing or invalid Bearer token");
      return res.status(401).json({ 
        message: 'Unauthorized: Missing Bearer token',
        code: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.split('Bearer ')[1];
    console.log("   Token length:", token.length);
    
    let decodedToken;
    
    try {
      decodedToken = await auth.verifyIdToken(token);
      console.log("✅ Token verified for UID:", decodedToken.uid);
    } catch (tokenError) {
      console.error("❌ Token verification failed:", tokenError.message);
      return res.status(401).json({ 
        message: 'Unauthorized: Invalid or expired token',
        code: 'INVALID_TOKEN',
        error: tokenError.message
      });
    }

    // 2. Extract params
    const { uid, type } = req.query;
    
    if (!uid) {
      return res.status(400).json({ 
        message: 'Bad Request: uid parameter required',
        code: 'MISSING_UID'
      });
    }

    if (!type || !['sleep', 'calories'].includes(type)) {
      return res.status(400).json({ 
        message: 'Bad Request: type must be "sleep" or "calories"',
        code: 'INVALID_TYPE'
      });
    }

    console.log(`📊 Stats request - UID: ${uid}, Type: ${type}, Token UID: ${decodedToken.uid}`);

    // 3. Security: Pastikan user hanya bisa akses data mereka sendiri
    if (uid !== decodedToken.uid) {
      console.warn(`⚠️  User ${decodedToken.uid} tried to access ${uid}'s data`);
      return res.status(403).json({ 
        message: 'Forbidden: Cannot access other users data',
        code: 'UNAUTHORIZED_ACCESS'
      });
    }

    // 4. Calculate date range (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6);
    const startStr = startDate.toISOString().split('T')[0];

    console.log(`📅 Date range: ${startStr} to ${new Date().toISOString().split('T')[0]}`);

    // 5. Determine collection name
    const collectionName = type === 'sleep' ? 'sleep_logs' : 'daily_logs';

    // 6. Query data
    const snapshot = await db
      .collection('users')
      .doc(uid)
      .collection(collectionName)
      .where(admin.firestore.FieldPath.documentId(), '>=', startStr)
      .orderBy(admin.firestore.FieldPath.documentId())
      .get();

    const data = [];
    snapshot.forEach(doc => {
      data.push({ 
        date: doc.id, 
        ...doc.data() 
      });
    });

    console.log(`✅ Retrieved ${data.length} records from ${collectionName}`);

    // Return as array directly untuk compatibility
    res.status(200).json(data);

  } catch (error) {
    console.error("❌ Stats API Error:", error);
    
    // Handle specific Firestore errors
    if (error.code === 16) {
      return res.status(401).json({ 
        message: 'Authentication Error: Invalid Firebase credentials',
        code: 'AUTH_ERROR',
        details: error.message
      });
    }

    if (error.code === 7) { // PERMISSION_DENIED
      return res.status(403).json({ 
        message: 'Permission Denied: Check Firestore security rules',
        code: 'PERMISSION_DENIED',
        details: error.message
      });
    }

    res.status(500).json({ 
      message: 'Internal Server Error',
      code: 'SERVER_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Unknown error'
    });
  }
});

module.exports = router;