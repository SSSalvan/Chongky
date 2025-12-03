const express = require('express');
const router = express.Router();
const { admin, db, auth } = require('./firebase');



router.get('/', async (req, res) => {
  try {
    console.log("\n📊 Dashboard API Request");
    
    // 1. Verify Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error("   ❌ Missing Bearer token");
      return res.status(401).json({ message: 'Unauthorized: Missing Token' });
    }

    const token = authHeader.split('Bearer ')[1];
    console.log(`   Token length: ${token.length}`);

    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
      console.log(`   ✅ Token verified for UID: ${decodedToken.uid}`);
    } catch (tokenError) {
      console.error(`   ❌ Token verification failed: ${tokenError.message}`);
      return res.status(401).json({ 
        message: 'Unauthorized: Invalid Token',
        error: tokenError.message 
      });
    }

    // 2. Extract UID from query
    const { uid } = req.query;
    if (!uid) {
      return res.status(400).json({ message: 'UID required' });
    }

    // 3. Security: Verify user can only access their own data
    if (uid !== decodedToken.uid) {
      console.warn(`   ⚠️ User ${decodedToken.uid} tried to access ${uid}'s data`);
      return res.status(403).json({ message: 'Forbidden: Cannot access other users data' });
    }

    console.log(`   Fetching dashboard for UID: ${uid}`);

    // 4. Get today's date
    const today = new Date().toISOString().split('T')[0];
    console.log(`   Date: ${today}`);

    // 5. Fetch daily log
    const docRef = db.collection('users').doc(uid).collection('daily_logs').doc(today);
    const docSnap = await docRef.get();

    let data = { foodList: [], totalCalories: 0 };

    if (docSnap.exists) {
      const docData = docSnap.data();
      data.foodList = docData.foodList || [];
      
      // Recalculate total calories
      data.totalCalories = data.foodList.reduce((acc, curr) => {
        return acc + (parseInt(curr.calories) || 0);
      }, 0);

      console.log(`   ✅ Found ${data.foodList.length} meals, total: ${data.totalCalories} kcal`);
    } else {
      console.log("   📭 No meals found for today");
    }

    res.status(200).json(data);

  } catch (error) {
    console.error("\n❌ Dashboard API Error:", error.message);
    console.error("   Code:", error.code);
    
    // Handle specific error codes
    if (error.code === 16) {
      return res.status(401).json({ 
        message: 'Authentication Error: Invalid Firebase credentials',
        error: error.message 
      });
    }

    if (error.code === 7) {
      return res.status(403).json({ 
        message: 'Permission Denied: Check Firestore security rules',
        error: error.message 
      });
    }

    res.status(500).json({ 
      message: 'Internal Server Error',
      error: error.message 
    });
  }
});

module.exports = router;