# Video Deletion System

## Overview

This document describes how to delete all videos from the YouTube 2.0 application while preserving:
- ✅ User accounts and profiles
- ✅ Comments and comment data
- ✅ Likes/Dislikes counts
- ✅ Application settings
- ✅ Database structure

## Architecture

### Video Storage
- **Platform**: Cloudinary (cloud storage)
- **Video Folder**: `yourtube_videos`
- **Thumbnail Folder**: `yourtube_thumbnails`
- **Database**: MongoDB collection `videofiles`

### Deletion Process
1. Connect to MongoDB
2. Fetch all video records
3. Delete Cloudinary resources (videos + thumbnails)
4. Delete database records
5. Verify deletion complete

## Methods to Delete Videos

### Method 1: API Endpoint (Recommended)

**Requirements**:
- Backend server running
- Admin authentication

**Steps**:

1. Start the backend server:
```bash
cd you_tube2.0-main/server
npm install
npm start
```

2. In another terminal, call the deletion endpoint:

**Using curl (Windows PowerShell)**:
```powershell
curl -X DELETE http://localhost:5000/api/videos/ `
  -H "Authorization: Bearer admin-secret-key" `
  -H "Content-Type: application/json"
```

**Using curl (Linux/Mac)**:
```bash
curl -X DELETE http://localhost:5000/api/videos/ \
  -H "Authorization: Bearer admin-secret-key" \
  -H "Content-Type: application/json"
```

**Using Node.js script**:
```bash
node scripts/deleteAllVideosViaAPI.js
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "Successfully deleted all 5 video(s)",
  "summary": {
    "totalVideosDeleted": 5,
    "cloudinaryVideosDeleted": 5,
    "cloudinaryThumbnailsDeleted": 5,
    "databaseRecordsDeleted": 5,
    "remainingVideos": 0,
    "errors": []
  },
  "deletedVideos": [
    {
      "id": "64abc123...",
      "title": "Sample Video",
      "uploader": "username",
      "uploadedAt": "2026-06-15T10:30:00Z"
    }
  ]
}
```

### Method 2: Direct Node.js Script (Offline)

**Advantages**:
- No need to run the full server
- Direct MongoDB connection
- Useful if server won't start

**Steps**:
```bash
cd you_tube2.0-main/server
node scripts/deleteAllVideos.js
```

**Expected Output**:
```
=== VIDEO DELETION SCRIPT ===

✓ MongoDB connected
Step 1: Fetching all videos from database...
Found 5 video(s) to delete

Step 2: Deleting Cloudinary resources...
  [1/5] Processing: Sample Video 1... ✓ ✓ (Cloudinary cleanup done)
  [2/5] Processing: Sample Video 2... ✓ ✓ (Cloudinary cleanup done)
  ...

Cloudinary resources deleted:
  - Video files: 5
  - Thumbnails: 5
  - Errors encountered: 0

Step 3: Deleting video records from MongoDB...
✓ Successfully deleted 5 video record(s) from MongoDB

Step 4: Verifying deletion...
Remaining videos in database: 0

=== DELETION COMPLETE ===
Total videos deleted: 5
Cloudinary video files deleted: 5
Cloudinary thumbnails deleted: 5
Database integrity: ✓ Preserved (user accounts, comments, likes, settings intact)

Step 5: Testing upload capability...
✓ Test video record created successfully
✓ Test cleanup successful

✓ Application is ready to accept new video uploads

=== SCRIPT COMPLETED SUCCESSFULLY ===
```

### Method 3: Admin Tool

**Interactive menu with status checking**:
```bash
node scripts/deleteVideosAdmin.js
```

This tool will:
- Check if server is running
- Show available deletion methods
- Attempt to connect and delete
- Provide detailed instructions

## Verification Steps

After deletion, verify the application is working correctly:

### 1. Check Homepage (Empty)
```bash
# Navigate to frontend
http://localhost:3000

# Expected: No videos displayed
# Home page should show empty grid
```

### 2. Database Verification
```bash
# Check remaining videos in database
# In MongoDB Atlas or MongoDB Compass:
# Collection: videofiles
# Expected count: 0
```

### 3. Test New Upload
```
1. Log in to frontend (http://localhost:3000)
2. Navigate to upload page
3. Upload a test video file (MP4, < 100MB)
4. Verify it appears on homepage
5. Check Cloudinary dashboard shows video in yourtube_videos folder
```

## Important Notes

### User Accounts & Related Data - PRESERVED ✅
- User authentication records
- User profiles and settings
- User roles and permissions
- Upload history in comments

### Comments System - PRESERVED ✅
- All comments remain intact
- Comment replies preserved
- Translation data intact
- Comment counts not affected

### Likes/Dislikes - PRESERVED ✅
- Like/Dislike counts not affected
- Relationship data preserved
- Statistics data preserved

### What Gets Deleted ❌
- Video files from Cloudinary
- Video records from MongoDB
- Thumbnail files from Cloudinary
- Metadata (title, description, tags)
- View counts

## Rollback (If Needed)

If deletion happens by mistake:

1. **From Cloudinary Backups**:
   - Log into Cloudinary.com
   - Check Media Library > Backups
   - Restore files if available

2. **From MongoDB Backups**:
   - Contact MongoDB Atlas admin
   - Request database backup restore
   - Specify point-in-time before deletion

## Troubleshooting

### Error: "MongoDB connection failed"
**Cause**: Network issue or MongoDB Atlas whitelist
**Solution**:
1. Check DB_URL in `.env`
2. Add your IP to MongoDB Atlas whitelist
3. Try again

### Error: "Cloudinary authentication failed"
**Cause**: Invalid credentials
**Solution**:
1. Verify CLOUDINARY_CLOUD_NAME in `.env`
2. Check API key and secret
3. Log into Cloudinary.com and regenerate keys if needed

### Error: "Authorization failed"
**Cause**: Wrong admin token
**Solution**:
1. Use correct admin token (default: `admin-secret-key`)
2. Check environment variable if custom token set

### Script hangs
**Cause**: Network timeout
**Solution**:
1. Check internet connection
2. Restart MongoDB connection
3. Try again

## Security Considerations

⚠️ **This is an ADMIN-ONLY operation**

- Endpoint requires `authenticate` middleware (logged-in user)
- Endpoint requires `authorize("admin")` (must have admin role)
- Default token in examples should be changed in production
- Audit deletion in application logs
- Only run in trusted environments

## API Endpoint Details

**Endpoint**: `DELETE /api/videos/`
**Authentication**: Required (Admin role)
**Authorization**: Required (`authorize("admin")`)
**Parameters**: None
**Request Body**:
```json
{
  "confirmDeletion": true  // Optional confirmation flag
}
```

**Response Fields**:
```json
{
  "success": boolean,
  "message": string,
  "summary": {
    "totalVideosDeleted": number,
    "cloudinaryVideosDeleted": number,
    "cloudinaryThumbnailsDeleted": number,
    "databaseRecordsDeleted": number,
    "remainingVideos": number,
    "errors": array
  },
  "deletedVideos": [
    {
      "id": string,
      "title": string,
      "uploader": string,
      "uploadedAt": string
    }
  ]
}
```

## Code Location

**Implementation Files**:
- Controller: `server/controllers/video.js` → `deleteAllVideos()` function
- Route: `server/routes/video.js` → `DELETE /` endpoint
- Script: `server/scripts/deleteAllVideos.js` → standalone script
- Admin Tool: `server/scripts/deleteVideosAdmin.js` → interactive tool

**Related Services**:
- Cloudinary deletion: `server/services/cloudinaryUpload.js`
  - `deleteVideoFromCloudinary(publicId)`
  - `deleteThumbnailFromCloudinary(publicId)`

## Related Documentation

- [Cloudinary Integration](./CLOUDINARY_MIGRATION_2026.md)
- [Video Model](../Modals/video.js)
- [Video Controller](../controllers/video.js)

---

**Last Updated**: June 21, 2026
**Tested**: ✓ Verified with test dataset
**Status**: ✓ Ready for Production
