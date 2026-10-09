import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mongoUri = process.env.DB_URL;
const uploadsDir = path.join(__dirname, 'uploads');

if (!mongoUri) {
  console.error('ERROR: DB_URL not configured');
  process.exit(1);
}

try {
  await mongoose.connect(mongoUri);
  console.log('✅ MongoDB connected\n');
  
  const db = mongoose.connection.db;
  const videosCollection = db.collection('videos');
  
  // Get all videos
  const allVideos = await videosCollection.find({}).toArray();
  
  console.log('📊 MONGODB VIDEOS:');
  console.log(`Total videos in database: ${allVideos.length}\n`);
  
  let localCount = 0;
  let firebaseCount = 0;
  let missingCount = 0;
  
  for (const video of allVideos) {
    console.log(`\n📹 ${video.videotitle || 'Untitled'}`);
    console.log(`   ID: ${video._id}`);
    console.log(`   Current filepath: ${video.filepath}`);
    
    // Check if local or Firebase
    if (video.filepath?.startsWith('https://storage.googleapis.com')) {
      console.log(`   Type: FIREBASE URL`);
      firebaseCount++;
    } else if (video.filepath?.startsWith('uploads/') || video.filepath?.startsWith('C:') || video.filepath?.startsWith('/tmp')) {
      console.log(`   Type: LOCAL PATH`);
      localCount++;
      
      // Check if file exists locally
      let filePath = video.filepath;
      
      // Handle different path formats
      if (filePath.startsWith('uploads/')) {
        filePath = path.join(uploadsDir, filePath.replace('uploads/', ''));
      } else if (filePath.includes('/uploads/')) {
        filePath = filePath.substring(filePath.indexOf('/uploads/') + 1);
        filePath = path.join(__dirname, filePath);
      } else if (filePath.startsWith('/tmp/uploads')) {
        // /tmp doesn't exist on Windows, skip
      }
      
      const exists = fs.existsSync(filePath);
      if (exists) {
        const stats = fs.statSync(filePath);
        console.log(`   ✅ File exists: ${filePath}`);
        console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
      } else {
        console.log(`   ❌ File NOT found: ${filePath}`);
        missingCount++;
      }
    }
  }
  
  console.log('\n\n📊 SUMMARY:');
  console.log(`Total videos: ${allVideos.length}`);
  console.log(`Local path videos: ${localCount}`);
  console.log(`Firebase URL videos: ${firebaseCount}`);
  console.log(`Missing local files: ${missingCount}`);
  console.log(`Restorable videos: ${localCount - missingCount}`);
  
  await mongoose.connection.close();
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
