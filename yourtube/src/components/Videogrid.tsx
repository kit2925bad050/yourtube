import React, { useEffect, useState } from "react";
import Videocard from "./videocard";
import { isPlayableVideo } from "@/lib/videoValidation";

const Videogrid = () => {
  const [videos, setvideo] = useState<any[]>([]);
  const [loading, setloading] = useState(true);
  const [error, seterror] = useState<string | null>(null);

  useEffect(() => {
    const fetchvideo = async () => {
      try {
        const res = await fetch("/api/videos");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        const playableVideos = Array.isArray(data) ? data.filter(isPlayableVideo) : [];
        setvideo(playableVideos);
      } catch (error) {
        seterror("Could not load videos");
        console.log(error);
      } finally {
        setloading(false);
      }
    };
    fetchvideo();
  }, []);

  const videoList = Array.isArray(videos) ? videos : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 
    lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {loading ? (
        <>Loading...</>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : videoList.length === 0 ? (
        <p className="text-gray-500">No videos available yet.</p>
      ) : (
        videoList.map((video: any) => (
          <Videocard key={video._id} video={video} />
        ))
      )}
    </div>
  );
};

export default Videogrid;
