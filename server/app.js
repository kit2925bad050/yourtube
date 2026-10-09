import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import mongoose from "mongoose";
import userroutes from "./routes/auth.js";
import videoroutes, { adminRoutes } from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import downloadroutes from "./routes/download.js";
import paymentroutes from "./routes/payment.js";
import moderationroutes from "./routes/moderation.js";
import subscriptionroutes from "./routes/subscriptions.js";
import notificationroutes from "./routes/notifications.js";
import { connectDatabase, setupDatabaseEventHandlers } from "./config/database.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { uploadsDir as helperUploadsDir, isServerless as helperIsServerless } from "./filehelper/filehelper.js";
const uploadsDir = path.resolve(process.env.UPLOADS_DIR || helperUploadsDir || path.join(__dirname, "uploads"));
const isServerless = !!helperIsServerless;

const app = express();

const originsRaw =
  process.env.CORS_ALLOWED_ORIGINS ||
  process.env.FRONTEND_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  "http://localhost:3000,http://localhost:3001";

const allowedOrigins = originsRaw
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
// Static middleware for local development only (not used in production with Cloudinary Storage)
// Note: In production (Vercel serverless), videos are served directly from Cloudinary via URLs
// stored in MongoDB. No local file serving needed.
if (uploadsDir && !isServerless) {
  app.use("/uploads", express.static(uploadsDir));
}

app.get("/", (req, res) => {
  res.send("You tube backend (serverless) is working");
});

app.get("/api/health", (req, res) => {
  const dbState = ["disconnected", "connected", "connecting", "disconnecting"];
  res.json({
    status: "ok",
    mongodb: dbState[mongoose.connection.readyState] || "unknown",
  });
});

app.use("/api/user", userroutes);
app.use("/api/auth", userroutes);
app.use("/api/users", userroutes);
app.use("/api/videos", videoroutes);
app.use("/api/admin", adminRoutes);
app.use("/api/like", likeroutes);
app.use("/api/watch", watchlaterroutes);
app.use("/api/history", historyrroutes);
app.use("/api/comment", commentroutes);
app.use("/api/download", downloadroutes);
app.use("/api/payment", paymentroutes);
app.use("/api/moderation", moderationroutes);
app.use("/api/subscriptions", subscriptionroutes);
app.use("/api/notifications", notificationroutes);

let dbConnecting = false;
export async function ensureDbConnected() {
  if (mongoose.connection.readyState === 1) return;
  if (dbConnecting) return;
  dbConnecting = true;
  setupDatabaseEventHandlers();
  try {
    await connectDatabase();
  } finally {
    dbConnecting = false;
  }
}

export { app };
