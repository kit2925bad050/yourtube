import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useUser } from "@/lib/AuthContext";
import { useThemeEngine } from "@/lib/ThemeContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useUser();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isOtpLogin, setIsOtpLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { otpMethod } = useThemeEngine();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!isOtpLogin && !formData.password) {
      newErrors.password = "Password is required";
    }

    if (isOtpLogin && otpSent && !otpCode.trim()) {
      newErrors.otpCode = "OTP code is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (isOtpLogin) {
        const response = await axiosInstance.post("/user/verify-otp", {
          email: formData.email,
          otp: otpCode,
        });
        const { result, token } = response.data;
        if (login) login(result, token);
        toast.success("Logged in successfully with OTP!");
      } else {
        const response = await axiosInstance.post("/user/login/email", {
          email: formData.email,
          password: formData.password,
        });
        const { result, token } = response.data;
        if (login) login(result, token);
        toast.success("Logged in successfully!");
      }
      router.push("/");
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Login failed";
      toast.error(message);
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!formData.email.trim()) {
      setErrors({ email: "Email is required" });
      return;
    }

    setOtpLoading(true);
    try {
      const response = await axiosInstance.post("/user/request-otp", {
        email: formData.email,
      });
      setOtpSent(true);
      // Show a generic success message; backend no longer returns the OTP.
      toast.success(response.data.message || "OTP sent successfully. Please check your email.");
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "OTP request failed";
      toast.error(message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card text-foreground rounded-lg border border-border p-8 shadow-xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">YourTube</h1>
            <h2 className="text-xl font-semibold text-muted-foreground">Sign In</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">
                Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                className="mt-1 border border-border bg-input text-foreground placeholder:text-muted-foreground"
                disabled={loading}
              />
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {isOtpLogin ? (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label htmlFor="otpCode">One-Time Password</Label>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading || otpLoading}
                    className="text-sm text-red-500 hover:text-red-400"
                  >
                    {otpLoading ? "Sending..." : otpSent ? "Resend OTP" : "Send OTP"}
                  </button>
                </div>
                {otpMethod && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {otpMethod === "mobile"
                      ? "OTP will be sent to your registered mobile number."
                      : "OTP will be sent to your email address."}
                  </p>
                )}
                <Input
                  id="otpCode"
                  name="otpCode"
                  type="text"
                  placeholder="Enter OTP code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="mt-1 border border-border bg-input text-foreground placeholder:text-muted-foreground"
                  disabled={loading}
                />
                {errors.otpCode && (
                  <p className="text-red-400 text-sm mt-1">{errors.otpCode}</p>
                )}
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-red-500 hover:text-red-400"
                  >
                    Forgot?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-1 border border-border bg-input text-foreground placeholder:text-muted-foreground"
                  disabled={loading}
                />
                {errors.password && (
                  <p className="text-red-400 text-sm mt-1">{errors.password}</p>
                )}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || (isOtpLogin && !otpSent)}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 mt-6"
            >
              {loading
                ? isOtpLogin
                  ? "Verifying OTP..."
                  : "Signing in..."
                : isOtpLogin
                ? "Verify OTP"
                : "Sign In"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOtpLogin((prev) => !prev);
                setErrors({});
                setOtpCode("");
                setOtpSent(false);
              }}
              className="text-sm text-red-400 hover:text-red-200"
            >
              {isOtpLogin ? "Use password login" : "Use OTP login"}
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/auth/signup" className="text-red-500 hover:text-red-400 font-semibold">
                Create one
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-center text-muted-foreground text-sm">
              Or continue with{" "}
              <Link href="/" className="text-red-500 hover:text-red-400 font-semibold">
                Google
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-muted-foreground text-xs mt-8">
          Safe and secure sign in with your email
        </p>
      </div>
    </div>
  );
}
