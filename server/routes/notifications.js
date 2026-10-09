import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/notifications.js";

const router = express.Router();

router.use(authenticate);
router.get("/", getNotifications);
router.get("/count", getUnreadNotificationCount);
router.put("/mark-read/:id", markNotificationRead);
router.put("/mark-all-read", markAllNotificationsRead);

export default router;
