import jwt from "jsonwebtoken";
import users from "../Modals/Auth.js";

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

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log("Auth middleware: incoming request", { method: req.method, url: req.originalUrl, ip: req.ip });
  if (!authHeader?.startsWith("Bearer ")) {
    console.warn("Auth middleware: Authorization header missing or invalid", { authorization: !!req.headers.authorization });
    return res.status(401).json({ message: "Authorization token missing" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Authorization token missing" });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.userId = decoded.id;
    const user = await users.findById(req.userId);
    if (!user) {
      return res.status(401).json({ message: "Invalid token user" });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message || error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!userRole) {
      return res.status(401).json({ message: "Authorization required" });
    }
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}
