"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/router";
import { getVideoUrl } from "@/lib/api";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
  onOpenComments?: () => void;
  onPlaybackError?: () => void;
  nextVideoId?: string | null;
  commentsOpen?: boolean;
}

export default function VideoPlayer({
  video,
  onOpenComments,
  onPlaybackError,
  nextVideoId,
  commentsOpen,
}: VideoPlayerProps) {
  useEffect(() => {
    console.log("VIDEO DATA:", video);
    console.log("FILEPATH:", video?.filepath);
  }, [video]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user } = useUser();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const tapRef = useRef({ count: 0, timer: null as ReturnType<typeof setTimeout> | null, zone: "" });
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 800);
  };

  const videoSource = getVideoUrl(video?.filepath);

  useEffect(() => {
    if (!videoSource) {
      setMediaError("Unable to load this video. The source URL is invalid or unavailable.");
      onPlaybackError?.();
    } else {
      setMediaError(null);
    }
  }, [videoSource, onPlaybackError]);

  const seek = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(
      0,
      Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + seconds)
    );
    showFeedback(seconds > 0 ? "+10s" : "-10s");
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      showFeedback("Play");
    } else {
      videoRef.current.pause();
      showFeedback("Pause");
    }
  };

  const getZone = (clientX: number, width: number) => {
    const ratio = clientX / width;
    if (ratio < 0.33) return "left";
    if (ratio > 0.66) return "right";
    return "center";
  };

  const handleTap = (zone: string) => {
    const tap = tapRef.current;
    if (tap.zone && tap.zone !== zone) {
      tap.count = 1;
      tap.zone = zone;
    } else {
      tap.count += 1;
      tap.zone = zone;
    }

    if (tap.timer) clearTimeout(tap.timer);

    tap.timer = setTimeout(() => {
      const count = tap.count;
      const z = tap.zone;
      tap.count = 0;
      tap.zone = "";

      if (z === "left") {
        if (count === 2) seek(-10);
        else if (count === 3) onOpenComments?.();
      } else if (z === "right") {
        if (count === 2) seek(10);
        else if (count === 3) router.push("/");
      } else if (z === "center") {
        if (count === 1) togglePlay();
        else if (count === 3 && nextVideoId) router.push(`/watch/${nextVideoId}`);
      }
    }, 300);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const zone = getZone(e.clientX - rect.left, rect.width);
    handleTap(zone);
  };

  useEffect(() => {
    if (!user?._id) return;
    let interval: ReturnType<typeof setInterval> | null = null;

    // Track watch time without artificially blocking playback
    interval = setInterval(async () => {
      try {
        await axiosInstance.post(`/user/watch-time/${user._id}`, { seconds: 10 });
      } catch (error) {
        // Silently log or ignore
      }
    }, 10000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user?._id]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrentTime(v.currentTime || 0);
    const onMeta = () => setDuration(v.duration || 0);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
    };
  }, [video?._id]);

  const handleMediaError = () => {
    setMediaError("Unable to play this video. It may be broken or unavailable.");
    onPlaybackError?.();
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black rounded-lg overflow-hidden select-none touch-none"
      onPointerUp={onPointerUp}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        playsInline
        src={videoSource}
        onError={handleMediaError}
        onLoadedMetadata={() => setMediaError(null)}
      />
      {mediaError && (
        <div className="absolute inset-0 z-10 bg-black/85 flex flex-col items-center justify-center gap-3 p-4 text-center text-white">
          <p className="text-lg font-semibold">{mediaError}</p>
          <p className="text-sm text-white/80 max-w-md">
            Please return to the homepage or try another video.
          </p>
          <button
            onClick={() => router.push("/")}
            className="rounded-full bg-white text-black px-4 py-2"
          >
            Go Home
          </button>
        </div>
      )}
      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3 bg-black/50 p-2 rounded-md">
        <button
          onClick={() => {
            if (!videoRef.current) return;
            if (videoRef.current.paused) videoRef.current.play();
            else videoRef.current.pause();
          }}
          className="text-white/90 px-2"
        >
          {videoRef.current?.paused ? "Play" : "Pause"}
        </button>
        <button onClick={() => seek(-10)} className="text-white/90 px-2">-10s</button>
        <button onClick={() => seek(10)} className="text-white/90 px-2">+10s</button>
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => {
              if (!videoRef.current) return;
              videoRef.current.currentTime = Number(e.target.value);
            }}
            className="w-full"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="px-3 py-1.5 bg-gray-900 text-white border border-gray-700 rounded-lg hover:bg-gray-800 active:bg-gray-700 transition-colors text-xs font-semibold whitespace-nowrap">
              Speed
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="center"
            sideOffset={8}
            className="!bg-gray-900 !text-white !border !border-gray-700 !rounded-lg !shadow-2xl !z-[9999] min-w-[140px]"
          >
            <DropdownMenuItem
              onClick={() => {
                if (!videoRef.current) return;
                videoRef.current.playbackRate = 0.5;
              }}
              className="!bg-gray-900 hover:!bg-gray-800 !text-white !cursor-pointer focus:!bg-gray-800 rounded-md"
            >
              <span className="font-medium">0.5x</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (!videoRef.current) return;
                videoRef.current.playbackRate = 0.75;
              }}
              className="!bg-gray-900 hover:!bg-gray-800 !text-white !cursor-pointer focus:!bg-gray-800 rounded-md"
            >
              <span className="font-medium">0.75x</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (!videoRef.current) return;
                videoRef.current.playbackRate = 1;
              }}
              className="!bg-gray-900 hover:!bg-gray-800 !text-white !cursor-pointer focus:!bg-gray-800 rounded-md"
            >
              <span className="font-medium">1x (Normal)</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (!videoRef.current) return;
                videoRef.current.playbackRate = 1.25;
              }}
              className="!bg-gray-900 hover:!bg-gray-800 !text-white !cursor-pointer focus:!bg-gray-800 rounded-md"
            >
              <span className="font-medium">1.25x</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (!videoRef.current) return;
                videoRef.current.playbackRate = 1.5;
              }}
              className="!bg-gray-900 hover:!bg-gray-800 !text-white !cursor-pointer focus:!bg-gray-800 rounded-md"
            >
              <span className="font-medium">1.5x</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (!videoRef.current) return;
                videoRef.current.playbackRate = 2;
              }}
              className="!bg-gray-900 hover:!bg-gray-800 !text-white !cursor-pointer focus:!bg-gray-800 rounded-md"
            >
              <span className="font-medium">2x</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          defaultValue={1}
          onChange={(e) => {
            if (!videoRef.current) return;
            videoRef.current.volume = Number(e.target.value);
          }}
          className="w-24"
        />
        <button
          onClick={() => {
            if (!videoRef.current) return;
            if (document.fullscreenElement) document.exitFullscreen();
            else containerRef.current?.requestFullscreen();
          }}
          className="text-white/90 px-2"
        >
          Fullscreen
        </button>
      </div>
      {feedback && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="bg-black/70 text-white px-4 py-2 rounded-lg text-lg font-medium animate-pulse">
            {feedback}
          </span>
        </div>
      )}
      <div className="absolute bottom-2 left-2 right-2 flex justify-between text-white/60 text-xs pointer-events-none">
        <span>2x tap: ±10s</span>
        <span>1x tap: play/pause</span>
        <span>3x tap: actions</span>
      </div>
    </div>
  );
}
