const admin = require("firebase-admin");

// --- DEBUG CODE (Bisa dihapus nanti) ---
if (process.env.FIREBASE_PRIVATE_KEY) {
  console.log("Debug: Memeriksa kunci...");
}
// ---------------------------------------

if (!admin.apps.length) {
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // 1. Tangani baris baru (literal \n menjadi enter asli)
    privateKey = privateKey.replace(/\\n/g, '\n');

    // 2. TEKNIK BARU: Ekstrak hanya bagian kuncinya saja
    // Ini akan membuang tanda kutip, spasi, atau karakter aneh di luar blok kunci
    const match = privateKey.match(/-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/);
    
    if (match) {
        privateKey = match[0]; // Ambil hasil yang bersih
    } else {
        // Jika regex gagal (misal formatnya aneh sekali), coba bersihkan kutip manual
        privateKey = privateKey.replace(/^"|"$/g, '');
    }
  }

  try {
    admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
    });
    console.log("Firebase berhasil diinisialisasi!");
  } catch (error) {
    console.error("Gagal inisialisasi Firebase:", error);
  }
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth };