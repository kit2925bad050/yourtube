import download from "../Modals/download.js";
import video from "../Modals/video.js";
import users from "../Modals/Auth.js";
import path from "path";
import fs from "fs";
import os from "os";
import { Readable } from "stream";
import { uploadsDir as helperUploadsDir, isServerless as helperIsServerless } from "../filehelper/filehelper.js";
import { normalizeFilePath } from "../utils/normalize.js";

const PREMIUM_PLANS = ["BRONZE", "SILVER", "GOLD"];

export const downloadVideo = async (req, res) => {
  const { videoId } = req.params;
  const userId = req.userId || req.body.userId;

  console.log("DOWNLOAD_REQUEST_RECEIVED", { videoId, userId });

  try {
    const user = await users.findById(userId);
    const vid = await video.findById(videoId);
    if (!user || !vid) {
      console.error("DOWNLOAD_REQUEST_FAILED", { reason: "missing_user_or_video", videoId, userId });
      return res.status(404).json({ message: "User or video not found" });
    }

    console.log("VIDEO_FOUND", {
      videoId: vid._id?.toString?.() || vid._id,
      filename: vid.filename,
      filepath: vid.filepath,
      cloudinaryVideoPublicId: vid.cloudinaryVideoPublicId,
    });

    const isPremium = PREMIUM_PLANS.includes(user.subscriptionPlan);
    const today = new Date().toDateString();
    const lastDl = user.lastDownloadDate
      ? new Date(user.lastDownloadDate).toDateString()
      : null;

    let count = user.downloadsToday || 0;
    if (lastDl !== today) count = 0;

    if (!isPremium && count >= 1) {
      console.warn("DOWNLOAD_LIMIT_REACHED", { userId, videoId, downloadsToday: count });
      return res.status(403).json({
        message: "Free users can download 1 video per day. Upgrade to Premium.",
      });
    }

    user.downloadsToday = count + 1;
    user.lastDownloadDate = new Date();
    await user.save();

    await download.create({
      userId,
      videoId,
      videoTitle: vid.videotitle,
    });

    // In serverless, files may not be present on disk. Prefer external storage.
    const defaultUploads = helperUploadsDir || path.join(process.cwd(), "uploads");
    let filePath = normalizeFilePath(vid.filepath || "").replace(/^\/+/, "");
    const isRemoteFile = /^(https?:)?\/\//i.test(filePath);
    if (isRemoteFile) {
      const remoteUrl = filePath.startsWith("//") ? `https:${filePath}` : filePath;
      console.log("VIDEO_URL", { remoteUrl });
      console.log("CLOUDINARY_FETCH_START", { remoteUrl });
      const remoteResponse = await fetch(remoteUrl);
      if (!remoteResponse.ok) {
        console.error("CLOUDINARY_FETCH_FAILED", {
          remoteUrl,
          status: remoteResponse.status,
          statusText: remoteResponse.statusText,
        });
        return res.status(502).json({ message: "Failed to fetch remote video file" });
      }
      if (!remoteResponse.body) {
        console.error("CLOUDINARY_FETCH_FAILED", { reason: "missing_body", remoteUrl });
        return res.status(502).json({ message: "Failed to stream remote video file" });
      }

      const filename = vid.filename || "video.mp4";
      const contentType = remoteResponse.headers.get("content-type") || "application/octet-stream";
      const contentDisposition = `attachment; filename="${encodeURIComponent(filename)}"`;
      const contentLength = remoteResponse.headers.get("content-length");

      console.log("CLOUDINARY_FETCH_SUCCESS", {
        remoteUrl,
        status: remoteResponse.status,
        contentType,
        contentLength,
      });

      res.setHeader("Content-Disposition", contentDisposition);
      res.setHeader("Content-Type", contentType);
      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }

      const stream = Readable.fromWeb(remoteResponse.body);
      stream.on("error", (streamError) => {
        console.error("DOWNLOAD_STREAM_ERROR", { remoteUrl, error: streamError });
        if (!res.headersSent) {
          res.status(502).json({ message: "Download stream error" });
        } else {
          res.destroy(streamError);
        }
      });
      stream.pipe(res);
      console.log("DOWNLOAD_RESPONSE_SENT", { mode: "remote", remoteUrl });
      return;
    }

    if (!path.isAbsolute(filePath)) {
      if (filePath.startsWith("uploads/")) {
        filePath = filePath.replace(/^uploads\//, "");
      }
      filePath = path.join(defaultUploads, filePath);
    }
    filePath = path.resolve(filePath);
    if (helperIsServerless && !filePath.startsWith(defaultUploads)) {
      // If the filepath is not within the configured uploads dir, we cannot access it in serverless.
      return res.status(503).json({ message: "Video downloads are not available in serverless deployment. Please use external storage." });
    }

    if (!fs.existsSync(filePath)) {
      console.error("DOWNLOAD_REQUEST_FAILED", { reason: "file_missing", filePath });
      return res.status(404).json({ message: "Video file not found on server" });
    }

    console.log("VIDEO_URL", { localPath: filePath });
    const fileName = vid.filename || "video.mp4";
    res.download(filePath, fileName, (downloadError) => {
      if (downloadError) {
        console.error("DOWNLOAD_RESPONSE_ERROR", { filePath, error: downloadError });
        if (!res.headersSent) {
          res.status(500).json({ message: "Failed to send local video file" });
        }
        return;
      }
      console.log("DOWNLOAD_RESPONSE_SENT", { mode: "local", filePath, fileName });
    });
  } catch (error) {
    console.error("Download error:", error?.stack || error);
  }
};

export const getDownloadHistory = async (req, res) => {
  const userId = req.userId || req.params.userId;
  try {
    const history = await download
      .find({ userId })
      .populate("videoId")
      .sort({ downloadedAt: -1 });
    return res.status(200).json(history);
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getDownloadCount = async (req, res) => {
  const userId = req.userId || req.params.userId;
  try {
    const user = await users.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const today = new Date().toDateString();
    const lastDl = user.lastDownloadDate
      ? new Date(user.lastDownloadDate).toDateString()
      : null;
    let count = user.downloadsToday || 0;
    if (lastDl !== today) count = 0;

    const isPremium = PREMIUM_PLANS.includes(user.subscriptionPlan);

    return res.status(200).json({
      downloadsToday: count,
      limit: isPremium ? null : 1,
      isPremium,
      plan: user.subscriptionPlan,
    });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};
