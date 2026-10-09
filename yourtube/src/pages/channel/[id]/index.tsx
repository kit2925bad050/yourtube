import ChannelHeader from "@/components/ChannelHeader";
import Channeltabs from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { isPlayableVideo } from "@/lib/videoValidation";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

const ChannelPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUser();
  const [videos, setVideos] = useState<any[]>([]);
  const [channel, setChannel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChannelVideos = async () => {
      if (!id || typeof id !== "string") return;
      try {
        // Fetch channel profile (public)
        try {
          const profileRes = await axiosInstance.get(`/profile/${id}`);
          setChannel(profileRes.data || null);
        } catch (e) {
          // ignore profile fetch errors (channel may be identified by id string)
          setChannel(null);
        }

        const res = await axiosInstance.get("/videos");
        const allVideos = Array.isArray(res.data) ? res.data : [];
        const validVideos = allVideos.filter(isPlayableVideo);
        const channelName = channel?.channelname || user?.channelname || null;
        const channelVideos = validVideos.filter(
          (v: any) => v.uploader === id || (channelName && v.videochanel === channelName)
        );
        setVideos(channelVideos);
      } catch (error) {
        console.error("Error fetching channel videos:", error);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchChannelVideos();
  }, [id, user?.channelname]);


  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="max-w-full mx-auto">
        <ChannelHeader channel={channel || user} user={user} />
        <Channeltabs />
        {user?._id === id && (
          <div className="px-4 pb-8">
            <VideoUploader channelId={id} channelName={channel?.channelname || user?.channelname} />
          </div>
        )}
        <div className="px-4 pb-8">
          {loading ? (
            <p>Loading videos...</p>
          ) : (
            <ChannelVideos videos={videos} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelPage;
