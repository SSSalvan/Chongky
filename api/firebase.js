const admin = require("firebase-admin");

// --- DEBUG CODE (Hapus nanti jika sudah fix) ---
console.log("--- DEBUG FIREBASE CONFIG ---");
console.log("Project ID:", process.env.FIREBASE_PROJECT_ID);
console.log("Client Email:", process.env.FIREBASE_CLIENT_EMAIL);
// Cek apakah key ada, dan cetak 10 karakter pertamanya saja untuk memastikan format
const key = process.env.FIREBASE_PRIVATE_KEY;
console.log("Private Key Status:", key ? `Ada (Panjang: ${key.length}, Awal: ${key.substring(0, 10)}...)` : "TIDAK DITEMUKAN");
console.log("-------------------------------");
// ----------------------------------------------

if (!admin.apps.length) {
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // Pembersihan format (kode yang sebelumnya sudah kita buat)
    privateKey = privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
  }

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