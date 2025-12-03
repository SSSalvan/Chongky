const admin = require("firebase-admin");

// Mencegah inisialisasi ganda saat hot-reload
if (!admin.apps.length) {
  // Pastikan private key diformat dengan benar untuk Vercel (menangani baris baru \n)
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth };