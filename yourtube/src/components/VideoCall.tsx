"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Download,
  Share2,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 10,
};

export default function VideoCall() {
  const router = useRouter();
  const { user } = useUser();
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState("");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [peerStatus, setPeerStatus] = useState("Waiting for peer to join...");
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const myPeerIdRef = useRef<string>("");
  const activeRoomIdRef = useRef<string>("");
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const candidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescriptionSetRef = useRef<boolean>(false);
  const targetPeerIdRef = useRef<string | null>(null);

  // Auto-fill Room ID from URL query param (?room=... or ?roomId=...)
  useEffect(() => {
    if (!router.isReady) return;
    const queryRoom = router.query.room || router.query.roomId;
    if (typeof queryRoom === "string" && queryRoom.trim()) {
      setRoomId(queryRoom.trim());
    }
  }, [router.isReady, router.query]);

  const generateRandomRoomId = () => {
    const randomId = "room-" + Math.random().toString(36).substring(2, 8);
    setRoomId(randomId);
    toast.success(`Generated Room ID: ${randomId}`);
  };

  const copyRoomId = () => {
    const target = activeRoomId || roomId;
    if (!target) return;
    navigator.clipboard.writeText(target);
    setCopied(true);
    toast.success("Room ID copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const copyRoomLink = () => {
    const target = activeRoomId || roomId;
    if (!target) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/call?room=${encodeURIComponent(target)}`;
    navigator.clipboard.writeText(url);
    toast.success("Room invite link copied to clipboard!");
  };

  const sendSignal = async (toPeerId: string, type: string, data: any) => {
    try {
      await fetch("/api/call/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send-signal",
          roomId: activeRoomIdRef.current,
          peerId: myPeerIdRef.current,
          toPeerId,
          type,
          data,
        }),
      });
    } catch (err) {
      console.warn("sendSignal error:", err);
    }
  };

  const drainCandidateQueue = async (pc: RTCPeerConnection) => {
    while (candidateQueueRef.current.length > 0) {
      const candidate = candidateQueueRef.current.shift();
      if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn("drainCandidateQueue error:", e);
        }
      }
    }
  };

  const setupPeerConnection = (targetPeerId: string): RTCPeerConnection => {
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (e) {}
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;
    targetPeerIdRef.current = targetPeerId;
    remoteDescriptionSetRef.current = false;
    candidateQueueRef.current = [];
    setPeerStatus("Connecting to peer...");

    // Send local ICE candidates to the remote peer
    pc.onicecandidate = (event) => {
      if (event.candidate && targetPeerIdRef.current) {
        sendSignal(targetPeerIdRef.current, "candidate", event.candidate);
      }
    };

    // Receive remote media tracks (Audio & Video)
    pc.ontrack = (event) => {
      console.log("REMOTE_TRACK_RECEIVED", event.streams);
      const [remoteStream] = event.streams;
      if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch((e) => console.warn("Remote video play:", e));
        setPeerStatus("Connected");
        toast.success("Connected with peer!");
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("PEER_STATE_CHANGE:", pc.connectionState);
      if (pc.connectionState === "connected") {
        setPeerStatus("Connected");
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setPeerStatus("Disconnected. Waiting for peer...");
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE_STATE_CHANGE:", pc.iceConnectionState);
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setPeerStatus("Connected");
      }
    };

    // Add local tracks (Audio + Video) to the PeerConnection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    return pc;
  };

  const initiateCallToPeer = async (targetPeerId: string) => {
    const pc = setupPeerConnection(targetPeerId);
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      await sendSignal(targetPeerId, "offer", offer);
      console.log("OFFER_SENT_TO", targetPeerId);
    } catch (err) {
      console.error("Failed to create offer:", err);
    }
  };

  const handleIncomingOffer = async (fromPeerId: string, offer: RTCSessionDescriptionInit) => {
    const pc = setupPeerConnection(fromPeerId);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      remoteDescriptionSetRef.current = true;
      await drainCandidateQueue(pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal(fromPeerId, "answer", answer);
      console.log("ANSWER_SENT_TO", fromPeerId);
    } catch (err) {
      console.error("Failed to handle offer:", err);
    }
  };

  const handleIncomingAnswer = async (answer: RTCSessionDescriptionInit) => {
    try {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        remoteDescriptionSetRef.current = true;
        await drainCandidateQueue(pcRef.current);
        console.log("ANSWER_APPLIED");
      }
    } catch (err) {
      console.error("Failed to handle answer:", err);
    }
  };

  const handleIncomingCandidate = async (candidate: RTCIceCandidateInit) => {
    try {
      if (pcRef.current && remoteDescriptionSetRef.current) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        candidateQueueRef.current.push(candidate);
      }
    } catch (err) {
      console.warn("Failed to add candidate:", err);
    }
  };

  const startSignalingLoop = (currentRoom: string, myPeerId: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/call/signal?roomId=${encodeURIComponent(currentRoom)}&peerId=${encodeURIComponent(myPeerId)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const messages = data?.messages || [];

        for (const msg of messages) {
          if (msg.type === "user-joined") {
            toast.info(`${msg.data?.userName || "Peer"} joined the room!`);
            initiateCallToPeer(msg.fromPeerId);
          } else if (msg.type === "offer") {
            handleIncomingOffer(msg.fromPeerId, msg.data);
          } else if (msg.type === "answer") {
            handleIncomingAnswer(msg.data);
          } else if (msg.type === "candidate") {
            handleIncomingCandidate(msg.data);
          } else if (msg.type === "call-ended") {
            toast.info("Peer left the call");
            setPeerStatus("Peer left the room");
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
          }
        }
      } catch (err) {
        // Retry silently
      }
    }, 800);
  };

  const startCall = async () => {
    const targetRoom = roomId.trim();
    if (!targetRoom) {
      toast.error("Please enter a valid Room ID to start or join a call");
      return;
    }

    setConnecting(true);
    try {
      // 1. Request camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;

      const myPeerId = "peer-" + Math.random().toString(36).substring(2, 9);
      myPeerIdRef.current = myPeerId;
      activeRoomIdRef.current = targetRoom;
      setActiveRoomId(targetRoom);

      // 2. Register in room via signaling API
      const joinRes = await fetch("/api/call/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          roomId: targetRoom,
          peerId: myPeerId,
          userName: user?.name || "User",
        }),
      });

      if (joinRes.status === 403) {
        const errData = await joinRes.json();
        stream.getTracks().forEach((t) => t.stop());
        setConnecting(false);
        toast.error(errData?.error || "Room is full. Maximum 2 participants allowed.");
        return;
      }

      const joinData = await joinRes.json();
      const existingPeers = joinData?.existingPeers || [];

      setJoined(true);
      setConnecting(false);

      // 3. Start signaling poll loop
      startSignalingLoop(targetRoom, myPeerId);

      // 4. If an existing peer is already in the room, send an offer immediately
      if (existingPeers.length > 0) {
        toast.info(`Connecting with peer in ${targetRoom}...`);
        initiateCallToPeer(existingPeers[0].peerId);
      } else {
        setPeerStatus("Waiting for peer to join...");
        toast.success(`Joined room: ${targetRoom}`);
      }
    } catch (error: any) {
      console.error("MEDIA_STREAM_ERROR", error);
      setConnecting(false);
      toast.error("Could not access camera/microphone. Please allow browser permissions.");
    }
  };

  // Attach local stream to local video element
  useEffect(() => {
    if (!joined || !localStreamRef.current || !localVideoRef.current) return;
    localVideoRef.current.srcObject = localStreamRef.current;
    localVideoRef.current.play().catch(() => {});
  }, [joined]);

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const audioTracks = localStreamRef.current.getAudioTracks();
    audioTracks.forEach((t) => {
      t.enabled = muted;
    });
    setMuted(!muted);
    toast.info(muted ? "Microphone unmuted" : "Microphone muted");
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    const videoTracks = localStreamRef.current.getVideoTracks();
    videoTracks.forEach((t) => {
      t.enabled = cameraOff;
    });
    setCameraOff(!cameraOff);
    toast.info(cameraOff ? "Camera turned on" : "Camera turned off");
  };

  const shareScreen = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      toast.error("Screen sharing is not supported on this browser/device.");
      return;
    }

    if (sharing) {
      stopScreenShare();
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];

      if (pcRef.current) {
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(screenTrack);
        }
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }

      setSharing(true);
      toast.success("Screen sharing started");

      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      toast.error("Screen share cancelled");
    }
  };

  const stopScreenShare = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    if (localStreamRef.current) {
      const cameraTrack = localStreamRef.current.getVideoTracks()[0];
      if (pcRef.current && cameraTrack) {
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(cameraTrack);
        }
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }

    setSharing(false);
    toast.info("Screen sharing stopped. Camera restored.");
  };

  const startRecording = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `yourtube-call-${activeRoomIdRef.current || "room"}-${Date.now()}.webm`;
      a.click();
      toast.success("Call recording downloaded");
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
    toast.info("Recording started");
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const endCall = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    const currentRoom = activeRoomIdRef.current || roomId;
    const myPeerId = myPeerIdRef.current;

    if (currentRoom && myPeerId) {
      fetch("/api/call/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave", roomId: currentRoom, peerId: myPeerId }),
      }).catch(() => {});
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (e) {}
      pcRef.current = null;
    }

    setJoined(false);
    setActiveRoomId("");
    activeRoomIdRef.current = "";
    myPeerIdRef.current = "";
    targetPeerIdRef.current = null;
    setSharing(false);
    setRecording(false);
    setPeerStatus("Call ended");
    toast.info("Call ended");
  };

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach((t) => t.stop());
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach((t) => t.stop());
      if (pcRef.current) {
        try {
          pcRef.current.close();
        } catch (e) {}
      }
    };
  }, []);

  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Video Call</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time Peer-to-Peer WebRTC video call with audio & screen sharing
          </p>
        </div>

        {joined && activeRoomId && (
          <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg border text-sm">
            <span className="font-semibold text-foreground">Room:</span>
            <span className="font-mono text-primary font-bold">{activeRoomId}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={copyRoomId}
              title="Copy Room ID"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={copyRoomLink}
              title="Copy Invite Link"
            >
              <Share2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {!joined ? (
        <div className="space-y-5 max-w-md bg-card border rounded-xl p-6 shadow-sm">
          <div className="space-y-2">
            <label htmlFor="roomIdInput" className="block text-sm font-semibold text-foreground">
              Room ID <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                id="roomIdInput"
                placeholder="Enter Room ID (e.g. room-101, team-call)"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !connecting) startCall();
                }}
                className="flex-1"
                autoFocus
              />
              <Button
                type="button"
                variant="outline"
                onClick={generateRandomRoomId}
                title="Generate Random Room ID"
                className="flex items-center gap-1.5 shrink-0"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Generate</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter any Room ID or click Generate. Share this Room ID with another user to connect.
            </p>
          </div>

          <Button
            onClick={startCall}
            disabled={connecting}
            className="w-full py-5 text-base font-medium flex items-center justify-center gap-2"
          >
            {connecting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Joining Room...</span>
              </>
            ) : (
              <>
                <Video className="w-5 h-5" />
                <span>Start / Join Call</span>
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Supports 2-person calls across different phones and devices.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Local Video Stream */}
            <div className="aspect-video bg-black rounded-lg overflow-hidden relative border border-slate-800">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-2 left-2 text-white text-xs bg-black/60 px-2 py-0.5 rounded">
                You {sharing ? "(Screen)" : ""}
              </span>
            </div>

            {/* Remote Video Stream */}
            <div className="aspect-video bg-black rounded-lg overflow-hidden relative border border-slate-800 flex items-center justify-center">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-2 left-2 text-white text-xs bg-black/60 px-2 py-0.5 rounded">
                Remote Participant
              </span>
              {!remoteVideoRef.current?.srcObject && (
                <div className="absolute text-center p-4">
                  <p className="text-sm text-gray-300 font-medium">{peerStatus}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Share the Room ID or invite link with a second device to connect.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Video Call Controls */}
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            <Button
              variant={muted ? "destructive" : "secondary"}
              onClick={toggleMute}
              title={muted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {muted ? <MicOff className="w-4 h-4 mr-1.5" /> : <Mic className="w-4 h-4 mr-1.5" />}
              {muted ? "Unmute" : "Mute"}
            </Button>

            <Button
              variant={cameraOff ? "destructive" : "secondary"}
              onClick={toggleCamera}
              title={cameraOff ? "Turn Camera On" : "Turn Camera Off"}
            >
              {cameraOff ? <VideoOff className="w-4 h-4 mr-1.5" /> : <Video className="w-4 h-4 mr-1.5" />}
              {cameraOff ? "Camera On" : "Camera Off"}
            </Button>

            <Button
              variant={sharing ? "default" : "secondary"}
              onClick={shareScreen}
              title={sharing ? "Stop Sharing" : "Share Screen"}
            >
              <Monitor className="w-4 h-4 mr-1.5" />
              {sharing ? "Stop Screen" : "Share Screen"}
            </Button>

            <Button
              variant={recording ? "destructive" : "secondary"}
              onClick={recording ? stopRecording : startRecording}
              title={recording ? "Stop Recording" : "Record Call"}
            >
              <Download className="w-4 h-4 mr-1.5" />
              {recording ? "Stop Rec" : "Record"}
            </Button>

            <Button variant="destructive" onClick={endCall} title="End Call">
              <PhoneOff className="w-4 h-4 mr-1.5" /> End Call
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
