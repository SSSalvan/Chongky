const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

try {
  if (!admin.apps.length) {
    console.log("\n🔐 Initializing Firebase Admin SDK...\n");

    let serviceAccount;
    let configSource = "UNKNOWN";

    // CARA 1: Coba baca variable BASE64 (Cara paling stabil di Vercel)
    if (process.env.FIREBASE_CREDENTIALS_BASE64) {
      try {
        console.log("📝 Found Base64 credentials...");
        // Decode Base64 kembali ke format asli (String JSON)
        const buffer = Buffer.from(process.env.FIREBASE_CREDENTIALS_BASE64, 'base64');
        const jsonString = buffer.toString('utf-8');
        
        serviceAccount = JSON.parse(jsonString);
        configSource = "Environment Variable (Base64)";
        console.log("✅ Successfully decoded Base64 credentials");
      } catch (e) {
        console.error("❌ Failed to parse Base64 credentials:", e.message);
      }
    }

    // CARA 2: Coba cari file JSON (Untuk Local Development)
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
            console.log(`✅ Loaded config from local file`);
            break;
          } catch (e) { 
            /* abaikan error di local */ 
          }
        }
      }
    }

    // CARA 3: Fallback ke cara lama (3 variables) - Hanya jaga-jaga
    if (!serviceAccount && process.env.FIREBASE_PRIVATE_KEY) {
       console.log("📝 Fallback to legacy environment variables...");
       serviceAccount = {
         projectId: process.env.FIREBASE_PROJECT_ID,
         clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
         privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
       };
       configSource = "Legacy Environment Variables";
    }

    // VALIDASI AKHIR
    if (!serviceAccount) {
      throw new Error("No valid Firebase configuration found (Base64, JSON, or Env Vars)");
    }

    // Initialize Firebase
    console.log(`\n📊 Config Source: ${configSource}`);
    console.log(`   Project ID: ${serviceAccount.projectId}`);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("✅✅✅ Firebase initialized successfully! ✅✅✅\n");
  }
} catch (error) {
  console.error("\n❌❌❌ Firebase Init Failed ❌❌❌");
  console.error(error.message);
  // Jangan exit process agar server tidak crash total, tapi fitur DB akan mati
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth, admin };