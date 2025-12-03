const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

try {
  if (!admin.apps.length) {
    console.log("\n🔐 Initializing Firebase Admin SDK...\n");

    let serviceAccount;
    let configSource = "UNKNOWN";

    // STEP 1: Try to use JSON file (most reliable)
    const jsonPaths = [
      path.join(process.cwd(), "firebase-config.json"),
      path.join(__dirname, "firebase-config.json"),
      path.join(__dirname, "../firebase-config.json"),
    ];

    for (const jsonPath of jsonPaths) {
      try {
        if (fs.existsSync(jsonPath)) {
          const rawContent = fs.readFileSync(jsonPath, "utf8");
          serviceAccount = JSON.parse(rawContent);
          configSource = `JSON File: ${jsonPath}`;
          console.log(`✅ Loaded Firebase config from JSON file`);
          console.log(`   Path: ${jsonPath}`);
          break;
        }
      } catch (e) {
        console.error(`⚠️ Error reading ${jsonPath}:`, e.message);
      }
    }

    // STEP 2: Fallback to environment variables
    if (!serviceAccount) {
      console.log("📝 JSON not found, trying environment variables...");

      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (!projectId || !clientEmail || !privateKey) {
        console.error("\n❌ Missing environment variables:");
        console.error("   FIREBASE_PROJECT_ID:", projectId ? "✓" : "❌ MISSING");
        console.error("   FIREBASE_CLIENT_EMAIL:", clientEmail ? "✓" : "❌ MISSING");
        console.error("   FIREBASE_PRIVATE_KEY:", privateKey ? "✓" : "❌ MISSING");
        throw new Error("Firebase configuration incomplete");
      }

      // Bersihkan private key
      let cleanPrivateKey = privateKey
        .toString()
        .trim()
        .replace(/^["']|["']$/g, '')
        .replace(/\\n/g, '\n');

      serviceAccount = {
        projectId,
        clientEmail,
        privateKey: cleanPrivateKey,
      };
      configSource = "Environment Variables";
      console.log("✅ Using environment variables");
    }

    // STEP 3: Validate service account
    if (!serviceAccount || !serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      console.error("\n❌ Invalid service account configuration");
      console.error("   projectId:", serviceAccount?.projectId ? "✓" : "❌");
      console.error("   clientEmail:", serviceAccount?.clientEmail ? "✓" : "❌");
      console.error("   privateKey:", serviceAccount?.privateKey ? "✓" : "❌");
      throw new Error("Service account validation failed");
    }

    // STEP 4: Initialize Firebase Admin SDK
    console.log("\n📊 Configuration Summary:");
    console.log(`   Source: ${configSource}`);
    console.log(`   Project ID: ${serviceAccount.projectId}`);
    console.log(`   Client Email: ${serviceAccount.clientEmail}`);
    console.log(`   Private Key Length: ${serviceAccount.privateKey.length} bytes`);

    // Check private key format
    if (!serviceAccount.privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
      throw new Error("Private key missing PEM header");
    }
    if (!serviceAccount.privateKey.includes("-----END PRIVATE KEY-----")) {
      throw new Error("Private key missing PEM footer");
    }

    console.log(`   ✅ Private key format valid\n`);

    // Initialize with cert
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.projectId,
    });

    console.log("✅✅✅ Firebase Admin SDK initialized successfully! ✅✅✅\n");

    // Test connection
    const db = admin.firestore();
    const auth = admin.auth();
    
    console.log("🧪 Testing Firestore connection...");
    // Don't actually query, just create references
    console.log("   ✅ Firestore reference created");
    console.log("   ✅ Auth reference created\n");

  }
} catch (error) {
  console.error("\n❌❌❌ Firebase Initialization Failed ❌❌❌\n");
  console.error("Error:", error.message);
  console.error("\n💡 Solutions:");
  console.error("1. RECOMMENDED: Place firebase-config.json in project root");
  console.error("2. Verify firebase-config.json contains valid JSON");
  console.error("3. Ensure private_key has proper \\n line breaks");
  console.error("4. Generate NEW service account from Firebase Console");
  console.error("5. Check Firestore security rules are not blocking admin SDK\n");

  process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth, admin };