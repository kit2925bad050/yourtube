import Notification from "../Modals/notification.js";

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(100);
    return res.status(200).json(notifications);
  } catch (error) {
    console.error("Failed to load notifications:", error);
    return res.status(500).json({ message: "Failed to load notifications" });
  }
};

export const markNotificationRead = async (req, res) => {
  const { id } = req.params;
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.userId },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    return res.status(200).json(notification);
  } catch (error) {
    console.error("Failed to mark notification read:", error);
    return res.status(500).json({ message: "Failed to update notification" });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.userId, read: false }, { read: true });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to mark all notifications read:", error);
    return res.status(500).json({ message: "Failed to update notifications" });
  }
};

export const getUnreadNotificationCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.userId, read: false });
    return res.status(200).json({ count });
  } catch (error) {
    console.error("Failed to count unread notifications:", error);
    return res.status(500).json({ message: "Failed to load notification count" });
  }
};

export const createNotification = async ({ userId, type, message, metadata = {} }) => {
  try {
    return await Notification.create({ userId, type, message, metadata });
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
};
