const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

try {
  if (!admin.apps.length) {
    console.log("\n🔐 Initializing Firebase Admin SDK...\n");

    let serviceAccount;
    let configSource = "UNKNOWN";

    // CARA 1: Coba baca variable BASE64 (Utama)
    if (process.env.FIREBASE_CREDENTIALS_BASE64) {
      try {
        console.log("📝 Found Base64 credentials...");
        const buffer = Buffer.from(process.env.FIREBASE_CREDENTIALS_BASE64, 'base64');
        const jsonString = buffer.toString('utf-8');
        serviceAccount = JSON.parse(jsonString);
        configSource = "Environment Variable (Base64)";
        console.log("✅ Successfully decoded Base64 credentials");
      } catch (e) {
        console.error("❌ Failed to parse Base64 credentials:", e.message);
      }
    }

    // CARA 2: Fallback ke JSON File (Local)
    if (!serviceAccount) {
      const jsonPaths = [
        path.join(process.cwd(), "firebase-config.json"),
        path.join(__dirname, "firebase-config.json"),
      ];
      for (const jsonPath of jsonPaths) {
        if (fs.existsSync(jsonPath)) {
          try {
            serviceAccount = require(jsonPath);
            configSource = `JSON File: ${jsonPath}`;
            break;
          } catch (e) {}
        }
      }
    }

    // VALIDASI
    if (!serviceAccount) {
      throw new Error("No valid Firebase configuration found. Please set FIREBASE_CREDENTIALS_BASE64 in Vercel.");
    }

    // PASTIKAN MENGGUNAKAN project_id (snake_case)
    console.log(`\n📊 Config Source: ${configSource}`);
    console.log(`   Project ID: ${serviceAccount.project_id}`); // <<<--- FIXED HERE

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id // <<<--- FIXED HERE
    });

    console.log("✅✅✅ Firebase initialized successfully! ✅✅✅\n");
  }
} catch (error) {
  console.error("\n❌❌❌ Firebase Init Failed ❌❌❌");
  console.error(error.message);
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth, admin };