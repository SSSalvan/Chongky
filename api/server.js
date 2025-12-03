import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin";

dotenv.config();

const app = express();
app.use(express.json({ limit: "10mb" }));

// ✅ FIX: CORS (Izinkan Frontend Vercel & Localhost)
app.use(
  cors({
    origin: [
      "https://ourfit-sync-mk-web.vercel.app",
      "https://outfitsync-web.vercel.app",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5500",
      "http://127.0.0.1:5500"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// ======================================
// FIREBASE ADMIN INIT
// ======================================
if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("Firebase Admin Initialized");
    } catch (error) {
      console.error("Firebase Init Error: Invalid JSON", error);
    }
  } else {
    console.error("Firebase Init Error: FIREBASE_SERVICE_ACCOUNT missing");
  }
}

const db = admin.firestore();

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});