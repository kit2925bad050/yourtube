import video from "../Modals/video.js";
import like from "../Modals/like.js";
import dislike from "../Modals/dislike.js";
import { getIo } from "../socket/index.js";

export const handlelike = async (req, res) => {
  const userId = req.userId || req.body.userId;
  const { videoId } = req.params;
  try {
    const exisitinglike = await like.findOne({
      viewer: userId,
      videoid: videoId,
    });
    if (exisitinglike) {
      await like.findByIdAndDelete(exisitinglike._id);
      await video.findByIdAndUpdate(videoId, { $inc: { Like: -1 } });
      const v = await video.findById(videoId);
      const io = getIo();
      io?.emit("video:like", { videoId, likes: v?.Like || 0 });
      return res.status(200).json({ liked: false, likes: v?.Like || 0 });
    } else {
      await like.create({ viewer: userId, videoid: videoId });
      await video.findByIdAndUpdate(videoId, { $inc: { Like: 1 } });
      const v = await video.findById(videoId);
      const io = getIo();
      io?.emit("video:like", { videoId, likes: v?.Like || 0 });
      return res.status(200).json({ liked: true, likes: v?.Like || 0 });
    }
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallLikedVideo = async (req, res) => {
  const userId = req.userId || req.params.userId;
  try {
    const likevideo = await like
      .find({ viewer: userId })
      .populate({
        path: "videoid",
        model: "videofiles",
      })
      .exec();
    return res.status(200).json(likevideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
