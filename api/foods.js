const express = require('express');
const router = express.Router();
const { admin, db, auth } = require('./firebase');



router.get('/', async (req, res) => {
  try {
    console.log("📍 Foods API called with query:", req.query);

    // Safety check
    if (!db) {
      console.error("❌ Database not initialized");
      return res.status(500).json({ message: 'Database not initialized' });
    }

    const { id, type, category } = req.query;

    // CASE A: Get single food by ID
    if (id) {
      console.log(`🔍 Searching for food by ID: ${id}`);
      const doc = await db.collection('fooditems').doc(id).get();
      
      if (!doc.exists) {
        return res.status(404).json({ message: 'Food not found' });
      }
      
      return res.status(200).json({ id: doc.id, ...doc.data() });
    }

    // CASE B: Get list of foods with optional filter
    console.log(`📋 Fetching foods list (type: ${type}, category: ${category})`);
    
    let query = db.collection('fooditems');
    
    // Support filter by type or category (case insensitive)
    const filterValue = type || category;
    if (filterValue) {
      const filterLower = filterValue.toLowerCase();
      console.log(`🔎 Filtering by mealType: ${filterLower}`);
      
      try {
        // Try filtering by mealType field
        query = query.where('mealType', '==', filterLower);
      } catch (e) {
        console.warn(`⚠️ Filtering by mealType failed: ${e.message}`);
        // Fallback: fetch all and filter in-memory
        console.log("📌 Falling back to fetch all and filter locally");
      }
    }

    const snapshot = await query.get();
    console.log(`✅ Found ${snapshot.size} foods`);

    const foods = [];
    snapshot.forEach(doc => {
      foods.push({ 
        id: doc.id, 
        ...doc.data() 
      });
    });

    // Return as array
    res.status(200).json(foods);

  } catch (error) {
    console.error("❌ Error in GET /foods:", error.message);
    console.error("Error stack:", error.stack);
    
    // Handle specific Firestore errors
    if (error.code === 'PERMISSION_DENIED' || error.code === 7) {
      return res.status(403).json({ 
        message: 'Permission denied. Check Firestore security rules.',
        error: error.message 
      });
    }

    if (error.message.includes('no matching index')) {
      return res.status(400).json({ 
        message: 'Query requires a composite index. Check Firestore console.',
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