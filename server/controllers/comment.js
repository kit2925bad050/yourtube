import comment from "../Modals/comment.js";
import mongoose from "mongoose";import { createNotification } from "./notifications.js";
const PROHIBITED_CHARS = /[<>{}[\]\\|^~`]/;

function validateComment(text) {
  if (!text?.trim()) return "Comment cannot be empty";
  if (PROHIBITED_CHARS.test(text)) {
    return "Comment contains prohibited special characters";
  }
  return null;
}

export const postcomment = async (req, res) => {
  const { commentbody, city, language, parentId, ...rest } = req.body;
  const userId = req.userId || rest.userid;
  const error = validateComment(commentbody);
  if (error) return res.status(400).json({ message: error });

  try {
    const postcomment = new comment({
      ...rest,
      userid: userId,
      commentbody,
      city: city || "Unknown",
      language: language || "en",
      parentId: parentId || null,
    });
    await postcomment.save();
    // emit socket event for real-time update
    try {
      const io = (await import("../socket/index.js")).getIo();
      io?.emit("comment:posted", { videoId: postcomment.videoid?.toString(), comment: postcomment });
    } catch (err) {
      console.error("Failed to emit comment posted:", err);
    }
    return res.status(200).json({ comment: postcomment });
  } catch (error) {
    console.error("Post comment error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  const showHidden = req.query.showHidden === "1";
  try {
    const baseFilter = { videoid, parentId: null };
    if (!showHidden) baseFilter.hidden = { $ne: true };

    const comments = await comment
      .find(baseFilter)
      .populate("userid", "name email")
      .sort({ commentedon: -1 });
    const withReplies = await Promise.all(
      comments.map(async (c) => {
        const replyFilter = { parentId: c._id };
        if (!showHidden) replyFilter.hidden = { $ne: true };
        const replies = await comment
          .find(replyFilter)
          .populate("userid", "name email")
          .sort({ commentedon: 1 });
        return { ...c.toObject(), replies };
      })
    );
    return res.status(200).json(withReplies);
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallcomments = async (req, res) => {
  const showHidden = req.query.showHidden === "1";
  try {
    const filter = {};
    if (!showHidden) filter.hidden = { $ne: true };

    const comments = await comment
      .find(filter)
      .populate("userid", "name email")
      .populate("videoid", "videotitle")
      .sort({ commentedon: -1 });

    return res.status(200).json(comments);
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).json({ message: "Comment unavailable" });
  }
  try {
    const c = await comment.findByIdAndDelete(_id);
    await comment.deleteMany({ parentId: _id });
    try {
      const io = (await import("../socket/index.js")).getIo();
      io?.emit("comment:deleted", { videoId: c?.videoid?.toString(), commentId: _id });
    } catch (err) {
      console.error("Failed to emit comment deleted:", err);
    }
    return res.status(200).json({ deleted: true });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const unhidecomment = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ message: "Comment not found" });
  }
  try {
    const c = await comment.findByIdAndUpdate(id, { hidden: false }, { new: true });
    if (!c) {
      return res.status(404).json({ message: "Comment not found" });
    }
    try {
      const Moderation = (await import("../Modals/moderation.js")).default;
      await Moderation.create({
        commentId: c._id,
        action: "unhide",
        reason: "moderator_restored",
        metadata: { restoredBy: req.userId, timestamp: new Date() },
      });
    } catch (logErr) {
      console.error("Failed to create unhide moderation log:", logErr);
    }
    try {
      const io = (await import("../socket/index.js")).getIo();
      io?.emit("comment:updated", {
        videoId: c.videoid?.toString(),
        commentId: c._id,
        hidden: false,
      });
    } catch (err) {
      console.error("Failed to emit comment updated:", err);
    }
    return res.status(200).json({ comment: c });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;
  const error = validateComment(commentbody);
  if (error) return res.status(400).json({ message: error });

  try {
    const updated = await comment.findByIdAndUpdate(
      _id,
      { $set: { commentbody } },
      { new: true }
    );
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const likeComment = async (req, res) => {
  const { id } = req.params;
  const userId = req.userId || req.body.userId;
  try {
    const c = await comment.findById(id);
    if (!c) return res.status(404).json({ message: "Comment not found" });

    c.dislikes = c.dislikes.filter((d) => d.toString() !== userId);
    const alreadyLiked = c.likes.some((l) => l.toString() === userId);
    if (alreadyLiked) {
      c.likes = c.likes.filter((l) => l.toString() !== userId);
    } else {
      c.likes.push(userId);
    }
    await c.save();
    return res.status(200).json({ likes: c.likes.length, dislikes: c.dislikes.length });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const dislikeComment = async (req, res) => {
  const { id } = req.params;
  const userId = req.userId || req.body.userId;
  try {
    const c = await comment.findById(id);
    if (!c) return res.status(404).json({ message: "Comment not found" });
    c.likes = c.likes.filter((l) => l.toString() !== userId);
    const alreadyDisliked = c.dislikes.some((d) => d.toString() === userId);
    if (alreadyDisliked) {
      c.dislikes = c.dislikes.filter((d) => d.toString() !== userId);
    } else {
      c.dislikes.push(userId);
    }

    // If dislikes exceed threshold, mark comment as hidden and add moderation log
    const THRESHOLD = Number(process.env.COMMENT_HIDE_THRESHOLD || 2);
    if (c.dislikes.length >= THRESHOLD) {
      c.hidden = true;
      await c.save();
      // create moderation log
      try {
        const Moderation = (await import("../Modals/moderation.js")).default;
        await Moderation.create({
          commentId: c._id,
          action: "hidden",
          reason: "Exceeded dislike threshold",
          metadata: { dislikes: c.dislikes.length },
        });
      } catch (logErr) {
        console.error("Failed to create moderation log:", logErr);
      }
      return res.status(200).json({ hidden: true, reason: "Too many dislikes" });
    }

    await c.save();
    const io = (await import("../socket/index.js")).getIo();
    io?.emit("comment:updated", { videoId: c.videoid?.toString(), commentId: c._id, likes: c.likes.length, dislikes: c.dislikes.length, hidden: c.hidden || false });
    return res.status(200).json({ likes: c.likes.length, dislikes: c.dislikes.length });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

async function performTranslation(text, targetLang) {
  if (!text || !text.trim()) return text;
  const trimmed = text.trim();

  // 1. Primary: Google Translate GTX endpoint (high accuracy across Hindi, Tamil, Telugu, Kannada, Malayalam, etc.)
  try {
    const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(trimmed)}`;
    const response = await fetch(gtxUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = data[0].map((item) => (item && item[0] ? item[0] : "")).join("").trim();
        if (translated && translated !== trimmed) {
          return translated;
        }
      }
    }
  } catch (err) {
    console.warn("Google translate API fallback trigger:", err?.message || err);
  }

  // 2. Secondary fallback: MyMemory Translated API
  try {
    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=autodetect|${encodeURIComponent(targetLang)}`;
    const response = await fetch(myMemoryUrl);
    if (response.ok) {
      const data = await response.json();
      const translated = data?.responseData?.translatedText;
      if (translated && !translated.startsWith("MYMEMORY WARNING:") && translated.trim()) {
        return translated.trim();
      }
    }
  } catch (err) {
    console.warn("MyMemory translate API fallback trigger:", err?.message || err);
  }

  return trimmed;
}

export const translateComment = async (req, res) => {
  const { id } = req.params;
  const { targetLang = "en" } = req.body;
  try {
    const c = await comment.findById(id);
    if (!c) return res.status(404).json({ message: "Comment not found" });

    const translated = await performTranslation(c.commentbody, targetLang);

    c.translatedText = translated;
    await c.save();

    return res.status(200).json({ translatedText: translated, targetLang, originalText: c.commentbody });
  } catch (error) {
    console.error("translateComment error:", error);
    return res.status(500).json({ message: "Translation failed" });
  }
};

export const replyComment = async (req, res) => {
  const { id } = req.params;
  const userId = req.userId || req.body.userid;
  const { usercommented, commentbody, city } = req.body;
  const error = validateComment(commentbody);
  if (error) return res.status(400).json({ message: error });

  try {
    const parent = await comment.findById(id);
    if (!parent) return res.status(404).json({ message: "Parent comment not found" });

    const reply = await comment.create({
      userid: userId,
      videoid: parent.videoid,
      parentId: id,
      commentbody,
      usercommented,
      city: city || "Unknown",
    });

    if (parent.userid && parent.userid.toString() !== userId) {
      try {
        await createNotification({
          userId: parent.userid,
          type: "Comment Reply",
          message: `${usercommented || "Someone"} replied to your comment.`,
          metadata: { videoId: parent.videoid, commentId: parent._id, replyId: reply._id },
        });
      } catch (notificationErr) {
        console.error("Failed to create comment reply notification:", notificationErr);
      }
    }

    return res.status(201).json(reply);
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};
