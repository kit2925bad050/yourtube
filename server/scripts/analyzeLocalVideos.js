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
const thumbnailsDir = path.join(uploadsDir, "thumbnails");

// Analysis results
const results = {
  total: 0,
  needsMigration: 0,
  alreadyMigrated: 0,
  missingFiles: 0,
  details: [],
};

/**
 * Check if filepath is a local path
 */
function isLocalPath(filepath) {
  if (!filepath) return false;
  return (
    filepath.startsWith("uploads/") ||
    filepath.startsWith("/tmp/uploads") ||
    filepath.startsWith("uploads\\") ||
    !filepath.startsWith("http")
  );
}

/**
 * Extract filename from filepath
 */
function extractFilename(filepath) {
  if (filepath.includes("/")) {
    return filepath.split("/").pop();
  }
  if (filepath.includes("\\")) {
    return filepath.split("\\").pop();
  }
  return filepath;
}

/**
 * Find video file in uploads directory
 */
function findVideoFile(filename) {
  const exactPath = path.join(uploadsDir, filename);
  if (fs.existsSync(exactPath)) {
    return exactPath;
  }

  try {
    const files = fs.readdirSync(uploadsDir);
    for (const file of files) {
      if (file === "thumbnails") continue;
      if (file.includes(filename.split(".")[0])) {
        return path.join(uploadsDir, file);
      }
    }
  } catch (error) {
    return null;
  }

  return null;
}

/**
 * Find thumbnail file
 */
function findThumbnailFile(filename) {
  if (!filename) return null;
  const basename = path.basename(filename, path.extname(filename));

  try {
    const thumbnailFiles = fs.readdirSync(thumbnailsDir);
    for (const file of thumbnailFiles) {
      if (file.includes(basename)) {
        return path.join(thumbnailsDir, file);
      }
    }
  } catch (error) {
    return null;
  }

  return null;
}

/**
 * Get file size in human-readable format
 */
function getFileSizeFormatted(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Analyze a single video
 */
async function analyzeVideo(video) {
  const videoData = {
    id: video._id.toString(),
    title: video.videotitle,
    filepath: video.filepath,
    status: "unknown",
    videoExists: false,
    videoSize: 0,
    thumbnailExists: false,
    thumbnailSize: 0,
  };

  try {
    // Check if already migrated
    if (video.filepath && video.filepath.startsWith("http")) {
      videoData.status = "already_migrated";
      results.alreadyMigrated++;
      return videoData;
    }

    // Check if filepath is local
    if (!isLocalPath(video.filepath)) {
      videoData.status = "not_local";
      return videoData;
    }

    // Check video file existence
    const videoFilename = extractFilename(video.filepath);
    const videoPath = findVideoFile(videoFilename);

    if (videoPath && fs.existsSync(videoPath)) {
      videoData.videoExists = true;
      videoData.videoSize = fs.statSync(videoPath).size;
    } else {
      videoData.status = "missing_video_file";
      results.missingFiles++;
      return videoData;
    }

    // Check thumbnail
    const thumbnailPath = findThumbnailFile(videoFilename);
    if (thumbnailPath && fs.existsSync(thumbnailPath)) {
      videoData.thumbnailExists = true;
      videoData.thumbnailSize = fs.statSync(thumbnailPath).size;
    }

    videoData.status = "ready_for_migration";
    results.needsMigration++;

    return videoData;
  } catch (error) {
    videoData.status = "error";
    videoData.error = error.message;
    return videoData;
  }
}

/**
 * Print analysis results
 */
function printAnalysis() {
  console.log("\n");
  console.log(
    "╔═══════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║    LOCAL VIDEOS TO FIREBASE - PRE-MIGRATION ANALYSIS (DRY-RUN)  ║"
  );
  console.log(
    "╚═══════════════════════════════════════════════════════════════════╝"
  );

  console.log("\n📊 SUMMARY:");
  console.log(`  Total Videos in Database: ${results.total}`);
  console.log(
    `  📤 Ready for Migration: ${results.needsMigration}`
  );
  console.log(
    `  ⏭️  Already Migrated: ${results.alreadyMigrated}`
  );
  console.log(
    `  ⚠️  Missing Video Files: ${results.missingFiles}`
  );

  // Calculate total size to migrate
  let totalSize = 0;
  results.details.forEach((v) => {
    if (v.status === "ready_for_migration") {
      totalSize += v.videoSize + v.thumbnailSize;
    }
  });
  console.log(`  💾 Total Data to Migrate: ${getFileSizeFormatted(totalSize)}`);

  console.log("\n📝 DETAILED ANALYSIS:\n");

  const readyForMigration = results.details.filter(
    (v) => v.status === "ready_for_migration"
  );
  const alreadyMigrated = results.details.filter(
    (v) => v.status === "already_migrated"
  );
  const missing = results.details.filter(
    (v) => v.status === "missing_video_file"
  );

  if (readyForMigration.length > 0) {
    console.log("✅ READY FOR MIGRATION:");
    readyForMigration.forEach((v, i) => {
      console.log(
        `  ${i + 1}. ${v.title}`
      );
      console.log(`     ID: ${v.id}`);
      console.log(`     Current Path: ${v.filepath}`);
      console.log(`     Video Size: ${getFileSizeFormatted(v.videoSize)}`);
      if (v.thumbnailExists) {
        console.log(
          `     Thumbnail: ${getFileSizeFormatted(v.thumbnailSize)}`
        );
      }
      console.log("");
    });
  }

  if (alreadyMigrated.length > 0) {
    console.log("\nℹ️  ALREADY MIGRATED:");
    alreadyMigrated.forEach((v, i) => {
      console.log(`  ${i + 1}. ${v.title}`);
    });
  }

  if (missing.length > 0) {
    console.log("\n⚠️  MISSING VIDEO FILES (Cannot Migrate):");
    missing.forEach((v, i) => {
      console.log(
        `  ${i + 1}. ${v.title} (${v.filepath})`
      );
    });
  }

  console.log("\n");
  console.log(
    "╔═══════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║                   DRY-RUN ANALYSIS COMPLETE                      ║"
  );
  if (results.needsMigration > 0) {
    console.log(
      `║   To proceed with migration, run:                                ║`
    );
    console.log(
      `║   npm run migrate:videos                                        ║`
    );
  }
  console.log(
    "╚═══════════════════════════════════════════════════════════════════╝\n"
  );
}

/**
 * Main analysis process
 */
async function runAnalysis() {
  console.log(
    "╔═══════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║         ANALYZING LOCAL VIDEOS FOR FIREBASE MIGRATION            ║"
  );
  console.log(
    "╚═══════════════════════════════════════════════════════════════════╝\n"
  );

  try {
    // Connect to MongoDB
    console.log("🔗 Connecting to MongoDB...");
    await connectDatabase();
    console.log("✅ MongoDB connected\n");

    // Find all videos
    console.log("🔍 Scanning MongoDB for videos...");
    const videos = await Video.find({});
    results.total = videos.length;
    console.log(`📌 Found ${videos.length} total videos\n`);

    if (videos.length === 0) {
      console.log("⚠️  No videos found in database.");
      return;
    }

    // Analyze each video
    console.log("📊 Analyzing videos...\n");
    for (let i = 0; i < videos.length; i++) {
      process.stdout.write(
        `\r  [${"█".repeat(Math.floor((i / videos.length) * 30))}${"░".repeat(30 - Math.floor((i / videos.length) * 30))}] ${i + 1}/${videos.length}`
      );
      const videoResult = await analyzeVideo(videos[i]);
      results.details.push(videoResult);
    }
    console.log("\n");

    // Print analysis
    printAnalysis();

    // Close database connection
    await mongoose.connection.close();
    console.log("✅ Database connection closed");
  } catch (error) {
    console.error("❌ Analysis failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the analysis
runAnalysis().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
