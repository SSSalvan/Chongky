const admin = require("firebase-admin");

// --- Helper Formatting Private Key ---
function formatPrivateKey(key) {
  if (!key) return null;

  // 1. Buang tanda kutip di awal dan akhir jika ada
  let rawKey = key.trim().replace(/^"|"$/g, '');

  // 2. Ganti literal \n menjadi karakter newline asli
  rawKey = rawKey.replace(/\\n/g, '\n');

  // 3. Pastikan format PEM yang benar
  if (!rawKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
    rawKey = '-----BEGIN PRIVATE KEY-----\n' + rawKey;
  }
  if (!rawKey.endsWith('-----END PRIVATE KEY-----')) {
    rawKey = rawKey + '\n-----END PRIVATE KEY-----';
  }

  return rawKey;
}

try {
  // Cek agar tidak init double
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

    // Validasi Environment Variables
    if (!projectId || !clientEmail || !privateKey) {
      console.error("❌ Missing Env Vars:");
      console.error("   - FIREBASE_PROJECT_ID:", projectId ? "✓" : "❌");
      console.error("   - FIREBASE_CLIENT_EMAIL:", clientEmail ? "✓" : "❌");
      console.error("   - FIREBASE_PRIVATE_KEY:", privateKey ? "✓" : "❌");
      throw new Error("Konfigurasi Firebase tidak lengkap.");
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
  throw error;
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth };