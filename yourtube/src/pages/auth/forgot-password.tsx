import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email");
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.post("/user/forgot", {
        email,
      });

      setEmailSent(true);
      toast.success("Password reset email sent! Check your inbox.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to send reset email");
      console.error("Forgot password error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card text-foreground rounded-lg border border-border p-8 shadow-xl text-center">
            <div className="mb-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Email Sent!</h2>
              <p className="text-muted-foreground">
                We&apos;ve sent a password reset link to <strong>{email}</strong>
              </p>
            </div>

            <div className="bg-input/80 rounded-lg p-4 mb-6 border border-border">
              <p className="text-muted-foreground text-sm">
                Please check your email and click the reset link. The link will expire in 1 hour.
              </p>
            </div>

            <p className="text-muted-foreground text-sm mb-6">
              Didn&apos;t receive the email? Check your spam folder or{" "}
              <button
                onClick={() => {
                  setEmailSent(false);
                  setEmail("");
                }}
                className="text-red-500 hover:text-red-400 font-semibold"
              >
                try again
              </button>
            </p>

            <Link href="/auth/login">
              <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2">
                Back to Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card text-foreground rounded-lg border border-border p-8 shadow-xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">YourTube</h1>
            <h2 className="text-xl font-semibold text-muted-foreground">Reset Password</h2>
          </div>

          <p className="text-muted-foreground text-sm mb-6 text-center">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                className="mt-1 border border-border bg-input text-foreground placeholder:text-muted-foreground"
                disabled={loading}
              />
              {error && (
                <p className="text-destructive text-sm mt-1">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 mt-6"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              Remember your password?{" "}
              <Link href="/auth/login" className="text-red-500 hover:text-red-400 font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
