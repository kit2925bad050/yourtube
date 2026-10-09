import React, { useEffect, useState } from "react";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

type NotificationItem = {
  _id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
};

const NotificationsPage = () => {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get("/notifications");
      setNotifications(response.data);
    } catch (err) {
      console.error(err);
      setError("Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (notificationId: string) => {
    try {
      await axiosInstance.put(`/notifications/mark-read/${notificationId}`);
      setNotifications((current) =>
        current.map((item) =>
          item._id === notificationId ? { ...item, read: true } : item
        )
      );
      window.dispatchEvent(new Event("notifications-updated"));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await axiosInstance.put("/notifications/mark-all-read");
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
      window.dispatchEvent(new Event("notifications-updated"));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
  }, [user]);

  if (!user) {
    return (
      <main className="px-4 py-6 mx-auto max-w-6xl">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="mt-4 text-muted-foreground">Please sign in to view your notifications.</p>
        <div className="mt-4">
          <Link href="/auth/login">
            <Button>Sign in</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 py-6 mx-auto max-w-6xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">Recent activity for your account.</p>
        </div>
        <Button onClick={markAllRead} disabled={loading || notifications.every((item) => item.read)}>
          Mark all as read
        </Button>
      </div>

      <section className="mt-6 space-y-3">
        {loading && <div className="rounded-lg border border-muted/30 bg-background p-6">Loading notifications...</div>}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>}
        {!loading && notifications.length === 0 && (
          <div className="rounded-lg border border-muted/30 bg-background p-6 text-muted-foreground">
            You don&apos;t have any notifications yet.
          </div>
        )}
        {notifications.map((notification) => (
          <div
            key={notification._id}
            className={`rounded-xl border p-5 shadow-sm transition ${
              notification.read ? "border-muted/30 bg-muted/5" : "border-blue-200 bg-blue-50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{notification.type}</p>
                <p className="mt-1 text-sm text-slate-700">{notification.message}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</p>
                {!notification.read && (
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => markRead(notification._id)}>
                    Mark read
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
};

export default NotificationsPage;
