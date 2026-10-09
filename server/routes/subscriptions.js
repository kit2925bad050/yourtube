import express from "express";
import { authenticate } from "../middleware/auth.js";
import { toggleSubscription, getSubscriptionStatus } from "../controllers/subscription.js";

const router = express.Router();

router.post("/toggle/:channelIdentifier", authenticate, toggleSubscription);
router.get("/status/:channelIdentifier", authenticate, getSubscriptionStatus);

export default router;
