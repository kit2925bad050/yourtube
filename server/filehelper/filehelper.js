"use strict";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isServerless = !!(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT
);

const defaultUploads = isServerless
  ? path.join(os.tmpdir(), "uploads")
  : path.join(__dirname, "..", "uploads");

const uploadsDir = path.resolve(process.env.UPLOADS_DIR || defaultUploads);
const videosDir = path.join(uploadsDir);
const thumbnailsDir = path.join(uploadsDir, "thumbnails");

// Diagnostic: log chosen storage strategy and paths
console.log("Filehelper: isServerless=", isServerless);
console.log("Filehelper: uploadsDir=", uploadsDir);
console.log("Filehelper: videosDir=", videosDir);
console.log("Filehelper: thumbnailsDir=", thumbnailsDir);

// Do NOT create directories at module load time when running in serverless.
// For non-serverless environments, multer's destination will ensure dirs exist.

let storage;
if (isServerless) {
  // Keep files in memory; handlers will write to /tmp when needed.
  storage = multer.memoryStorage();
} else {
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dest = file.fieldname === "thumbnailFile" ? thumbnailsDir : videosDir;
      fs.mkdir(dest, { recursive: true }, (err) => {
        // if mkdir fails for permission reasons, return the error to multer
        cb(err, dest);
      });
    },
    filename: (req, file, cb) => {
      cb(null, new Date().toISOString().replace(/:/g, "-") + "-" + file.originalname);
    },
  });
}

const filefilter = (req, file, cb) => {
  if (file.fieldname === "file") {
    cb(null, file.mimetype.startsWith("video/"));
    return;
  }

  if (file.fieldname === "thumbnailFile") {
    cb(null, file.mimetype.startsWith("image/"));
    return;
  }

  cb(null, false);
};

const upload = multer({ storage: storage, fileFilter: filefilter });
export { uploadsDir, thumbnailsDir, videosDir, isServerless };
export default upload;
