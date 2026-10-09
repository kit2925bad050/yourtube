import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface PageState {
  status: "loading" | "valid" | "invalid" | "resetting" | "success";
  message?: string;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const { token } = router.query;
  const [pageState, setPageState] = useState<PageState>({ status: "loading" });
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) return;

    // Verify token is valid (optional - could be done on submit too)
    // For now, we'll just set it to valid state
    setPageState({ status: "valid" });
  }, [token]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setPageState({ status: "resetting" });
    try {
      const response = await axiosInstance.post(`/user/reset/${token}`, {
        password: formData.password,
      });

      toast.success("Password reset successfully!");
      setPageState({ status: "success", message: response.data.message });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || "Failed to reset password";
      if (errorMsg.includes("invalid") || errorMsg.includes("expired")) {
        setPageState({ status: "invalid", message: errorMsg });
      } else {
        toast.error(errorMsg);
        setPageState({ status: "valid" });
      }
      console.error("Reset password error:", error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  if (pageState.status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
          <p className="text-muted-foreground mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (pageState.status === "invalid") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card text-foreground rounded-lg border border-border p-8 shadow-xl text-center">
            <div className="mb-8">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Invalid Link</h2>
              <p className="text-muted-foreground">{pageState.message || "This password reset link is invalid or has expired."}</p>
            </div>

            <div className="bg-input/80 rounded-lg p-4 mb-6 border border-border">
              <p className="text-muted-foreground text-sm">
                Password reset links expire after 1 hour. Please request a new one.
              </p>
            </div>

            <Button
              onClick={() => router.push("/auth/forgot-password")}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2"
            >
              Request New Link
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (pageState.status === "success") {
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
              <h2 className="text-2xl font-bold text-foreground mb-2">Password Reset!</h2>
              <p className="text-muted-foreground">
                Your password has been successfully reset. Redirecting to login...
              </p>
            </div>
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
            <h2 className="text-xl font-semibold text-muted-foreground">Create New Password</h2>
          </div>

          <p className="text-muted-foreground text-sm mb-6 text-center">
            Enter your new password below. Make sure it&apos;s at least 6 characters long.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter new password"
                value={formData.password}
                onChange={handleChange}
                className="mt-1 border border-border bg-input text-foreground placeholder:text-muted-foreground"
                disabled={pageState.status === "resetting"}
              />
              {errors.password && (
                <p className="text-destructive text-sm mt-1">{errors.password}</p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="mt-1 border border-border bg-input text-foreground placeholder:text-muted-foreground"
                disabled={pageState.status === "resetting"}
              />
              {errors.confirmPassword && (
                <p className="text-destructive text-sm mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={pageState.status === "resetting"}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 mt-6"
            >
              {pageState.status === "resetting" ? "Resetting..." : "Reset Password"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              Remember your password?{" "}
              <button
                onClick={() => router.push("/auth/login")}
                className="text-red-500 hover:text-red-400 font-semibold"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
