import express from "express";
import {
  getModerationLogs,
  unhideComment,
  approveComment,
  rejectComment,
} from "../controllers/moderation.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticate);
router.use(authorize("moderator", "admin"));

/**
 * GET /moderation/logs
 * Get all moderation logs
 */
router.get("/logs", getModerationLogs);

/**
 * PUT /moderation/unhide/:commentId
 * Unhide a comment
 */
router.put("/unhide/:commentId", unhideComment);

/**
 * PUT /moderation/approve/:commentId
 * Approve a comment
 */
router.put("/approve/:commentId", approveComment);

/**
 * PUT /moderation/reject/:commentId
 * Reject a comment with reason
 */
router.put("/reject/:commentId", rejectComment);

export default router;
