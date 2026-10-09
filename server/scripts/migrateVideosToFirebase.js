import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import Video from "../Modals/video.js";

// Load environment variables from .env
const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../.env");
dotenv.config({ path: envPath });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "../uploads");

const results = {
  total: 0,
  alreadyMigrated: 0,
  hasLocalFiles: 0,
  missingFiles: 0,
  details: [],
};

function generateFirebaseUrl(fileName) {
  // Simulates what a Firebase URL would look like for reference
  // In production, these would be actual signed URLs from Firebase Storage
  const projectId = process.env.FIREBASE_PROJECT_ID || "yourtube-b1d38";
  const bucket = process.env.FIREBASE_STORAGE_BUCKET || "yourtube-b1d38.appspot.com";
  const encodedName = encodeURIComponent(`videos/${fileName}`);
  return `https://storage.googleapis.com/${bucket}/${encodedName}?alt=media`;
}

async function analyzeVideo(video) {
  const { _id, videotitle, filename, filepath, thumbnail } = video;

  try {
    // Check if filepath already looks like a Firebase URL
    if (filepath.startsWith("https://") || filepath.startsWith("http://")) {
      results.alreadyMigrated++;
      results.details.push({
        id: _id,
        title: videotitle,
        status: "✓ Already migrated",
        filepath: filepath.substring(0, 60) + "...",
      });
      return;
    }

    // Extract filename from filepath
    let localFilename = filepath;
    if (filepath.includes("/")) {
      localFilename = filepath.split("/").pop();
    }

    // Construct full local path
    const localPath = path.join(uploadsDir, localFilename);

    // Check if file exists
    if (!fs.existsSync(localPath)) {
      results.missingFiles++;
      results.details.push({
        id: _id,
        title: videotitle,
        status: "⚠ Local file missing",
        originalPath: filepath,
        searchedAt: localPath,
        action: "Needs re-upload or recovery",
      });
      return;
    }

    // File exists locally
    results.hasLocalFiles++;
    const fileSize = fs.statSync(localPath).size;
    const sizeInMB = (fileSize / (1024 * 1024)).toFixed(2);
    const suggestedFirebaseUrl = generateFirebaseUrl(localFilename);

    results.details.push({
      id: _id,
      title: videotitle,
      status: "→ Ready for migration",
      localPath: localPath,
      fileName: localFilename,
      fileSize: `${sizeInMB} MB`,
      hasThumbnail: thumbnail && thumbnail.trim() ? "Yes" : "No",
      suggestedFirebaseUrl: suggestedFirebaseUrl,
    });
  } catch (error) {
    results.details.push({
      id: _id,
      title: videotitle,
      status: "✗ Analysis error",
      error: error.message,
    });
  }
}

async function runAnalysis() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║  LOCAL VIDEOS TO FIREBASE STORAGE - MIGRATION READINESS   ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  try {
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    await connectDatabase();
    console.log("✓ MongoDB connected\n");

    // Find all videos with local file paths
    console.log("Scanning MongoDB for videos...");
    const localVideos = await Video.find({
      $or: [
        { filepath: { $regex: "^uploads/" } },
        { filepath: { $regex: "^/tmp/uploads" } },
        { filepath: { $regex: "^/uploads/" } },
      ],
    });

    console.log(`✓ Found ${localVideos.length} videos with local paths\n`);

    if (localVideos.length === 0) {
      console.log("No local videos found. All videos already migrated!");
      process.exit(0);
    }

    results.total = localVideos.length;

    // Analyze each video
    for (const video of localVideos) {
      await analyzeVideo(video);
    }

    // Print summary
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║                 MIGRATION READINESS SUMMARY                ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    console.log(`Total local videos found:     ${results.total}`);
    console.log(`✓ Already migrated (URLs):    ${results.alreadyMigrated}`);
    console.log(`→ Ready to migrate (files):   ${results.hasLocalFiles}`);
    console.log(`⚠ Missing local files:        ${results.missingFiles}\n`);

    // Print detailed results
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║                       DETAILED STATUS                      ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    for (let i = 0; i < results.details.length; i++) {
      const detail = results.details[i];
      console.log(`[${i + 1}/${results.total}] ${detail.title}`);
      console.log(`    ID: ${detail.id}`);
      console.log(`    Status: ${detail.status}`);

      if (detail.localPath) {
        console.log(`    File: ${path.basename(detail.localPath)}`);
        console.log(`    Size: ${detail.fileSize}`);
        console.log(`    Thumbnail: ${detail.hasThumbnail}`);
      }

      if (detail.originalPath) {
        console.log(`    Original path in DB: ${detail.originalPath}`);
      }

      if (detail.searchedAt) {
        console.log(`    Searched location: ${detail.searchedAt}`);
      }

      if (detail.action) {
        console.log(`    Action: ${detail.action}`);
      }

      if (detail.error) {
        console.log(`    Error: ${detail.error}`);
      }

      if (detail.filepath) {
        console.log(`    Firebase URL: ${detail.filepath}`);
      }

      console.log("");
    }

    // Print migration instructions
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║                 NEXT STEPS FOR MIGRATION                   ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    if (results.hasLocalFiles > 0) {
      console.log(`To complete migration of ${results.hasLocalFiles} videos:\n`);
      console.log("1. Ensure Firebase credentials are configured:");
      console.log(`   - FIREBASE_PROJECT_ID: ${process.env.FIREBASE_PROJECT_ID || "(not set)"}`);
      console.log(`   - FIREBASE_STORAGE_BUCKET: ${process.env.FIREBASE_STORAGE_BUCKET || "(not set)"}`);
      console.log(`   - GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS || "(not set)"}\n`);
      
      console.log("2. Run Firebase Storage upload script:");
      console.log("   npm run migrate:videos-firebase-upload\n");
      
      console.log("3. Script will:");
      console.log("   - Read each local video file from server/uploads/");
      console.log("   - Upload to Firebase Storage (videos/ folder)");
      console.log("   - Generate signed URLs (100-year validity)");
      console.log("   - Update MongoDB documents with Firebase URLs\n");
    }

    if (results.missingFiles > 0) {
      console.log(`⚠ WARNING: ${results.missingFiles} video files are missing locally!\n`);
      console.log("These videos cannot be migrated. Options:\n");
      console.log("- Delete videos from MongoDB (if safe to do)");
      console.log("- Re-upload videos through the web interface\n");
    }

    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║                    ANALYSIS COMPLETE                       ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    process.exit(0);
  } catch (error) {
    console.error("Fatal error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run analysis
runAnalysis();
