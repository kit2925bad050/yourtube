import { v2 as cloudinary } from 'cloudinary';

// Lazily configure Cloudinary when needed to ensure dotenv has run
function ensureCloudinaryConfigured() {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const cfg = cloudinary.config();
    console.log("Cloudinary runtime config:", {
      cloud_name: cfg.cloud_name || process.env.CLOUDINARY_CLOUD_NAME || "(not set)",
      api_key_exists: !!process.env.CLOUDINARY_API_KEY,
      api_secret_exists: !!process.env.CLOUDINARY_API_SECRET,
    });
  } catch (e) {
    console.warn("Could not configure Cloudinary:", e && e.message ? e.message : e);
  }
}

/**
 * Upload video to Cloudinary
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} fileName - Original filename (for reference)
 * @returns {Promise} Cloudinary upload response
 */
export const uploadVideoToCloudinary = async (fileBuffer, fileName) => {
  ensureCloudinaryConfigured();
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder: 'yourtube_videos',
        public_id: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          console.error("CLOUDINARY UPLOAD ERROR (video):", error && error.message ? error.message : error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    // Stream the buffer to Cloudinary
    uploadStream.end(fileBuffer);
  });
};

/**
 * Upload thumbnail to Cloudinary
 * @param {Buffer} fileBuffer - The thumbnail buffer to upload
 * @param {string} videoId - MongoDB video ID for naming
 * @returns {Promise} Cloudinary upload response
 */
export const uploadThumbnailToCloudinary = async (fileBuffer, videoId) => {
  ensureCloudinaryConfigured();
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: 'yourtube_thumbnails',
        public_id: `thumbnail_${videoId}`,
        unique_filename: false,
        overwrite: true,
        format: 'png',
      },
      (error, result) => {
        if (error) {
          console.error("CLOUDINARY UPLOAD ERROR (thumbnail):", error && error.message ? error.message : error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    // Stream the buffer to Cloudinary
    uploadStream.end(fileBuffer);
  });
};

/**
 * Delete a video from Cloudinary
 * @param {string} publicId - The public ID of the video to delete
 * @returns {Promise} Cloudinary deletion response
 */
export const deleteVideoFromCloudinary = async (publicId) => {
  return cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
};

/**
 * Delete a thumbnail from Cloudinary
 * @param {string} publicId - The public ID of the thumbnail to delete
 * @returns {Promise} Cloudinary deletion response
 */
export const deleteThumbnailFromCloudinary = async (publicId) => {
  return cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
};

export default cloudinary;
