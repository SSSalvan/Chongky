const admin = require("firebase-admin");

// --- Helper Formatting Private Key ---
function formatPrivateKey(key) {
  if (!key) return null;

  // 1. Buang tanda kutip di awal dan akhir jika ada (Penyebab utama error DER bytes)
  const rawKey = key.replace(/^"|"$/g, '');

  // 2. Ganti literal \n menjadi karakter baris baru (newline) asli
  //    Ini wajib karena di Vercel env var seringkali jadi satu baris panjang
  return rawKey.replace(/\\n/g, '\n');
}

try {
  // Cek agar tidak init double
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    // Panggil fungsi format di sini
    const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

    // Validasi Environment Variables
    if (!projectId || !clientEmail || !privateKey) {
      console.error("❌ Missing Env Vars: Cek PROJECT_ID, CLIENT_EMAIL, atau PRIVATE_KEY di Vercel.");
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
  // Kita throw error agar Vercel merestart function dan tidak menggantung
  throw error; 
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth };