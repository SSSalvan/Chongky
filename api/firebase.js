const admin = require("firebase-admin");

function formatPrivateKey(key) {
  if (!key) return null;

  // 1. Bersihkan semua tanda kutip ganda jika ada
  let rawKey = key.replace(/"/g, '');

  // 2. Definisikan Header dan Footer standar
  const header = "-----BEGIN PRIVATE KEY-----";
  const footer = "-----END PRIVATE KEY-----";

  // 3. Jika kunci tidak memiliki header/footer, anggap itu sudah rusak atau format lain
  if (!rawKey.includes(header) || !rawKey.includes(footer)) {
    // Kembalikan apa adanya dengan perbaikan baris baru standar sebagai fallback
    return rawKey.replace(/\\n/g, '\n');
  }

  // 4. Ektrak HANYA bagian Base64 (isi kuncinya)
  // Kita buang header, footer, spasi, dan enter lama untuk mendapatkan string bersih
  const content = rawKey
    .replace(header, "")
    .replace(footer, "")
    .replace(/\\n/g, "") // Hapus literal \n
    .replace(/\s/g, ""); // Hapus semua spasi/enter asli

  // 5. Susun ulang kunci dengan format yang DIJAMIN benar
  // Header + Enter + Isi Bersih + Enter + Footer
  return `${header}\n${content}\n${footer}\n`;
}

if (!admin.apps.length) {
  try {
    const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);
    
    if (!privateKey) throw new Error("Private Key tidak ditemukan di Environment Variables");

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    console.log("✅ Firebase berhasil diinisialisasi ulang!");
    
  } catch (error) {
    console.error("❌ Gagal Inisialisasi Firebase (Critical):", error.message);
    // Log error detail untuk debugging di Vercel
    if (error.errorInfo) console.error(JSON.stringify(error.errorInfo));
  }
}

// Inisialisasi service
// Gunakan try-catch agar jika init gagal, export tidak langsung crash saat require
let db, auth;
try {
  db = admin.firestore();
  auth = admin.auth();
} catch (e) {
  console.error("Service Firestore/Auth belum siap:", e.message);
}

module.exports = { db, auth };