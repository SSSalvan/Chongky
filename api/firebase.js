const admin = require("firebase-admin");

// --- Helper Formatting Private Key (ROBUST VERSION) ---
function formatPrivateKey(key) {
  if (!key) return null;

  let rawKey = key.toString().trim();

  // 1. Buang quotes jika ada di awal/akhir
  rawKey = rawKey.replace(/^["']|["']$/g, '');

  // 2. Ganti escape sequence \n dengan newline asli
  rawKey = rawKey.replace(/\\n/g, '\n');

  // 3. Bersihkan whitespace aneh di akhir baris
  rawKey = rawKey
    .split('\n')
    .map(line => line.trim())
    .join('\n');

  // 4. Pastikan dimulai dengan header yang benar
  if (!rawKey.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error('Private key harus berformat PEM (BEGIN PRIVATE KEY)');
  }

  // 5. Pastikan diakhiri dengan footer
  if (!rawKey.includes('-----END PRIVATE KEY-----')) {
    throw new Error('Private key harus berformat PEM (END PRIVATE KEY)');
  }

  // 6. Hapus karakter extra di akhir
  rawKey = rawKey.replace(/\n+$/, '\n');

  return rawKey;
}

try {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    
    let privateKey;
    try {
      privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);
    } catch (e) {
      console.error('❌ Private Key Format Error:', e.message);
      throw e;
    }

    // Validasi Environment Variables
    if (!projectId || !clientEmail || !privateKey) {
      console.error("❌ Missing Env Vars:");
      console.error("   FIREBASE_PROJECT_ID:", projectId ? "✓" : "❌");
      console.error("   FIREBASE_CLIENT_EMAIL:", clientEmail ? "✓" : "❌");
      console.error("   FIREBASE_PRIVATE_KEY:", privateKey ? "✓" : "❌");
      throw new Error("Konfigurasi Firebase tidak lengkap.");
    }

    console.log("📝 Firebase Config Check:");
    console.log("   Project ID:", projectId);
    console.log("   Client Email:", clientEmail);
    console.log("   Private Key Length:", privateKey.length, "bytes");

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
  process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth };