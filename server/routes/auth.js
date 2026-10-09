import express from "express";
import {
  login,
  signup,
  loginWithPassword,
  forgotPassword,
  resetPassword,
  updateprofile,
  detectLocation,
  getWatchLimit,
  trackWatchTime,
  sendOtp,
  requestOtp,
  verifyOtp,
  getProfile,
} from "../controllers/auth.js";
import { authenticate } from "../middleware/auth.js";

const routes = express.Router();

routes.post("/login", login);
routes.post("/signup", signup);
routes.post("/login/email", loginWithPassword);
routes.post("/request-otp", requestOtp);
routes.post("/verify-otp", verifyOtp);
routes.post("/forgot", forgotPassword);
routes.post("/reset/:token", resetPassword);
routes.patch("/update/:id", authenticate, updateprofile);
routes.get("/location", detectLocation);
routes.get("/location/:userId", authenticate, detectLocation);
routes.get("/watch-limit/:userId", authenticate, getWatchLimit);
routes.post("/watch-time/:userId", authenticate, trackWatchTime);
routes.post("/otp/:userId", authenticate, sendOtp);
routes.get("/profile", authenticate, getProfile);
routes.get("/profile/:userId", getProfile);

export default routes;
