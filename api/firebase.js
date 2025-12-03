const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

try {
  // Cek agar tidak init double
  if (!admin.apps.length) {
    let serviceAccount;

    // PRIORITY 1: Cek file JSON di root project
    const jsonPaths = [
      path.join(process.cwd(), "firebase-config.json"),
      path.join(__dirname, "firebase-config.json"),
      path.join(__dirname, "../firebase-config.json"),
    ];

    let foundConfig = false;
    for (const jsonPath of jsonPaths) {
      try {
        if (fs.existsSync(jsonPath)) {
          serviceAccount = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
          console.log(`✅ Loaded Firebase config from: ${jsonPath}`);
          foundConfig = true;
          break;
        }
      } catch (e) {
        console.error(`❌ Error reading ${jsonPath}:`, e.message);
      }
    }

    // PRIORITY 2: Fallback ke environment variables
    if (!foundConfig) {
      console.log("📝 Loading Firebase config from environment variables...");

      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (!projectId || !clientEmail || !privateKey) {
        console.error("❌ Missing environment variables");
        throw new Error("Firebase configuration incomplete");
      }

      serviceAccount = {
        projectId,
        clientEmail,
        privateKey,
      };

      console.log("✅ Loaded Firebase config from environment variables");
    }

    // Validasi
    if (!serviceAccount || !serviceAccount.project_id || !serviceAccount.private_key) {
      throw new Error("Invalid Firebase service account configuration");
    }

    console.log("\n📊 Firebase Config Summary:");
    console.log(`   Project: ${serviceAccount.project_id}`);
    console.log(`   Email: ${serviceAccount.client_email}`);
    console.log(`   Key Type: ${serviceAccount.type}\n`);

    // Initialize Firebase dengan service account (untuk admin operations)
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("✅✅✅ Firebase Admin SDK initialized successfully! ✅✅✅\n");
  }
} catch (error) {
  console.error("\n❌❌❌ Firebase Initialization Failed ❌❌❌");
  console.error("Error:", error.message);
  console.error("\n💡 Solutions:");
  console.error("1. Place firebase-config.json in project root");
  console.error("2. OR set environment variables in Vercel/hosting");
  console.error("3. Ensure private key has correct \\n formatting\n");

  // Catat warning tapi jangan stop app
  console.warn("⚠️  Firebase initialization failed. Some features may not work.\n");
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth, admin };