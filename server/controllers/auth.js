import jwt from "jsonwebtoken";
import users from "../Modals/Auth.js";
import crypto from "crypto";
import nodemailer from "nodemailer";

const SOUTH_STATES = [
  "Tamil Nadu",
  "Kerala",
  "Karnataka",
  "Andhra Pradesh",
  "Telangana",
];

const PLAN_LIMITS = {
  FREE: 5,
  BRONZE: 7,
  SILVER: 10,
  GOLD: Infinity,
};

const OTP_TTL_MS = 5 * 60 * 1000;

// Get JWT secret with validation
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET environment variable is required in production");
    }
    console.warn("⚠️  JWT_SECRET not set, using development default (INSECURE)");
    return "yourtube_secret_dev_only";
  }
  return secret;
}

function signToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email },
    getJwtSecret(),
    { expiresIn: "7d" }
  );
}

function sanitizeUser(user) {
  if (!user) return null;
  const cleaned = user.toObject ? user.toObject() : { ...user };
  delete cleaned.passwordHash;
  delete cleaned.resetToken;
  delete cleaned.resetExpires;
  delete cleaned.otpCode;
  delete cleaned.otpExpires;
  delete cleaned.otpMethod;
  return cleaned;
}

function getSmtpConfig() {
  const user =
    process.env.SMTP_USER || process.env.EMAIL_USER || process.env.SMTP_EMAIL || process.env.EMAIL_USER_ALT;
  const pass =
    process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || process.env.SMTP_PASSWORD || process.env.EMAIL_PASS;
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = port === 465;
  return { user, pass, host, port, secure };
}

function isEmailConfigured() {
  const { user, pass } = getSmtpConfig();
  return Boolean(user && pass);
}

function getMaskedUser(user) {
  if (!user) return "(not configured)";
  return user.includes("@") ? user.replace(/^(.).+(.+)@/, "$1***$2@") : "***";
}

async function sendResetEmail(user, token) {
  const smtp = getSmtpConfig();
  if (!smtp.user || !smtp.pass) {
    console.warn(`SMTP credentials are missing. Password reset token for ${user.email}: ${token}`);
    return;
  }
  console.log(`Sending reset email to ${user.email} via ${smtp.host}:${smtp.port}`);
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });
  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password/${token}`;
  const info = await transporter.sendMail({
    from: smtp.user,
    to: user.email,
    subject: "YourTube Password Reset",
    text: `Reset your password: ${resetUrl}`,
  });
  console.log(`Reset email sent to ${user.email}, messageId=${info.messageId}`);
}

async function sendOtpEmail(user, otp) {
  const smtp = getSmtpConfig();
  if (!smtp.user || !smtp.pass) {
    const masked = getMaskedUser(smtp.user);
    const msg = `SMTP credentials not configured. Set SMTP_USER and SMTP_PASS. Current SMTP user: ${masked}`;
    console.error(msg);
    throw new Error(msg);
  }

  console.log(`Sending OTP email to ${user.email} via ${smtp.host}:${smtp.port} (user=${getMaskedUser(smtp.user)})`);
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });
  const info = await transporter.sendMail({
    from: smtp.user,
    to: user.email,
    subject: "YourTube OTP Verification",
    text: `Your verification code is ${otp}. It expires in 5 minutes.`,
  });
  console.log(`OTP email sent to ${user.email}, messageId=${info.messageId}`);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  const [salt, key] = stored.split(":");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return derived === key;
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"]?.split(",")[0];
  const remoteAddress = req.socket?.remoteAddress || "";
  const ip = forwarded || remoteAddress || "";
  return ip === "::1" || ip === "127.0.0.1" ? "" : ip;
}

async function lookupLocation(ip) {
  const defaultLocation = { city: "Chennai", state: "Tamil Nadu", country: "India" };
  if (!ip) return defaultLocation;

  try {
    const geoRes = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,city,regionName,country`
    );
    const geo = await geoRes.json();
    if (geo.status === "success") {
      return {
        city: geo.city || "Unknown",
        state: geo.regionName || "Unknown",
        country: geo.country || "Unknown",
      };
    }
  } catch (err) {
    console.warn("Location lookup failed, using default location", err);
  }

  return defaultLocation;
}

function getOtpMethodForState(state) {
  return SOUTH_STATES.includes(state) ? "email" : "mobile";
}

function getIstTheme(state) {
  const isSouth = SOUTH_STATES.includes(state);
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  const hour = ist.getUTCHours();
  const isMorningWindow = hour >= 10 && hour < 12;
  return isMorningWindow && isSouth ? "light" : "dark";
}

async function sendOtpSms(user, otp) {
  const phoneDisplay = user.phone || "registered mobile number";
  console.log(`Simulated SMS to ${phoneDisplay}: OTP sent (masked)`);
  return;
}

export const signup = async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password required" });
  try {
    const existing = await users.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });
    const passwordHash = hashPassword(password);
    const user = await users.create({ email, name, passwordHash });
    const token = signToken(user);
    return res.status(201).json({ result: sanitizeUser(user), token });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const loginWithPassword = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password required" });
  try {
    const user = await users.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!verifyPassword(password, user.passwordHash)) return res.status(401).json({ message: "Invalid credentials" });
    const token = signToken(user);
    return res.status(200).json({ result: sanitizeUser(user), token });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });
  try {
    const user = await users.findOne({ email });
    if (!user) return res.status(200).json({ message: "If the email exists, a reset link was sent" });
    const token = crypto.randomBytes(20).toString("hex");
    user.resetToken = token;
    user.resetExpires = new Date(Date.now() + 3600 * 1000); // 1 hour
    await user.save();
    await sendResetEmail(user, token);
    return res.status(200).json({ message: "If the email exists, a reset link was sent" });
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  if (!token || !password) return res.status(400).json({ message: "Invalid request" });
  try {
    const user = await users.findOne({ resetToken: token, resetExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ message: "Token invalid or expired" });
    user.passwordHash = hashPassword(password);
    user.resetToken = undefined;
    user.resetExpires = undefined;
    await user.save();
    return res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const login = async (req, res) => {
  const { email, name, image, googleId } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    let existingUser = await users.findOne({ email });
    let isNew = false;

    if (!existingUser) {
      existingUser = await users.create({ email, name, image, googleId });
      isNew = true;
    } else {
      existingUser.name = name || existingUser.name;
      existingUser.image = image || existingUser.image;
      if (googleId) existingUser.googleId = googleId;
      await existingUser.save();
    }

    const token = signToken(existingUser);
    return res.status(isNew ? 201 : 200).json({
      result: sanitizeUser(existingUser),
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const userId = req.userId || _id;
  const { channelname, description } = req.body;

  if (req.userId && req.userId !== _id && req.user?.role !== "admin") {
    return res.status(403).json({ message: "Unauthorized profile update" });
  }

  try {
    const updatedata = await users.findByIdAndUpdate(
      userId,
      { $set: { channelname, description } },
      { new: true }
    );
    if (!updatedata) return res.status(404).json({ message: "User not found" });
    return res.status(200).json(sanitizeUser(updatedata));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getProfile = async (req, res) => {
  const userId = req.userId || req.params.userId;
  try {
    const user = await users.findById(userId).select("-passwordHash -resetToken -resetExpires -otpCode -otpExpires");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json({ result: user });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const detectLocation = async (req, res) => {
  try {
    const ip = getClientIp(req);
    const locationData = await lookupLocation(ip);
    const otpMethod = getOtpMethodForState(locationData.state);
    const theme = getIstTheme(locationData.state);

    const targetUserId = req.userId || req.params.userId;
    if (targetUserId) {
      await users.findByIdAndUpdate(targetUserId, {
        city: locationData.city,
        state: locationData.state,
        country: locationData.country,
        otpMethod,
      });
    }

    return res.status(200).json({
      ...locationData,
      otpMethod,
      theme,
      isSouthIndia: SOUTH_STATES.includes(locationData.state),
    });
  } catch (error) {
    console.error("Location error:", error);
    return res.status(500).json({ message: "Location detection failed" });
  }
};

export const getWatchLimit = async (req, res) => {
  const userId = req.userId || req.params.userId;
  try {
    const user = await users.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const plan = user.subscriptionPlan || "FREE";
    const today = new Date().toDateString();
    const lastWatch = user.lastWatchDate
      ? new Date(user.lastWatchDate).toDateString()
      : null;
    let usedMinutes = user.watchTimeUsedToday || 0;
    if (lastWatch !== today) usedMinutes = 0;

    return res.status(200).json({
      plan,
      limitMinutes: null,
      usedMinutes,
      unlimited: true,
      exceeded: false,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const trackWatchTime = async (req, res) => {
  const userId = req.userId || req.params.userId;
  const { seconds } = req.body;
  try {
    const user = await users.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const today = new Date().toDateString();
    const lastWatch = user.lastWatchDate
      ? new Date(user.lastWatchDate).toDateString()
      : null;

    let used = user.watchTimeUsedToday || 0;
    if (lastWatch !== today) used = 0;
    used += (seconds || 0) / 60;

    user.watchTimeUsedToday = used;
    user.lastWatchDate = new Date();
    await user.save();

    const plan = user.subscriptionPlan || "FREE";

    return res.status(200).json({
      usedMinutes: used,
      limitMinutes: null,
      unlimited: true,
      exceeded: false,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const requestOtp = async (req, res) => {
  const { email } = req.body;
  console.log(`[requestOtp] incoming request for email=${email}`);
  if (!email) return res.status(400).json({ success: false, error: "Email is required" });
  try {
    const user = await users.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const ip = getClientIp(req);
    const locationData = await lookupLocation(ip);
    const method = user.otpMethod || getOtpMethodForState(locationData.state);

    user.otpMethod = method;
    user.otpCode = String(Math.floor(100000 + Math.random() * 900000));
    user.otpExpires = new Date(Date.now() + OTP_TTL_MS);
    await user.save();
    console.log(`Generated OTP for ${user.email}. Expires at ${user.otpExpires.toISOString()}`);

    try {
      if (method === "mobile") {
        await sendOtpSms(user, user.otpCode);
      } else {
        // If SMTP not configured, return explicit error instead of silent fallback
        if (!isEmailConfigured()) {
        const smtp = getSmtpConfig();
        const masked = getMaskedUser(smtp.user);
        const errMsg = `SMTP not configured. Set SMTP_USER and SMTP_PASS. Current SMTP user: ${masked}`;
        console.error(errMsg);
        return res.status(500).json({ success: false, error: "Failed to send OTP. Email provider is not configured." });
      }
      await sendOtpEmail(user, user.otpCode);
      }
    } catch (sendError) {
      console.error("Failed to send OTP:", sendError?.message || sendError);
      return res.status(500).json({ success: false, error: "Failed to send OTP. Please try again later." });
    }

    // Always return a generic success message. Never expose otp or method in API responses.
    const genericMsg = "OTP sent successfully. Please check your email.";
    return res.status(200).json({ success: true, message: genericMsg });
  } catch (error) {
    console.error("Request OTP error:", error);
    return res.status(500).json({ success: false, error: "Something went wrong" });
  }
};

export const sendOtp = async (req, res) => {
  const requestedEmail = req.body.email;
  const userId = req.userId || req.params.userId;
  const { otp } = req.body;
  if (!otp) return res.status(400).json({ success: false, error: "OTP is required" });

  try {
    const user = userId
      ? await users.findById(userId)
      : requestedEmail
      ? await users.findOne({ email: requestedEmail })
      : null;
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    if (!user.otpCode || !user.otpExpires) {
      return res.status(400).json({ success: false, error: "OTP is not available or has expired" });
    }

    if (user.otpExpires < new Date()) {
      user.otpCode = undefined;
      user.otpExpires = undefined;
      await user.save();
      return res.status(400).json({ success: false, error: "OTP has expired" });
    }

    if (user.otpCode !== otp) {
      return res.status(400).json({ success: false, error: "Invalid OTP" });
    }

    user.otpCode = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = signToken(user);
    return res.status(200).json({ success: true, result: sanitizeUser(user), token });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({ success: false, error: "Something went wrong" });
  }
};

// Provide verifyOtp alias for route compatibility
export const verifyOtp = sendOtp;
