import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUri = process.env.DB_URL;
if (!mongoUri) {
  console.error('ERROR: DB_URL not configured in .env');
  process.exit(1);
}

try {
  await mongoose.connect(mongoUri);
  console.log('✅ MongoDB connected');
  
  const db = mongoose.connection.db;
  const videosCollection = db.collection('videos');
  
  // Count videos with local paths
  const localPathCount = await videosCollection.countDocuments({
    $or: [
      { filepath: { $regex: '^uploads/' } },
      { filepath: { $regex: '^/tmp/uploads' } },
      { filepath: { $regex: '^C:' } }
    ]
  });
  
  // Count videos with Firebase URLs
  const firebaseUrlCount = await videosCollection.countDocuments({
    filepath: { $regex: '^https://storage.googleapis.com' }
  });
  
  // Get sample of each type
  const localSample = await videosCollection.findOne({
    $or: [
      { filepath: { $regex: '^uploads/' } },
      { filepath: { $regex: '^/tmp/uploads' } },
      { filepath: { $regex: '^C:' } }
    ]
  });
  
  const firebaseSample = await videosCollection.findOne({
    filepath: { $regex: '^https://storage.googleapis.com' }
  });
  
  console.log('\n📊 MIGRATION STATUS IN MONGODB:');
  console.log(`\n1. Videos with LOCAL PATHS: ${localPathCount}`);
  if (localSample) {
    console.log(`   Sample: ${localSample.filepath.substring(0, 80)}...`);
  }
  
  console.log(`\n2. Videos with FIREBASE URLs: ${firebaseUrlCount}`);
  if (firebaseSample) {
    console.log(`   Sample: ${firebaseSample.filepath.substring(0, 80)}...`);
  }
  
  console.log(`\n3. Total Videos: ${localPathCount + firebaseUrlCount}`);
  
  await mongoose.connection.close();
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
