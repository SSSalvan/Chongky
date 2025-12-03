const admin = require("firebase-admin");

// --- DEBUG & FORMAT Private Key ---
function formatPrivateKey(key) {
  if (!key) {
    console.error("❌ Private key is empty!");
    throw new Error("FIREBASE_PRIVATE_KEY environment variable is not set");
  }

  let rawKey = key.toString().trim();

  // Remove quotes
  rawKey = rawKey.replace(/^["']|["']$/g, '');

  // Replace escape sequences
  rawKey = rawKey.replace(/\\n/g, '\n');

  // CRITICAL: Bersihkan karakter yang tidak valid
  // Hapus spasi & tab di dalam key
  rawKey = rawKey
    .split('\n')
    .map(line => line.replace(/\s+$/, '')) // Hapus whitespace di akhir baris
    .filter(line => line.length > 0 || line === '') // Keep empty lines
    .join('\n');

  // Pastikan format PEM
  if (!rawKey.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error('Private key harus dimulai dengan: -----BEGIN PRIVATE KEY-----');
  }
  if (!rawKey.includes('-----END PRIVATE KEY-----')) {
    throw new Error('Private key harus diakhiri dengan: -----END PRIVATE KEY-----');
  }

  // Ekstrak hanya bagian base64
  const match = rawKey.match(/-----BEGIN PRIVATE KEY-----\s*([\s\S]*?)\s*-----END PRIVATE KEY-----/);
  if (!match || !match[1]) {
    throw new Error('Gagal mengekstrak private key dari format PEM');
  }

  const base64Content = match[1]
    .replace(/\s/g, '') // Hapus SEMUA whitespace
    .replace(/[\r\n]/g, ''); // Hapus newline

  // Validasi base64 (harus kelipatan 4)
  if (base64Content.length % 4 !== 0) {
    console.error(`❌ Base64 length ${base64Content.length} is not multiple of 4`);
    throw new Error('Private key base64 encoding is invalid');
  }

  // Reconstruct dengan format standar (64 chars per line)
  const formatted = base64Content.match(/.{1,64}/g).join('\n');
  const finalKey = `-----BEGIN PRIVATE KEY-----\n${formatted}\n-----END PRIVATE KEY-----`;

  console.log("✅ Private key formatted successfully!");
  console.log(`   Length: ${finalKey.length} bytes`);
  console.log(`   Base64 content: ${base64Content.length} chars`);

  return finalKey;
}

try {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    
    console.log("\n📝 Firebase Initialization Starting...\n");

    let privateKey;
    try {
      privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);
    } catch (e) {
      console.error('❌ Private Key Format Error:', e.message);
      throw e;
    }

    // Validasi
    if (!projectId || !clientEmail || !privateKey) {
      console.error("❌ Missing required config:");
      console.error("   PROJECT_ID:", projectId ? "✓" : "MISSING");
      console.error("   CLIENT_EMAIL:", clientEmail ? "✓" : "MISSING");
      console.error("   PRIVATE_KEY:", privateKey ? "✓" : "MISSING");
      throw new Error("Firebase configuration incomplete");
    }

    console.log("✅ Configuration Check:");
    console.log(`   Project ID: ${projectId}`);
    console.log(`   Client Email: ${clientEmail}`);
    console.log(`   Private Key: ${privateKey.length} bytes\n`);

    const credential = admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    });

    admin.initializeApp({
      credential,
    });

    console.log("✅✅✅ Firebase initialized successfully! ✅✅✅\n");
  }
} catch (error) {
  console.error("\n❌❌❌ Firebase Init Failed ❌❌❌");
  console.error("Error:", error.message);
  console.error("\nDEBUG INFO:");
  console.error("- Check if FIREBASE_PRIVATE_KEY is set correctly");
  console.error("- Copy from Firebase Console JSON file directly");
  console.error("- Do NOT modify the private key format");
  console.error("\n");
  process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth };