import mongoose from "mongoose";

const downloadschema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },
    videoTitle: { type: String },
    downloadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("download", downloadschema);
