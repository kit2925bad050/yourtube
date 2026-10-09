import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { user, login } = useUser();
  const [channelname, setChannelname] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setChannelname(user.channelname || "");
    setDescription(user.description || "");
    setLoading(false);
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const response = await axiosInstance.patch(`/user/update/${user._id}`, {
        channelname: channelname.trim(),
        description: description.trim(),
      });
      const updatedUser = response.data;
      login(updatedUser, localStorage.getItem("token") || "");
      toast.success("Profile saved successfully");
    } catch (error: any) {
      console.error("Profile update failed:", error);
      toast.error(error?.response?.data?.message || "Unable to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-red-500" />
        <p className="mt-4 text-muted-foreground">Loading profile...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex-1 p-6 text-center">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground mt-2">Sign in to view and edit your profile.</p>
        </div>
        <div className="flex justify-center gap-3">
          <Button onClick={() => router.push("/auth/login")}>Sign in</Button>
          <Button variant="secondary" onClick={() => router.push("/auth/signup")}>Create account</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Link href="/">
            <Button variant="ghost" size="icon" className="mr-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Your Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your channel and account information.</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          Subscription: <span className="font-semibold text-foreground">{user.subscriptionPlan || "FREE"}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-6 rounded-2xl border p-6 bg-card">
          <div>
            <h2 className="text-2xl font-semibold">Account details</h2>
            <p className="text-sm text-muted-foreground mt-1">Your email and channel metadata.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Email</label>
              <div className="mt-2 rounded-xl border bg-background px-4 py-3 text-sm text-foreground">
                {user.email}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Name</label>
              <div className="mt-2 rounded-xl border bg-background px-4 py-3 text-sm text-foreground">
                {user.name || "Not provided"}
              </div>
            </div>
            <div>
              <label htmlFor="channelname" className="block text-sm font-medium text-muted-foreground">
                Channel name
              </label>
              <Input
                id="channelname"
                value={channelname}
                onChange={(e) => setChannelname(e.target.value)}
                placeholder="Enter your channel name"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-muted-foreground">
                Channel description
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px]"
                placeholder="Write a short description for your channel"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Your profile information is used to personalize your channel and public profile.
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </section>

        <aside className="space-y-6 rounded-2xl border p-6 bg-card">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Channel summary</h2>
            <p className="text-sm text-muted-foreground">Update your channel name and description here.</p>
          </div>
          <div className="rounded-2xl border p-4 bg-background">
            <p className="text-sm text-muted-foreground">Channel name</p>
            <p className="mt-2 text-base font-medium">{channelname || "Not set"}</p>
          </div>
          <div className="rounded-2xl border p-4 bg-background">
            <p className="text-sm text-muted-foreground">Description</p>
            <p className="mt-2 text-base text-foreground">
              {description || "Add a description to tell viewers about your channel."}
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
