import mongoose from "mongoose";

const moderationSchema = mongoose.Schema(
  {
    commentId: { type: mongoose.Schema.Types.ObjectId, ref: "comment" },
    action: { type: String, required: true },
    reason: { type: String },
    metadata: { type: Object },
  },
  { timestamps: true }
);

export default mongoose.model("moderation", moderationSchema);
