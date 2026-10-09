import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { formatDistanceToNow } from "date-fns";
import { Download, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DownloadsPage() {
  const { user } = useUser();
  const [history, setHistory] = useState<any[]>([]);
  const [count, setCount] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?._id) {
      setLoading(false);
      return;
    }
    Promise.all([
      axiosInstance.get(`/download/history/${user._id}`),
      axiosInstance.get(`/download/count/${user._id}`),
    ]).then(([h, c]) => {
      setHistory(Array.isArray(h.data) ? h.data : []);
      setCount(c.data);
    }).finally(() => setLoading(false));
  }, [user?._id]);

  if (!user) {
    return (
      <main className="flex-1 p-6 text-center">
        <Download className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Downloads</h1>
        <p className="text-muted-foreground">Sign in to view your downloads</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Downloads</h1>
      {count && (
        <p className="text-sm text-muted-foreground mb-6">
          {count.isPremium ? (
            <span className="flex items-center gap-1"><Crown className="w-4 h-4 text-yellow-500" /> Unlimited downloads ({count.plan})</span>
          ) : (
            <>Downloads today: {count.downloadsToday} / {count.limit}</>
          )}
        </p>
      )}
      {!count?.isPremium && (
        <Link href="/subscription">
          <Button variant="outline" className="mb-6">Upgrade for unlimited downloads</Button>
        </Link>
      )}
      {loading ? (
        <p>Loading...</p>
      ) : history.length === 0 ? (
        <p className="text-muted-foreground">No downloads yet. Download videos from the watch page.</p>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div key={item._id} className="flex justify-between items-center border rounded-lg p-4">
              <div>
                <p className="font-medium">{item.videoTitle || "Video"}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.downloadedAt))} ago
                </p>
              </div>
              {item.videoId?._id && (
                <Link href={`/watch/${item.videoId._id}`}>
                  <Button size="sm" variant="ghost">Watch</Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
