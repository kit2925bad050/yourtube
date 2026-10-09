import ModerationLog from "../Modals/moderation.js";
import Comment from "../Modals/comment.js";

export const getModerationLogs = async (req, res) => {
  try {
    const logs = await ModerationLog.find()
      .populate("commentId")
      .sort({ timestamp: -1 })
      .limit(100);
    return res.status(200).json(logs);
  } catch (error) {
    console.error("Error fetching moderation logs:", error);
    return res.status(500).json({ message: "Error fetching moderation logs" });
  }
};

export const unhideComment = async (req, res) => {
  const { commentId } = req.params;
  try {
    const comment = await Comment.findByIdAndUpdate(
      commentId,
      { hidden: false },
      { new: true }
    );

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Log the unhide action
    await ModerationLog.create({
      commentId: comment._id,
      action: "unhide",
      reason: "manual_review",
      metadata: { timestamp: new Date() },
    });

    return res.status(200).json({
      message: "Comment unhidden",
      result: comment,
    });
  } catch (error) {
    console.error("Error unhiding comment:", error);
    return res.status(500).json({ message: "Error unhiding comment" });
  }
};

export const approveComment = async (req, res) => {
  const { commentId } = req.params;
  try {
    const comment = await Comment.findByIdAndUpdate(
      commentId,
      { hidden: false },
      { new: true }
    );

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    await ModerationLog.create({
      commentId: comment._id,
      action: "approve",
      reason: "moderator_review",
    });

    return res.status(200).json({
      message: "Comment approved",
      result: comment,
    });
  } catch (error) {
    console.error("Error approving comment:", error);
    return res.status(500).json({ message: "Error approving comment" });
  }
};

export const rejectComment = async (req, res) => {
  const { commentId } = req.params;
  const { reason } = req.body;

  try {
    const comment = await Comment.findByIdAndUpdate(
      commentId,
      { hidden: true },
      { new: true }
    );

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    await ModerationLog.create({
      commentId: comment._id,
      action: "reject",
      reason: reason || "violation",
    });

    return res.status(200).json({
      message: "Comment rejected",
      result: comment,
    });
  } catch (error) {
    console.error("Error rejecting comment:", error);
    return res.status(500).json({ message: "Error rejecting comment" });
  }
};
