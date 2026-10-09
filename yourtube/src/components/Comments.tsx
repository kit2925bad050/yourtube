import React, { useEffect, useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { ThumbsDown, ThumbsUp, Languages, MapPin } from "lucide-react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  commentedon: string;
  city?: string;
  translatedText?: string;
  likes?: string[];
  dislikes?: string[];
  replies?: Comment[];
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "ml", label: "Malayalam" },
  { code: "kn", label: "Kannada" },
];

const Comments = ({ videoId }: { videoId: string }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [language, setLanguage] = useState("en");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const { user } = useUser();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedLanguage = window.localStorage.getItem("yourtube.commentLanguage");
    if (storedLanguage) {
      setLanguage(storedLanguage);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("yourtube.commentLanguage", language);
  }, [language]);

  const loadComments = useCallback(async () => {
    if (!videoId) return;
    try {
      const res = await axiosInstance.get(`/comment/${videoId}`);
      setComments(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    if (videoId) loadComments();
    const socket = getSocket();
    const onPosted = (payload: any) => {
      if (payload?.videoId === videoId) {
        // prepend new comment
        setComments((prev) => [payload.comment, ...prev]);
      }
    };
    const onUpdated = (payload: any) => {
      if (payload?.videoId === videoId) {
        // reload comments for simplicity
        loadComments();
      }
    };
    const onDeleted = (payload: any) => {
      if (payload?.videoId === videoId) loadComments();
    };

    socket?.on("comment:posted", onPosted);
    socket?.on("comment:updated", onUpdated);
    socket?.on("comment:deleted", onDeleted);
    return () => {
      socket?.off("comment:posted", onPosted);
      socket?.off("comment:updated", onUpdated);
      socket?.off("comment:deleted", onDeleted);
    };
  }, [videoId, loadComments]);

  

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        userid: user._id,
        commentbody: newComment,
        usercommented: user.name,
        city: user.city || "Unknown",
        language,
      });
      if (res.data.comment) {
        setComments([res.data.comment, ...comments]);
        setNewComment("");
        toast.success("Comment added");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (id: string) => {
    if (!user) return;
    const res = await axiosInstance.post(`/comment/like/${id}`, { userId: user._id });
    loadComments();
    return res.data;
  };

  const handleDislike = async (id: string) => {
    if (!user) return;
    const res = await axiosInstance.post(`/comment/dislike/${id}`, { userId: user._id });
    if (res.data.deleted) toast.info("Comment removed due to dislikes");
    loadComments();
  };

  const updateCommentTranslation = (list: Comment[], commentId: string, translatedText: string): Comment[] => {
    return list.map((c) => {
      if (c._id === commentId) {
        return { ...c, translatedText };
      }
      if (c.replies && c.replies.length > 0) {
        return { ...c, replies: updateCommentTranslation(c.replies, commentId, translatedText) };
      }
      return c;
    });
  };

  const handleTranslate = async (id: string, targetLang: string) => {
    if (!targetLang) return;
    try {
      const res = await axiosInstance.post(`/comment/translate/${id}`, { targetLang });
      const translatedText = res.data?.translatedText;
      if (translatedText) {
        setComments((prev) => updateCommentTranslation(prev, id, translatedText));
        const langName = LANGUAGES.find((l) => l.code === targetLang)?.label || targetLang;
        toast.success(`Translated to ${langName}`);
      }
      return translatedText;
    } catch (error) {
      console.error("Translation error:", error);
      toast.error("Failed to translate comment");
    }
  };

  const handleReply = async (parentId: string) => {
    if (!user || !replyText.trim()) return;
    try {
      await axiosInstance.post(`/comment/reply/${parentId}`, {
        userid: user._id,
        usercommented: user.name,
        commentbody: replyText,
        city: user.city || "Unknown",
      });
      setReplyText("");
      setReplyTo(null);
      loadComments();
      toast.success("Reply posted");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to reply");
    }
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment._id} className={`flex gap-4 ${isReply ? "ml-12 mt-3" : ""}`}>
      <Avatar className="w-10 h-10">
        <AvatarFallback>{comment.usercommented?.[0] || "?"}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-medium text-sm">{comment.usercommented}</span>
          {comment.city && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {comment.city}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.commentedon))} ago
          </span>
        </div>
        <p className="text-sm">{comment.translatedText || comment.commentbody}</p>
        {comment.translatedText && (
          <p className="text-xs text-muted-foreground mt-1 italic">
            Original: {comment.commentbody}
          </p>
        )}
        <div className="flex items-center gap-3 mt-2">
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => handleLike(comment._id)}
          >
            <ThumbsUp className="w-4 h-4" /> {comment.likes?.length || 0}
          </button>
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => handleDislike(comment._id)}
          >
            <ThumbsDown className="w-4 h-4" /> {comment.dislikes?.length || 0}
          </button>
          <select
            className="text-xs border border-slate-300 rounded px-2 py-1 min-w-[120px] focus:ring-2 focus:ring-sky-500"
            onChange={(e) => handleTranslate(comment._id, e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>
              Translate
            </option>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          {!isReply && user && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setReplyTo(comment._id)}
            >
              Reply
            </button>
          )}
        </div>
        {replyTo === comment._id && (
          <div className="mt-2 flex gap-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Add a reply..."
              className="min-h-[60px] border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <Button size="sm" onClick={() => handleReply(comment._id)}>
              Reply
            </Button>
          </div>
        )}
        {comment.replies?.map((r) => renderComment(r, true))}
      </div>
    </div>
  );

  if (loading) return <div>Loading comments...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{comments.length} Comments</h2>

      {user && (
        <div className="flex gap-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="text-sm border border-slate-300 rounded px-2 py-1 min-w-[140px] focus:ring-2 focus:ring-sky-500"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setNewComment("")} disabled={!newComment.trim()}>
                Cancel
              </Button>
              <Button onClick={handleSubmitComment} disabled={!newComment.trim() || isSubmitting}>
                Comment
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No comments yet. Be the first!</p>
        ) : (
          comments.map((c) => renderComment(c))
        )}
      </div>
    </div>
  );
};

export default Comments;
