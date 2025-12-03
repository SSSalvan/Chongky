const admin = require("firebase-admin");

// Fungsi helper untuk memformat Private Key (Penting untuk Vercel)
function formatPrivateKey(key) {
  if (!key) return null;
  return key.replace(/\\n/g, '\n'); // Mengubah literal \n menjadi newline asli
}

try {
  // Cek apakah Firebase sudah di-init sebelumnya (untuk mencegah double-init di serverless)
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

    // Validasi ketat: Jika env var hilang, stop proses sekarang.
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Missing Firebase Environment Variables (PROJECT_ID, CLIENT_EMAIL, or PRIVATE_KEY)");
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log("✅ Firebase initialized successfully");
  }
} catch (error) {
  console.error("❌ Firebase Init Error:", error.message);
  // Di Vercel, kita biarkan ini throw agar deployment gagal & kita sadar ada yang salah
  throw error; 
}

// Export langsung (karena jika sampai sini, admin pasti sudah ready)
const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth };