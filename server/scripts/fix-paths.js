import mongoose from "mongoose";
import video from "../Modals/video.js";
import { normalizeFilePath } from "../utils/normalize.js";
import { connectDatabase } from "../config/database.js";
import dotenv from "dotenv";

dotenv.config();

async function fixPaths() {
  await connectDatabase();
  const videos = await video.find();
  for (const v of videos) {
    if (v.filepath.includes("\\")) {
      v.filepath = normalizeFilePath(v.filepath);
      await v.save();
      console.log("Fixed:", v.videotitle);
    }
  }
  console.log("Done. Fixed", videos.length, "videos checked.");
  await mongoose.disconnect();
}

fixPaths().catch(console.error);
