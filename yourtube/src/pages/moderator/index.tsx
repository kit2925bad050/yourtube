import { useEffect, useState } from "react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Trash2 } from "lucide-react";

interface ModerationLog {
  _id: string;
  commentId: string;
  action: string;
  reason: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

interface HiddenComment {
  _id: string;
  userid: {
    name?: string;
    email?: string;
  } | string;
  videoid: string;
  commentbody: string;
  hidden: boolean;
  likes: string[];
  dislikes: string[];
  createdAt: string;
  user?: {
    name: string;
    email: string;
  };
}

export default function ModeratorDashboard() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [hiddenComments, setHiddenComments] = useState<HiddenComment[]>([]);
  const [moderationLogs, setModerationLogs] = useState<ModerationLog[]>([]);
  const [activeTab, setActiveTab] = useState<"hidden" | "logs">("hidden");

  const isAuthorized = user?.role === "admin" || user?.role === "moderator";

  useEffect(() => {
    if (!user || !isAuthorized) {
      return;
    }

    loadData();
  }, [user, isAuthorized]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch hidden comments
      const commentsRes = await axiosInstance.get("/comment/getall?showHidden=1");
      const hidden = commentsRes.data.filter((comment: HiddenComment) => comment.hidden);
      setHiddenComments(hidden);

      // Fetch moderation logs
      const logsRes = await axiosInstance.get("/moderation/logs");
      setModerationLogs(logsRes.data || []);
    } catch (error: any) {
      console.error("Failed to load moderation data:", error);
      toast.error("Failed to load moderation data");
    } finally {
      setLoading(false);
    }
  };

  const handleUnhideComment = async (commentId: string) => {
    try {
      await axiosInstance.put(`/comment/unhide/${commentId}`);
      toast.success("Comment unhidden");
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to unhide comment");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to permanently delete this comment?")) {
      return;
    }

    try {
      await axiosInstance.delete(`/comment/delete/${commentId}`);
      toast.success("Comment deleted");
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete comment");
    }
  };

  if (!user) {
    return (
      <main className="flex-1 p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Moderator Dashboard</h1>
        <p className="text-muted-foreground">Sign in to access moderation tools</p>
      </main>
    );
  }

  if (!isAuthorized) {
    return (
      <main className="flex-1 p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground">
          You need moderator or admin access to view this page.
        </p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold">Moderator Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Manage flagged content and moderation logs
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab("hidden")}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === "hidden"
              ? "border-red-600 text-red-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Hidden Comments ({hiddenComments.length})
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === "logs"
              ? "border-red-600 text-red-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Moderation Logs ({moderationLogs.length})
        </button>
      </div>

      {/* Hidden Comments Tab */}
      {activeTab === "hidden" && (
        <div>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
              <p className="text-muted-foreground mt-2">Loading...</p>
            </div>
          ) : hiddenComments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No hidden comments</p>
              <p className="text-muted-foreground text-sm mt-2">
                Comments with 2+ dislikes are automatically hidden
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {hiddenComments.map((comment) => (
                <div
                  key={comment._id}
                  className="border rounded-lg p-4 bg-slate-900/50 hover:bg-slate-900/70 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-sm">
                          {typeof comment.userid === "object"
                            ? comment.userid?.name || comment.user?.name || "Unknown User"
                            : comment.user?.name || "Unknown User"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {typeof comment.userid === "object"
                            ? comment.userid?.email || comment.user?.email || ""
                            : comment.user?.email || ""}
                        </span>
                      </div>
                      <p className="text-foreground mb-2">{comment.commentbody}</p>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>👍 {comment.likes?.length || 0} likes</span>
                        <span>👎 {comment.dislikes?.length || 0} dislikes</span>
                        <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnhideComment(comment._id)}
                        title="Unhide comment"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteComment(comment._id)}
                        title="Delete comment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Moderation Logs Tab */}
      {activeTab === "logs" && (
        <div>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
              <p className="text-muted-foreground mt-2">Loading...</p>
            </div>
          ) : moderationLogs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No moderation logs yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {moderationLogs.map((log) => (
                <div
                  key={log._id}
                  className="border rounded-lg p-4 bg-slate-900/50 hover:bg-slate-900/70 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm capitalize">
                          {log.action}
                        </span>
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
                          {log.reason}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Comment ID: {log.commentId.substring(0, 12)}...
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Refresh Button */}
      <div className="mt-6 flex gap-2">
        <Button
          onClick={loadData}
          disabled={loading}
          variant="outline"
        >
          Refresh
        </Button>
      </div>
    </main>
  );
}
