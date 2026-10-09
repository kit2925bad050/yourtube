import video from "../Modals/video.js";
import dislike from "../Modals/dislike.js";
import { getIo } from "../socket/index.js";

export const handledislike = async (req, res) => {
  const userId = req.userId || req.body.userId;
  const { videoId } = req.params;
  try {
    const existing = await dislike.findOne({ viewer: userId, videoid: videoId });
    if (existing) {
      await dislike.findByIdAndDelete(existing._id);
      await video.findByIdAndUpdate(videoId, { $inc: { Dislike: -1 } });
      const v = await video.findById(videoId);
      getIo()?.emit("video:dislike", { videoId, dislikes: v?.Dislike || 0 });
      return res.status(200).json({ disliked: false, dislikes: v?.Dislike || 0 });
    } else {
      await dislike.create({ viewer: userId, videoid: videoId });
      await video.findByIdAndUpdate(videoId, { $inc: { Dislike: 1 } });
      const v = await video.findById(videoId);
      getIo()?.emit("video:dislike", { videoId, dislikes: v?.Dislike || 0 });
      return res.status(200).json({ disliked: true, dislikes: v?.Dislike || 0 });
    }
  } catch (error) {
    console.error("dislike error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
