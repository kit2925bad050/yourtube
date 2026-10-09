import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import Videopplayer from "@/components/Videopplayer";
import axiosInstance from "@/lib/axiosinstance";
import { isPlayableVideo } from "@/lib/videoValidation";
import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";

const WatchPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const commentsRef = useRef<HTMLDivElement>(null);
  const [currentVideo, setCurrentVideo] = useState<any>(null);
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchvideo = async () => {
      let videoId: string | undefined;
      if (id && typeof id === "string") {
        videoId = id;
      } else if (typeof window !== "undefined") {
        // Fallback: extract id from URL path for production builds where router.query may be empty
        const m = window.location.pathname.match(/\/watch\/([^\/]+)/);
        if (m && m[1]) videoId = m[1];
      }
      if (!videoId) return;
      try {
        const [currentRes, allRes] = await Promise.all([
          axiosInstance.get(`/videos/${videoId}`),
          axiosInstance.get("/videos"),
        ]);
        console.log("API currentRes.data:", currentRes.data);
        setCurrentVideo(currentRes.data);
        const list = Array.isArray(allRes.data) ? allRes.data : [];
        setAllVideos(list.filter(isPlayableVideo));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchvideo();
  }, [id]);

  const nextVideo = allVideos.find((v) => v._id !== id);

  const scrollToComments = () => {
    commentsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (loading) return <div className="flex-1 p-4">Loading...</div>;
  if (!currentVideo) return <div className="flex-1 p-4">Video not found</div>;

  return (
    <div className="flex-1 min-h-screen">
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Videopplayer
              video={currentVideo}
              onOpenComments={scrollToComments}
              nextVideoId={nextVideo?._id || null}
              onPlaybackError={() => setCurrentVideo(null)}
            />
            {currentVideo && <VideoInfo video={currentVideo} />}
            <div ref={commentsRef}>
              <Comments videoId={id as string} />
            </div>
          </div>
          <div className="space-y-4">
            <RelatedVideos videos={allVideos} currentVideoId={id as string} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchPage;
