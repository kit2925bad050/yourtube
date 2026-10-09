import users from "../Modals/Auth.js";
import mongoose from "mongoose";import { createNotification } from "./notifications.js";
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findChannelUser = async (identifier) => {
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    return await users.findById(identifier);
  }
  return await users.findOne({ channelname: new RegExp(`^${escapeRegExp(identifier)}$`, "i") });
};

export const toggleSubscription = async (req, res) => {
  const channelIdentifier = req.params.channelIdentifier;
  const userId = req.userId;

  if (!channelIdentifier) {
    return res.status(400).json({ message: "Channel identifier is required" });
  }

  try {
    const channelUser = await findChannelUser(channelIdentifier);
    if (!channelUser) {
      return res.status(404).json({ message: "Channel not found" });
    }

    if (userId === channelUser._id.toString()) {
      return res.status(400).json({ message: "You cannot subscribe to your own channel" });
    }

    const currentUser = await users.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    currentUser.subscriptions = currentUser.subscriptions || [];
    channelUser.subscriberCount = channelUser.subscriberCount || 0;

    const alreadySubscribed = currentUser.subscriptions.some(
      (id) => id.toString() === channelUser._id.toString()
    );

    if (alreadySubscribed) {
      currentUser.subscriptions = currentUser.subscriptions.filter(
        (id) => id.toString() !== channelUser._id.toString()
      );
      channelUser.subscriberCount = Math.max(0, channelUser.subscriberCount - 1);
    } else {
      currentUser.subscriptions.push(channelUser._id);
      channelUser.subscriberCount += 1;
      try {
        await createNotification({
          userId: channelUser._id,
          type: "Subscription",
          message: `${currentUser.name} subscribed to your channel.`,
          metadata: { subscriberId: currentUser._id },
        });
      } catch (notificationErr) {
        console.error("Failed to create subscription notification:", notificationErr);
      }
    }

    await Promise.all([currentUser.save(), channelUser.save()]);

    return res.status(200).json({
      isSubscribed: !alreadySubscribed,
      subscriberCount: channelUser.subscriberCount,
    });
  } catch (error) {
    console.error("Subscription toggle error:", error);
    return res.status(500).json({ message: "Failed to update subscription" });
  }
};

export const getSubscriptionStatus = async (req, res) => {
  const channelIdentifier = req.params.channelIdentifier;
  const userId = req.userId;

  if (!channelIdentifier) {
    return res.status(400).json({ message: "Channel identifier is required" });
  }

  try {
    const channelUser = await findChannelUser(channelIdentifier);
    if (!channelUser) {
      return res.status(404).json({ message: "Channel not found" });
    }

    const currentUser = await users.findById(userId).select("subscriptions");
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    const isSubscribed = (currentUser.subscriptions || []).some(
      (id) => id.toString() === channelUser._id.toString()
    );

    return res.status(200).json({
      isSubscribed,
      subscriberCount: channelUser.subscriberCount || 0,
    });
  } catch (error) {
    console.error("Subscription status error:", error);
    return res.status(500).json({ message: "Failed to check subscription status" });
  }
};
