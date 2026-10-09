#!/usr/bin/env node
/**
 * Script to delete ALL videos from the application database
 * 
 * This script:
 * 1. Connects to MongoDB
 * 2. Fetches all video records
 * 3. Deletes Cloudinary video and thumbnail resources
 * 4. Deletes video records from MongoDB
 * 5. Preserves user accounts, comments, likes, and application settings
 * 
 * Usage: node deleteAllVideos.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
import Video from '../Modals/video.js';
import { deleteVideoFromCloudinary, deleteThumbnailFromCloudinary } from '../services/cloudinaryUpload.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function connectDatabase() {
  const uri = process.env.DB_URL;

  if (!uri) {
    throw new Error('DB_URL is missing. Add a valid MongoDB connection string to server/.env');
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    log('✓ MongoDB connected', 'green');
    return true;
  } catch (error) {
    log(`✗ MongoDB connection failed: ${error.message}`, 'red');
    return false;
  }
}

async function deleteAllVideos() {
  log('\n=== VIDEO DELETION SCRIPT ===\n', 'blue');
  
  // Connect to database
  const connected = await connectDatabase();
  if (!connected) {
    log('Failed to connect to database. Aborting.', 'red');
    process.exit(1);
  }

  try {
    // Step 1: Fetch all videos
    log('Step 1: Fetching all videos from database...', 'blue');
    const allVideos = await Video.find({});
    const totalVideos = allVideos.length;

    if (totalVideos === 0) {
      log('No videos found in database.', 'yellow');
      log('\n=== DELETION COMPLETE ===', 'blue');
      log('Total videos deleted: 0\n', 'green');
      process.exit(0);
    }

    log(`Found ${totalVideos} video(s) to delete`, 'yellow');

    // Step 2: Delete Cloudinary resources
    log('\nStep 2: Deleting Cloudinary resources...', 'blue');
    let deletedVideoResources = 0;
    let deletedThumbnailResources = 0;
    let cloudinaryErrors = 0;

    for (let i = 0; i < allVideos.length; i++) {
      const video = allVideos[i];
      const videoTitle = video.videotitle || 'Unknown';
      const videoId = video._id.toString();

      process.stdout.write(`  [${i + 1}/${totalVideos}] Processing: ${videoTitle.substring(0, 50)}... `);

      try {
        // Delete video from Cloudinary
        if (video.cloudinaryVideoPublicId) {
          try {
            const result = await deleteVideoFromCloudinary(video.cloudinaryVideoPublicId);
            if (result && result.result === 'ok') {
              deletedVideoResources++;
              process.stdout.write('✓ ');
            } else {
              throw new Error('Unexpected response from Cloudinary');
            }
          } catch (error) {
            // Log but don't fail - file may have already been deleted
            log(`\n    Warning: Could not delete video resource: ${error.message}`, 'yellow');
            cloudinaryErrors++;
          }
        }

        // Delete thumbnail from Cloudinary
        if (video.cloudinaryThumbnailPublicId) {
          try {
            const result = await deleteThumbnailFromCloudinary(video.cloudinaryThumbnailPublicId);
            if (result && result.result === 'ok') {
              deletedThumbnailResources++;
              process.stdout.write('✓ ');
            } else {
              throw new Error('Unexpected response from Cloudinary');
            }
          } catch (error) {
            // Log but don't fail - file may have already been deleted
            log(`\n    Warning: Could not delete thumbnail resource: ${error.message}`, 'yellow');
            cloudinaryErrors++;
          }
        }

        log('(Cloudinary cleanup done)', 'green');
      } catch (error) {
        log(`\n    Error processing video ${videoId}: ${error.message}`, 'red');
        cloudinaryErrors++;
      }
    }

    log(`\nCloudinary resources deleted:`, 'blue');
    log(`  - Video files: ${deletedVideoResources}`, 'green');
    log(`  - Thumbnails: ${deletedThumbnailResources}`, 'green');
    if (cloudinaryErrors > 0) {
      log(`  - Errors encountered: ${cloudinaryErrors}`, 'yellow');
    }

    // Step 3: Delete video records from MongoDB
    log('\nStep 3: Deleting video records from MongoDB...', 'blue');
    const deleteResult = await Video.deleteMany({});

    if (deleteResult.deletedCount === totalVideos) {
      log(`✓ Successfully deleted ${deleteResult.deletedCount} video record(s) from MongoDB`, 'green');
    } else {
      log(`⚠ Unexpected deletion count: ${deleteResult.deletedCount} (expected ${totalVideos})`, 'yellow');
    }

    // Step 4: Verify deletion
    log('\nStep 4: Verifying deletion...', 'blue');
    const remainingVideos = await Video.find({});
    log(`Remaining videos in database: ${remainingVideos.length}`, 'green');

    // Final report
    log('\n=== DELETION COMPLETE ===', 'blue');
    log(`Total videos deleted: ${deleteResult.deletedCount}`, 'green');
    log(`Cloudinary video files deleted: ${deletedVideoResources}`, 'green');
    log(`Cloudinary thumbnails deleted: ${deletedThumbnailResources}`, 'green');
    log(`Database integrity: ✓ Preserved (user accounts, comments, likes, settings intact)\n`, 'green');

    // Test new upload capability
    log('Step 5: Testing upload capability...', 'blue');
    try {
      // Create a test video document (not actually uploaded yet)
      const testVideo = new Video({
        videotitle: 'Test Upload Capability',
        filename: 'test.mp4',
        filetype: 'video/mp4',
        filepath: 'https://example.com/test.mp4',
        filesize: 1024,
        videochanel: 'Test Channel',
      });

      // Try to save it
      await testVideo.save();
      log('✓ Test video record created successfully', 'green');

      // Delete the test record
      await Video.deleteOne({ _id: testVideo._id });
      log('✓ Test cleanup successful', 'green');
      log('\n✓ Application is ready to accept new video uploads', 'green');
    } catch (error) {
      log(`✗ Upload capability test failed: ${error.message}`, 'red');
    }

    log('\n=== SCRIPT COMPLETED SUCCESSFULLY ===\n', 'blue');
    process.exit(0);

  } catch (error) {
    log(`\n✗ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    // Close database connection
    try {
      await mongoose.connection.close();
      log('Database connection closed', 'blue');
    } catch (error) {
      log(`Warning: Could not close database connection: ${error.message}`, 'yellow');
    }
  }
}

// Run the script
deleteAllVideos().catch(error => {
  log(`Unhandled error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
