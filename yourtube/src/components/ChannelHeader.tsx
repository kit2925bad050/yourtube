import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import axiosInstance from "@/lib/axiosinstance";

const ChannelHeader = ({ channel, user }: any) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState<number>(channel?.subscriberCount || 0);
  const [subLoading, setSubLoading] = useState(false);

  const channelIdentifier = channel?._id || channel?.channelname;
  const isOwner = user?._id === channel?._id;

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      if (!user || !channelIdentifier || isOwner) return;
      try {
        const response = await axiosInstance.get(
          `/subscriptions/status/${encodeURIComponent(channelIdentifier)}`
        );
        if (response.data?.isSubscribed !== undefined) {
          setIsSubscribed(response.data.isSubscribed);
        }
        if (response.data?.subscriberCount !== undefined) {
          setSubscriberCount(response.data.subscriberCount);
        }
      } catch (error) {
        console.log(error);
      }
    };

    fetchSubscriptionStatus();
  }, [user, channelIdentifier, isOwner]);

  const handleSubscribe = async () => {
    if (!user || !channelIdentifier) return;

    setSubLoading(true);
    try {
      const response = await axiosInstance.post(
        `/subscriptions/toggle/${encodeURIComponent(channelIdentifier)}`
      );
      setIsSubscribed(response.data.isSubscribed);
      if (response.data?.subscriberCount !== undefined) {
        setSubscriberCount(response.data.subscriberCount);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setSubLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Banner */}
      <div className="relative h-32 md:h-48 lg:h-64 bg-gradient-to-r from-blue-400 to-purple-500 overflow-hidden"></div>

      {/* Channel Info */}
      <div className="px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <Avatar className="w-20 h-20 md:w-32 md:h-32">
            <AvatarFallback className="text-2xl">
              {channel?.channelname?.[0] || "?"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <h1 className="text-2xl md:text-4xl font-bold">{channel?.channelname || "Channel"}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>@{(channel?.channelname || "").toLowerCase().replace(/\s+/g, "") || "unknown"}</span>
              <span>{subscriberCount.toLocaleString()} subscriber{subscriberCount === 1 ? "" : "s"}</span>
            </div>
            {channel?.description && (
              <p className="text-sm text-muted-foreground max-w-2xl">
                {channel?.description}
              </p>
            )}
          </div>

          {user && !isOwner && (
            <div className="flex gap-2">
              <Button
                onClick={handleSubscribe}
                variant={isSubscribed ? "outline" : "default"}
                disabled={subLoading}
              >
                {subLoading ? "Updating..." : isSubscribed ? "Subscribed" : "Subscribe"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelHeader;
