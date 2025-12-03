const admin = require("firebase-admin");

// Fungsi untuk membersihkan kunci private key yang "kotor"
function getCleanPrivateKey(key) {
  if (!key) return undefined;
  
  // 1. Ganti literal \n dengan enter asli
  let cleanKey = key.replace(/\\n/g, '\n');

  // 2. Hapus tanda kutip di awal/akhir jika ada
  cleanKey = cleanKey.replace(/^"|"$/g, '');

  // 3. Pastikan format PEM (Begin/End) benar & Hapus spasi kosong di sekitar
  const beginTag = "-----BEGIN PRIVATE KEY-----";
  const endTag = "-----END PRIVATE KEY-----";
  
  // Cari posisi tag
  const startIndex = cleanKey.indexOf(beginTag);
  const endIndex = cleanKey.indexOf(endTag);

  if (startIndex !== -1 && endIndex !== -1) {
    // Ambil hanya dari BEGIN sampai END
    cleanKey = cleanKey.substring(startIndex, endIndex + endTag.length);
  }
  
  return cleanKey;
}


if (!admin.apps.length) {
  try {
    const privateKey = getCleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY);
    
    // Debugging (Aman, tidak menampilkan kunci lengkap)
    if (privateKey) {
        console.log("Panjang Kunci Bersih:", privateKey.length);
        console.log("Karakter Terakhir Kunci:", JSON.stringify(privateKey.slice(-10)));
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    console.log("✅ Firebase berhasil connect!");
    
  } catch (error) {
    console.error("❌ Gagal Inisialisasi Firebase:", error.message);
    // Kita tidak melempar error di sini agar server tidak crash total,
    // tapi request database pasti akan gagal nanti.
  }
}

// Pastikan app sudah ada sebelum memanggil service
let db, auth;
try {
    db = admin.firestore();
    auth = admin.auth();
} catch (e) {
    // Jika init gagal di atas, ini akan error. 
    // Kita biarkan undefined, nanti route handler akan error 500 yang wajar.
    console.error("Gagal load service Firestore/Auth:", e.message);
}

module.exports = { db, auth };