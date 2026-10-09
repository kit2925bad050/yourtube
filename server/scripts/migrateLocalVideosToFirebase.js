import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import Video from "../Modals/video.js";
import { uploadToFirebase } from "../services/firebaseStorage.js";

// Load environment variables from .env
const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../.env");
dotenv.config({ path: envPath });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "../uploads");
const thumbnailsDir = path.join(uploadsDir, "thumbnails");

// Migration results tracking
const results = {
  total: 0,
  successfulMigrations: 0,
  alreadyMigrated: 0,
  missingLocalFiles: 0,
  errors: 0,
  videos: [],
};

/**
 * Determine MIME type based on file extension
 */
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".avi": "video/x-msvideo",
    ".mov": "video/quicktime",
    ".mkv": "video/x-matroska",
    ".flv": "video/x-flv",
    ".wmv": "video/x-ms-wmv",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

/**
 * Check if filepath is a local path
 */
function isLocalPath(filepath) {
  if (!filepath) return false;
  return (
    filepath.startsWith("uploads/") ||
    filepath.startsWith("/tmp/uploads") ||
    filepath.startsWith("uploads\\") ||
    filepath.startsWith("C:") ||
    (!filepath.startsWith("http") && !filepath.startsWith("https"))
  );
}

/**
 * Check if already migrated
 */
function isAlreadyMigrated(filepath) {
  return filepath && filepath.startsWith("https://storage.googleapis.com/");
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
  // Try exact match first
  const exactPath = path.join(uploadsDir, filename);
  if (fs.existsSync(exactPath)) {
    return exactPath;
  }

  // Try searching in uploads directory (excluding thumbnails)
  try {
    const files = fs.readdirSync(uploadsDir);
    for (const file of files) {
      if (file === "thumbnails") continue;
      if (file.includes(filename.split(".")[0])) {
        const fullPath = path.join(uploadsDir, file);
        return fullPath;
      }
    }
  } catch (error) {
    console.error("Error searching uploads directory:", error.message);
  }

  return null;
}

/**
 * Find thumbnail file
 */
function findThumbnailFile(filename) {
  if (!filename) return null;

  const basename = path.basename(filename, path.extname(filename));

  // Try exact match first
  try {
    const thumbnailFiles = fs.readdirSync(thumbnailsDir);
    for (const file of thumbnailFiles) {
      if (file.includes(basename)) {
        return path.join(thumbnailsDir, file);
      }
    }
  } catch (error) {
    console.error("Error searching thumbnails directory:", error.message);
  }

  return null;
}

/**
 * Migrate a single video to Firebase
 */
async function migrateVideo(video) {
  const videoData = {
    id: video._id.toString(),
    title: video.videotitle,
    originalFilepath: video.filepath,
    originalThumbnail: video.thumbnail || "",
    videoUrl: null,
    videoFirebasePath: null,
    thumbnailUrl: null,
    thumbnailFirebasePath: null,
    status: "pending",
    errors: [],
  };

  try {
    // Check if already migrated
    if (isAlreadyMigrated(video.filepath)) {
      videoData.status = "already_migrated";
      results.alreadyMigrated++;
      return videoData;
    }

    // Check if filepath is local
    if (!isLocalPath(video.filepath)) {
      videoData.status = "not_local";
      return videoData;
    }

    // Find and upload video file
    const videoFilename = extractFilename(video.filepath);
    const videoPath = findVideoFile(videoFilename);

    if (!videoPath) {
      videoData.status = "missing_video_file";
      videoData.errors.push(`Video file not found: ${videoFilename}`);
      results.missingLocalFiles++;
      results.errors++;
      return videoData;
    }

    // Read video file
    console.log(`  📹 Uploading video: ${videoFilename}...`);
    const videoBuffer = fs.readFileSync(videoPath);
    const videoMimeType = getMimeType(videoFilename);

    const uploadResult = await uploadToFirebase(
      videoBuffer,
      videoFilename,
      "videos",
      videoMimeType
    );

    videoData.videoUrl = uploadResult.url;
    videoData.videoFirebasePath = uploadResult.path;

    // Find and upload thumbnail if it exists
    if (video.thumbnail || video.customThumbnailUrl) {
      const thumbnailPath = findThumbnailFile(videoFilename);

      if (thumbnailPath && fs.existsSync(thumbnailPath)) {
        console.log(`  🎨 Uploading thumbnail...`);
        const thumbnailBuffer = fs.readFileSync(thumbnailPath);
        const thumbnailMimeType = getMimeType(thumbnailPath);

        const thumbnailResult = await uploadToFirebase(
          thumbnailBuffer,
          path.basename(thumbnailPath),
          "thumbnails",
          thumbnailMimeType
        );

        videoData.thumbnailUrl = thumbnailResult.url;
        videoData.thumbnailFirebasePath = thumbnailResult.path;
      }
    }

    // Update MongoDB document
    console.log(`  💾 Updating MongoDB...`);
    const updateData = {
      filepath: videoData.videoUrl,
      _firebaseVideoPath: videoData.videoFirebasePath,
    };

    if (videoData.thumbnailUrl) {
      updateData.customThumbnailUrl = videoData.thumbnailUrl;
      updateData._firebaseThumbnailPath = videoData.thumbnailFirebasePath;
    }

    const updated = await Video.findByIdAndUpdate(video._id, updateData, { new: true });
    console.log(`  ✅ MongoDB updated`);

    videoData.status = "migrated";
    results.successfulMigrations++;

    return videoData;
  } catch (error) {
    videoData.status = "error";
    videoData.errors.push(error.message);
    results.errors++;
    return videoData;
  }
}

/**
 * Print migration results
 */
function printResults() {
  console.log("\n");
  console.log(
    "╔═══════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║         VIDEO MIGRATION TO FIREBASE - FINAL RESULTS              ║"
  );
  console.log(
    "╚═══════════════════════════════════════════════════════════════════╝"
  );
  console.log("\n📊 SUMMARY:");
  console.log(`  Total Videos Processed: ${results.total}`);
  console.log(`  ✅ Successfully Migrated: ${results.successfulMigrations}`);
  console.log(`  ⏭️  Already Migrated: ${results.alreadyMigrated}`);
  console.log(`  ❌ Errors: ${results.errors}`);
  console.log(`  ⚠️  Missing Files: ${results.missingLocalFiles}`);

  console.log("\n📝 DETAILED RESULTS:\n");

  results.videos.forEach((video, index) => {
    console.log(`${index + 1}. VIDEO: ${video.title}`);
    console.log(`   ID: ${video.id}`);
    console.log(`   Status: ${video.status.toUpperCase()}`);

    if (video.status === "migrated") {
      console.log(`   Original Path: ${video.originalFilepath}`);
      console.log(`   ✅ Video URL:`);
      console.log(`      ${video.videoUrl}`);
      if (video.thumbnailUrl) {
        console.log(`   ✅ Thumbnail URL:`);
        console.log(`      ${video.thumbnailUrl}`);
      }
    } else if (video.status === "already_migrated") {
      console.log(`   ℹ️  Already has Firebase URL`);
    } else if (video.status === "missing_video_file") {
      console.log(`   ❌ Errors:`);
      video.errors.forEach((error) => console.log(`      - ${error}`));
    } else if (video.errors.length > 0) {
      console.log(`   ❌ Errors:`);
      video.errors.forEach((error) => console.log(`      - ${error}`));
    }

    console.log("");
  });

  console.log(
    "╔═══════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║                    MIGRATION COMPLETE                            ║"
  );
  console.log(
    "╚═══════════════════════════════════════════════════════════════════╝\n"
  );
}

/**
 * Main migration process
 */
async function runMigration() {
  console.log(
    "╔═══════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║    MIGRATING LOCAL VIDEOS TO FIREBASE STORAGE                   ║"
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
    console.log("🔍 Scanning MongoDB for videos with local filepaths...");
    const videos = await Video.find({});
    results.total = videos.length;
    console.log(`📌 Found ${videos.length} total videos\n`);

    if (videos.length === 0) {
      console.log("⚠️  No videos found in database.");
      return;
    }

    // Migrate each video
    console.log(
      "📤 Starting migration process...\n"
    );
    for (let i = 0; i < videos.length; i++) {
      console.log(`\n[${i + 1}/${videos.length}] Processing: ${videos[i].videotitle}`);
      const videoResult = await migrateVideo(videos[i]);
      results.videos.push(videoResult);
    }

    // Print results
    printResults();

    // Close database connection
    await mongoose.connection.close();
    console.log("✅ Database connection closed");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the migration
runMigration().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

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
  // Try exact match first
  const exactPath = path.join(uploadsDir, filename);
  if (fs.existsSync(exactPath)) {
    return exactPath;
  }

  // Try searching in uploads directory (excluding thumbnails)
  try {
    const files = fs.readdirSync(uploadsDir);
    for (const file of files) {
      if (file === "thumbnails") continue;
      if (file.includes(filename.split(".")[0])) {
        const fullPath = path.join(uploadsDir, file);
        return fullPath;
      }
    }
  } catch (error) {
    console.error("Error searching uploads directory:", error.message);
  }

  return null;
}

/**
 * Find thumbnail file
 */
function findThumbnailFile(filename) {
  if (!filename) return null;

  const basename = path.basename(filename, path.extname(filename));

  // Try exact match first
  try {
    const thumbnailFiles = fs.readdirSync(thumbnailsDir);
    for (const file of thumbnailFiles) {
      if (file.includes(basename)) {
        return path.join(thumbnailsDir, file);
      }
    }
  } catch (error) {
    console.error("Error searching thumbnails directory:", error.message);
  }

  return null;
}

/**
 * Migrate a single video to Firebase
 */
async function migrateVideo(video) {
  const videoData = {
    id: video._id.toString(),
    title: video.videotitle,
    originalFilepath: video.filepath,
    originalThumbnail: video.thumbnail || "",
    videoUrl: null,
    videoFirebasePath: null,
    thumbnailUrl: null,
    thumbnailFirebasePath: null,
    status: "pending",
    errors: [],
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

    // Find and upload video file
    const videoFilename = extractFilename(video.filepath);
    const videoPath = findVideoFile(videoFilename);

    if (!videoPath) {
      videoData.status = "missing_video_file";
      videoData.errors.push(`Video file not found: ${videoFilename}`);
      results.missingLocalFiles++;
      results.errors++;
      return videoData;
    }

    // Read video file
    console.log(`  📹 Uploading video: ${videoFilename}...`);
    const videoBuffer = fs.readFileSync(videoPath);
    const videoMimeType = getMimeType(videoFilename);

    const uploadResult = await uploadToFirebase(
      videoBuffer,
      videoFilename,
      "videos",
      videoMimeType
    );

    videoData.videoUrl = uploadResult.url;
    videoData.videoFirebasePath = uploadResult.path;

    // Find and upload thumbnail if it exists
    if (video.thumbnail || video.customThumbnailUrl) {
      const thumbnailPath = findThumbnailFile(videoFilename);

      if (thumbnailPath && fs.existsSync(thumbnailPath)) {
        console.log(`  🎨 Uploading thumbnail...`);
        const thumbnailBuffer = fs.readFileSync(thumbnailPath);
        const thumbnailMimeType = getMimeType(thumbnailPath);

        const thumbnailResult = await uploadToFirebase(
          thumbnailBuffer,
          path.basename(thumbnailPath),
          "thumbnails",
          thumbnailMimeType
        );

        videoData.thumbnailUrl = thumbnailResult.url;
        videoData.thumbnailFirebasePath = thumbnailResult.path;
      }
    }

    // Update MongoDB document
    console.log(`  💾 Updating MongoDB...`);
    const updateData = {
      filepath: videoData.videoUrl,
      _firebaseVideoPath: videoData.videoFirebasePath,
    };

    if (videoData.thumbnailUrl) {
      updateData.customThumbnailUrl = videoData.thumbnailUrl;
      updateData._firebaseThumbnailPath = videoData.thumbnailFirebasePath;
    }

    await Video.findByIdAndUpdate(video._id, updateData, { new: true });

    videoData.status = "migrated";
    results.successfulMigrations++;

    return videoData;
  } catch (error) {
    videoData.status = "error";
    videoData.errors.push(error.message);
    results.errors++;
    return videoData;
  }
}

/**
 * Print migration results
 */
function printResults() {
  console.log("\n");
  console.log(
    "╔═══════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║         VIDEO MIGRATION TO FIREBASE - FINAL RESULTS              ║"
  );
  console.log(
    "╚═══════════════════════════════════════════════════════════════════╝"
  );
  console.log("\n📊 SUMMARY:");
  console.log(
    `  Total Videos Processed: ${results.total}`
  );
  console.log(
    `  ✅ Successfully Migrated: ${results.successfulMigrations}`
  );
  console.log(
    `  ⏭️  Already Migrated: ${results.alreadyMigrated}`
  );
  console.log(
    `  ❌ Errors: ${results.errors}`
  );
  console.log(
    `  ⚠️  Missing Files: ${results.missingLocalFiles}`
  );

  console.log("\n📝 DETAILED RESULTS:\n");

  results.videos.forEach((video, index) => {
    console.log(`${index + 1}. VIDEO: ${video.title}`);
    console.log(`   ID: ${video.id}`);
    console.log(`   Status: ${video.status.toUpperCase()}`);

    if (video.status === "migrated") {
      console.log(`   Original Path: ${video.originalFilepath}`);
      console.log(`   ✅ Video URL:`);
      console.log(`      ${video.videoUrl}`);
      if (video.thumbnailUrl) {
        console.log(`   ✅ Thumbnail URL:`);
        console.log(`      ${video.thumbnailUrl}`);
      }
    } else if (video.status === "already_migrated") {
      console.log(`   ℹ️  Already has Firebase URL`);
    } else if (video.status === "missing_video_file") {
      console.log(`   ❌ Errors:`);
      video.errors.forEach((error) => console.log(`      - ${error}`));
    } else if (video.errors.length > 0) {
      console.log(`   ❌ Errors:`);
      video.errors.forEach((error) => console.log(`      - ${error}`));
    }

    console.log("");
  });

  console.log(
    "╔═══════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║                    MIGRATION COMPLETE                            ║"
  );
  console.log(
    "╚═══════════════════════════════════════════════════════════════════╝\n"
  );
}

/**
 * Main migration process
 */
async function runMigration() {
  console.log(
    "╔═══════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║    MIGRATING LOCAL VIDEOS TO FIREBASE STORAGE                   ║"
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
    console.log("🔍 Scanning MongoDB for videos with local filepaths...");
    const videos = await Video.find({});
    results.total = videos.length;
    console.log(`📌 Found ${videos.length} total videos\n`);

    if (videos.length === 0) {
      console.log("⚠️  No videos found in database.");
      return;
    }

    // Migrate each video
    console.log(
      "📤 Starting migration process...\n"
    );
    for (let i = 0; i < videos.length; i++) {
      console.log(`\n[${i + 1}/${videos.length}] Processing: ${videos[i].videotitle}`);
      const videoResult = await migrateVideo(videos[i]);
      results.videos.push(videoResult);
    }

    // Print results
    printResults();

    // Close database connection
    await mongoose.connection.close();
    console.log("✅ Database connection closed");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the migration
runMigration().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
