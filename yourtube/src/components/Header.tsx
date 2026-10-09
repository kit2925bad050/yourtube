import { Bell, Menu, Mic, Search, User, Upload, Phone, Download, Languages } from "lucide-react";
import React, { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import Link from "next/link";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Channeldialogue from "./channeldialogue";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { getBackendUrl } from "@/lib/api";

const Header = () => {
  const { user, logout, handlegooglesignin, authError, googleSigningIn } = useUser();
  const { locale, setLocale, languages, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [isdialogeopen, setisdialogeopen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const plan = user?.subscriptionPlan || "FREE";

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const loadCount = async () => {
      try {
        const backendUrl = getBackendUrl() || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "/api";
        const response = await fetch(`${backendUrl.replace(/\/+$/, "")}/notifications/count`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (!response.ok) {
          console.error("Unread count request failed:", response.status, response.statusText);
          return;
        }
        const data = await response.json();
        setUnreadCount(data?.count || 0);
      } catch (error) {
        console.error("Failed to load unread count:", error);
      }
    };

    const handleUpdate = () => {
      loadCount();
    };

    loadCount();
    window.addEventListener("notifications-updated", handleUpdate);
    return () => window.removeEventListener("notifications-updated", handleUpdate);
  }, [user]);

  useEffect(() => {
    // Initialize SpeechRecognition on client side only
    if (typeof window === "undefined") {
      console.log("VOICE_SEARCH_INIT: window is undefined, skipping initialization");
      return;
    }
    
    console.log("VOICE_SEARCH_INIT: Starting SpeechRecognition initialization");
    
    // Check browser support for SpeechRecognition API
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      console.error("VOICE_SEARCH_INIT: SpeechRecognition API not supported in this browser");
      toast.error("Voice search is not supported in this browser. Please use Chrome, Edge, or Safari.");
      recognitionRef.current = null;
      return;
    }
    
    console.log("VOICE_SEARCH_INIT: SpeechRecognition API is available");
    
    try {
      const recognition = new SpeechRecognitionAPI();
      
      // Configure recognition settings
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;
      
      console.log("VOICE_SEARCH_INIT: Recognition configured with settings", {
        lang: recognition.lang,
        interimResults: recognition.interimResults,
        continuous: recognition.continuous,
        maxAlternatives: recognition.maxAlternatives,
      });

      // Event: Recognition started successfully
      recognition.onstart = () => {
        console.log("SPEECH_RECOGNITION_STARTED: Microphone is now listening");
        setIsListening(true);
        toast.success("Listening... Speak now");
      };

      // Event: Speech result received
      recognition.onresult = (event: any) => {
        console.log("SPEECH_RECOGNITION_RESULT: Result event received", {
          resultsLength: event.results?.length,
          isFinal: event.results?.[0]?.isFinal,
          resultCount: event.resultIndex,
        });
        
        try {
          if (!event.results || event.results.length === 0) {
            console.warn("SPEECH_RECOGNITION_RESULT: No results in event");
            return;
          }

          const result = event.results[event.results.length - 1];
          const transcript = result[0]?.transcript || "";
          const confidence = result[0]?.confidence || 0;
          
          console.log("SPEECH_RECOGNITION_RESULT: Transcript captured", {
            transcript,
            confidence: (confidence * 100).toFixed(1) + "%",
            isFinal: result.isFinal,
          });

          if (transcript.trim()) {
            console.log("SPEECH_RECOGNITION_RESULT: Updating search query with transcript");
            setSearchQuery(transcript.trim());
            
            // Auto-trigger search after successful recognition
            if (result.isFinal) {
              console.log("SPEECH_RECOGNITION_RESULT: Final result received, navigating to search");
              router.push(`/search?q=${encodeURIComponent(transcript.trim())}`);
            }
          } else {
            console.warn("SPEECH_RECOGNITION_RESULT: Transcript is empty");
          }
        } catch (err) {
          console.error("SPEECH_RECOGNITION_RESULT: Error processing result", err);
          toast.error("Failed to process speech result. Please try again.");
        }
      };

      // Event: Error occurred during recognition
      recognition.onerror = (event: any) => {
        const errorCode = event.error || "unknown";
        console.error("SPEECH_RECOGNITION_ERROR: Recognition error occurred", {
          errorCode,
          errorName: event.errorName,
        });
        
        let errorMessage = "Speech recognition error occurred";
        let toastType = "error";

        switch (errorCode) {
          case "no-speech":
            console.warn("SPEECH_RECOGNITION_ERROR: No speech was detected within the timeout");
            errorMessage = "No speech detected. Please try again.";
            toastType = "info";
            break;
          case "audio-capture":
            console.error("SPEECH_RECOGNITION_ERROR: No microphone input was detected");
            errorMessage = "No microphone input detected. Please check your microphone.";
            break;
          case "not-allowed":
          case "permission-denied":
            console.error("SPEECH_RECOGNITION_ERROR: Microphone permission was denied by user");
            errorMessage = "Microphone permission denied. Please allow microphone access in your browser settings.";
            break;
          case "network":
            console.error("SPEECH_RECOGNITION_ERROR: Network error during recognition");
            errorMessage = "Network error. Please check your internet connection.";
            break;
          case "service-not-available":
            console.error("SPEECH_RECOGNITION_ERROR: Speech recognition service is not available");
            errorMessage = "Speech recognition service is not available. Please try again later.";
            break;
          case "bad-grammar":
            console.warn("SPEECH_RECOGNITION_ERROR: Grammar error");
            errorMessage = "Grammar error. Please try again.";
            toastType = "info";
            break;
          case "aborted":
            console.log("SPEECH_RECOGNITION_ERROR: Speech recognition was aborted");
            errorMessage = "Speech recognition was cancelled.";
            toastType = "info";
            break;
          default:
            console.error("SPEECH_RECOGNITION_ERROR: Unknown error code - " + errorCode);
            errorMessage = "Speech recognition error: " + errorCode;
        }

        if (toastType === "error") {
          toast.error(errorMessage);
        } else if (toastType === "info") {
          toast.info(errorMessage);
        }
      };

      // Event: Recognition session ended
      recognition.onend = () => {
        console.log("SPEECH_RECOGNITION_ENDED: Recognition session has ended");
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      console.log("VOICE_SEARCH_INIT: SpeechRecognition instance created and configured successfully");
    } catch (err) {
      console.error("VOICE_SEARCH_INIT: Failed to create SpeechRecognition instance", err);
      toast.error("Failed to initialize voice search. Please refresh the page.");
      recognitionRef.current = null;
    }
    
    // Cleanup function
    return () => {
      console.log("VOICE_SEARCH_INIT: Cleaning up recognition instance on unmount");
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          recognitionRef.current.onstart = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current = null;
        } catch (err) {
          console.error("VOICE_SEARCH_INIT: Error during cleanup", err);
        }
      }
    };
  }, [router]);

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-2 bg-background border-b">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Menu className="w-6 h-6" />
        </Button>
        <Link href="/" className="flex items-center gap-1">
          <div className="bg-red-600 p-1 rounded">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <span className="text-xl font-medium">YourTube</span>
          <span className="text-xs text-muted-foreground ml-1">IN</span>
        </Link>
      </div>
      <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 max-w-2xl mx-4">
        <div className="flex flex-1">
          <Input
            type="search"
            placeholder={t("searchPlaceholder", "Search")}
            value={searchQuery}
            onKeyDown={(e) => e.key === "Enter" && handleSearch(e as any)}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-l-full border border-slate-300 border-r-0 bg-background focus-visible:ring-0 dark:border-slate-600"
          />
          <Button
            type="submit"
            variant="secondary"
            className="rounded-r-full px-6 border border-slate-300 border-l-0 bg-background dark:border-slate-600"
          >
            <Search className="w-5 h-5" />
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`rounded-full ${isListening ? "bg-slate-200" : ""}`}
          title="Voice search"
          onClick={async (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log("MIC_BUTTON_CLICKED: User clicked microphone button");
            
            // Check if recognition instance exists
            const recognition = recognitionRef.current;
            if (!recognition) {
              console.error("MIC_BUTTON_CLICKED: Recognition instance not available");
              toast.error("Voice search is not available. Please refresh the page.");
              return;
            }

            // Check if already listening
            if (isListening) {
              console.log("MIC_BUTTON_CLICKED: Already listening, stopping recognition");
              try {
                recognition.stop();
              } catch (err) {
                console.error("MIC_BUTTON_CLICKED: Error stopping recognition", err);
              }
              return;
            }

            // Verify browser support for getUserMedia
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
              console.error("MIC_BUTTON_CLICKED: getUserMedia not supported");
              toast.error("Microphone access is not supported in this browser.");
              return;
            }

            try {
              console.log("REQUESTING_PERMISSION: Requesting microphone permission from user");
              
              // Request microphone permission
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              
              console.log("PERMISSION_GRANTED: Microphone permission granted by user");
              
              // Stop the stream immediately (we only needed to verify permission)
              stream.getTracks().forEach((track) => {
                console.log("REQUESTING_PERMISSION: Stopping temporary audio track");
                track.stop();
              });

              // Start speech recognition
              console.log("SPEECH_RECOGNITION_STARTING: Starting recognition session");
              recognition.start();
              console.log("SPEECH_RECOGNITION_STARTED: Recognition session started successfully");
              
            } catch (err: any) {
              console.error("REQUESTING_PERMISSION: Microphone permission error", {
                name: err?.name,
                message: err?.message,
              });
              
              setIsListening(false);
              
              // Handle specific permission errors
              if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
                console.error("PERMISSION_DENIED: User denied microphone permission");
                toast.error("Microphone permission denied. Please allow access to your microphone in browser settings.");
              } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
                console.error("PERMISSION_DENIED: No microphone device found");
                toast.error("No microphone found. Please connect a microphone to your device.");
              } else if (err?.name === "NotReadableError" || err?.name === "TrackStartError") {
                console.error("PERMISSION_DENIED: Microphone is already in use by another application");
                toast.error("Microphone is already in use. Please close other applications using your microphone.");
              } else if (err?.name === "OverconstrainedError" || err?.name === "ConstraintError") {
                console.error("PERMISSION_DENIED: Microphone cannot satisfy the requested constraints");
                toast.error("Microphone cannot meet the required settings. Please check your device.");
              } else if (err?.name === "TypeError") {
                console.error("PERMISSION_DENIED: Invalid constraints for getUserMedia");
                toast.error("Microphone configuration error. Please refresh the page and try again.");
              } else {
                console.error("PERMISSION_DENIED: Unknown error - " + (err?.name || "Unknown"));
                toast.error("Failed to access microphone: " + (err?.message || "Unknown error"));
              }
            }
          }}
        >
          <Mic className="w-5 h-5" />
        </Button>
      </form>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" title="Language">
              <Languages className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <div className="px-3 py-2 text-xs uppercase tracking-[0.15em] text-muted-foreground">
              Language
            </div>
            <DropdownMenuSeparator />
            {languages.map((lang) => (
              <DropdownMenuItem key={lang.code} onClick={() => setLocale(lang.code)}>
                {lang.label} {locale === lang.code ? "✓" : ""}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {authError && !user && (
          (() => {
            const lower = (authError || "").toLowerCase();
            const isUnauthorized = lower.includes("unauthorized-domain") || lower.includes("authentication blocked") || lower.includes("blocked from this domain");
            if (isUnauthorized) {
              const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
              const firebaseLink = projectId
                ? `https://console.firebase.google.com/project/${projectId}/authentication/providers`
                : "https://console.firebase.google.com/u/0/";
              return (
                <span className="text-xs text-red-500 hidden md:block">
                  {authError} — <a className="underline" href={firebaseLink} target="_blank" rel="noopener noreferrer">Add authorized domain in Firebase</a>
                </span>
              );
            }
            return <span className="text-xs text-red-500 hidden md:block">{authError}</span>;
          })()
        )}
        {user ? (
          <>
            {plan !== "FREE" && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                {plan}
              </span>
            )}
            <Link href="/call">
              <Button variant="ghost" size="icon" title="Video Call">
                <Phone className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/downloads">
              <Button variant="ghost" size="icon" title="Downloads">
                <Download className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/upload">
              <Button variant="ghost" size="icon" title="Upload Video">
                <Upload className="w-6 h-6" />
              </Button>
            </Link>
            <Link href="/notifications">
              <Button variant="ghost" size="icon" title="Notifications" className="relative">
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="pointer-events-none absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image} alt={user.name} />
                    <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <div className="px-2 py-2 text-sm">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-muted-foreground text-xs">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                {user?.channelname ? (
                  <DropdownMenuItem asChild>
                    <Link href={`/channel/${user._id}`}>Your channel</Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => setisdialogeopen(true)}>
                    Create Channel
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/subscription">Subscription</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/billing">Billing</Link>
                </DropdownMenuItem>
                {(user?.role === "moderator" || user?.role === "admin") && (
                  <DropdownMenuItem asChild>
                    <Link href="/moderator">Moderation</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/history">History</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/liked">Liked videos</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/watch-later">Watch later</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Sign in
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48" align="end">
              <DropdownMenuItem
                onClick={() => {
                  if (googleSigningIn) return;
                  handlegooglesignin();
                }}
                className={googleSigningIn ? "opacity-50 pointer-events-none" : ""}
              >
                {googleSigningIn ? "Signing in..." : "Sign in with Google"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/auth/login">Sign in with Email</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/auth/signup">Create Account</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
    </header>
  );
};

export default Header;
