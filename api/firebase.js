const admin = require("firebase-admin");

if (!admin.apps.length) {
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // 1. Membersihkan tanda kutip (") jika tidak sengaja ter-copy di awal/akhir
    try {
        // Jika formatnya JSON string (ada kutip di luar), kita parse dulu
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
             privateKey = JSON.parse(privateKey);
        }
    } catch (e) {
        // Jika gagal parse, kita manual remove kutipnya
        privateKey = privateKey.replace(/^"|"$/g, '');
    }

    // 2. Memperbaiki karakter baris baru (\n)
    // Mengganti literal string "\n" menjadi karakter enter yang asli
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