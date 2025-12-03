// api/firebase.js

const admin = require("firebase-admin");

let db = null;
let auth = null;

try {
  if (!admin.apps.length) {
    console.log("🔥 Initializing Firebase Admin...");

    let serviceAccount = null;

    // PRIORITY 1: BASE64
    if (process.env.FIREBASE_CREDENTIALS_BASE64) {
      try {
        const buffer = Buffer.from(process.env.FIREBASE_CREDENTIALS_BASE64, "base64");
        serviceAccount = JSON.parse(buffer.toString("utf8"));
        console.log("🔑 Loaded serviceAccount from Base64");
      } catch (e) {
        console.error("❌ Base64 parse error:", e.message);
      }
    }

    // PRIORITY 2: FIREBASE_SERVICE_ACCOUNT
    if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log("🔑 Loaded serviceAccount from FIREBASE_SERVICE_ACCOUNT");
      } catch (e) {
        console.error("❌ FIREBASE_SERVICE_ACCOUNT parse error:", e.message);
      }
    }

    if (!serviceAccount) {
      throw new Error("❌ No valid Firebase credentials found");
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    console.log("✅ Firebase initialized!");
  }

  db = admin.firestore();
  auth = admin.auth();

} catch (err) {
  console.error("❌ Firebase Initialization FAILED:", err.message);
}

module.exports = { admin, db, auth };
