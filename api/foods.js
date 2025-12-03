const express = require('express');
const router = express.Router();
const { db } = require('./firebase');

router.get('/', async (req, res) => {
  try {
    const { id, type, category } = req.query;

    // CASE A: Get single food by ID
    if (id) {
      const doc = await db.collection('fooditems').doc(id).get();
      if (!doc.exists) return res.status(404).json({ message: 'Food not found' });
      return res.status(200).json({ id: doc.id, ...doc.data() });
    }

    // CASE B: Get list of foods
    let query = db.collection('fooditems');
    
    const filterValue = type || category;
    if (filterValue) {
      query = query.where('mealType', '==', filterValue.toLowerCase());
    }

    const snapshot = await query.get();
    const foods = [];
    snapshot.forEach(doc => {
      foods.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json(foods);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;