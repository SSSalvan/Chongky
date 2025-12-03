const express = require('express');
const router = express.Router();
const { db, auth } = require('./firebase');
const admin = require('firebase-admin');

router.get('/', async (req, res) => {
  // Verify Token
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

  // Get Stats Data
  try {
    const { uid, type } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6);
    const startStr = startDate.toISOString().split('T')[0];

    let collectionName = '';
    if (type === 'sleep') collectionName = 'sleep_logs';
    else if (type === 'calories') collectionName = 'daily_logs';
    else return res.status(400).json({ message: 'Invalid type' });

    const snapshot = await db.collection('users').doc(uid).collection(collectionName)
      .where(admin.firestore.FieldPath.documentId(), '>=', startStr)
      .orderBy(admin.firestore.FieldPath.documentId())
      .get();

    const data = [];
    snapshot.forEach(doc => {
      data.push({ date: doc.id, ...doc.data() });
    });

    res.status(200).json(data);

  } catch (error) {
    console.error(error); 
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;