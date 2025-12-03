const admin = require("firebase-admin");

if (!admin.apps.length) {
  // Ambil private key dari environment variable
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // 1. Hapus tanda kutip ganda (") di awal dan akhir jika ada
    // Ini menangani kasus jika Anda tidak sengaja meng-copy tanda kutip dari JSON
    privateKey = privateKey.replace(/^"|"$/g, '');

    // 2. Ganti karakter literal "\n" dengan baris baru yang asli
    // Ini sangat penting agar format RSA terbaca benar
    privateKey = privateKey.replace(/\\n/g, '\n');
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