"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AgoraRTC, {
  type IAgoraRTCClient,
  type IAgoraRTCRemoteUser,
  type ICameraVideoTrack,
  type IMicrophoneAudioTrack,
} from "agora-rtc-sdk-ng";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import { toast } from "sonner";

export default function CallRoomPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const channelName = searchParams.get("channel");
  const token = searchParams.get("token");
  //   const role = searchParams.get("role");

  const [localTracks, setLocalTracks] = useState<{
    audioTrack: IMicrophoneAudioTrack | null;
    videoTrack: ICameraVideoTrack | null;
  }>({
    audioTrack: null,
    videoTrack: null,
  });

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!channelName || !token) {
      toast.error("Invalid channel name or token");
      router.push("/");
      return;
    }

    // Initialize Agora client
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    clientRef.current = client;

    // Setup event handlers
    client.on("user-published", handleUserPublished);
    client.on("user-unpublished", handleUserUnpublished);

    // Join the channel
    const joinChannel = async () => {
      try {
        // Generate a random uid for this user
        const uid = Math.floor(Math.random() * 1000000);

        // Join the channel
        await client.join(
          process.env.NEXT_PUBLIC_AGORA_APP_ID!,
          channelName,
          token,
          uid
        );

        // Create local audio and video tracks
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        const videoTrack = await AgoraRTC.createCameraVideoTrack();

        // Play local video track
        if (localVideoRef.current) {
          videoTrack.play(localVideoRef.current);
        }

        // Publish local tracks to the channel
        await client.publish([audioTrack, videoTrack]);

        setLocalTracks({
          audioTrack,
          videoTrack,
        });

        console.log("Successfully joined channel and published local tracks");
      } catch (error) {
        console.error("Error joining channel:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to join channel"
        );
      }
    };

    joinChannel();

    // Cleanup function
    return () => {
      // Leave the channel and release resources when component unmounts
      if (clientRef.current) {
        clientRef.current.leave();
      }

      // Close and release local tracks
      if (localTracks.audioTrack) {
        localTracks.audioTrack.close();
      }
      if (localTracks.videoTrack) {
        localTracks.videoTrack.close();
      }
    };
  }, [channelName, token, router]);

  const handleUserPublished = async (
    user: IAgoraRTCRemoteUser,
    mediaType: "audio" | "video"
  ) => {
    // Subscribe to the remote user
    await clientRef.current?.subscribe(user, mediaType);

    // Update remote users state
    setRemoteUsers((prev) => {
      // Check if user already exists
      if (prev.find((u) => u.uid === user.uid)) {
        return prev.map((u) => (u.uid === user.uid ? user : u));
      } else {
        return [...prev, user];
      }
    });

    // Play remote tracks
    if (mediaType === "video" && user.videoTrack) {
      // Create a div for the remote video if it doesn't exist
      const playerContainer = document.createElement("div");
      playerContainer.id = `remote-${user.uid}`;
      playerContainer.className = "w-full h-full";
      document.getElementById("remote-videos")?.appendChild(playerContainer);

      user.videoTrack.play(`remote-${user.uid}`);
    }

    if (mediaType === "audio" && user.audioTrack) {
      user.audioTrack.play();
    }
  };

  const handleUserUnpublished = (user: IAgoraRTCRemoteUser) => {
    // Remove user from remote users state
    setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));

    // Remove the remote user's video container
    const playerContainer = document.getElementById(`remote-${user.uid}`);
    if (playerContainer) {
      playerContainer.remove();
    }
  };

  const toggleAudio = async () => {
    if (localTracks.audioTrack) {
      if (isAudioMuted) {
        await localTracks.audioTrack.setEnabled(true);
      } else {
        await localTracks.audioTrack.setEnabled(false);
      }
      setIsAudioMuted(!isAudioMuted);
    }
  };

  const toggleVideo = async () => {
    if (localTracks.videoTrack) {
      if (isVideoMuted) {
        await localTracks.videoTrack.setEnabled(true);
      } else {
        await localTracks.videoTrack.setEnabled(false);
      }
      setIsVideoMuted(!isVideoMuted);
    }
  };

  const endCall = async () => {
    // Leave the channel
    if (clientRef.current) {
      await clientRef.current.leave();
    }

    // Close local tracks
    if (localTracks.audioTrack) {
      localTracks.audioTrack.close();
    }
    if (localTracks.videoTrack) {
      localTracks.videoTrack.close();
    }

    // Navigate back to home
    router.push("/");
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Local Video */}
        <Card className="relative overflow-hidden bg-black">
          <div ref={localVideoRef} className="w-full h-full"></div>
          <div className="absolute bottom-2 left-2 bg-slate-800 text-white px-2 py-1 rounded text-sm">
            You {isVideoMuted && "(Video Off)"}
          </div>
        </Card>

        {/* Remote Videos */}
        <div id="remote-videos" className="grid gap-4">
          {remoteUsers.length === 0 && (
            <Card className="flex items-center justify-center h-full bg-slate-800 text-white">
              <p>Waiting for others to join...</p>
            </Card>
          )}
        </div>
      </div>

      {/* Call Controls */}
      <div className="bg-white p-4 flex justify-center gap-4">
        <Button
          variant={isAudioMuted ? "outline" : "default"}
          size="icon"
          onClick={toggleAudio}
        >
          {isAudioMuted ? <MicOff /> : <Mic />}
        </Button>

        <Button
          variant={isVideoMuted ? "outline" : "default"}
          size="icon"
          onClick={toggleVideo}
        >
          {isVideoMuted ? <VideoOff /> : <Video />}
        </Button>

        <Button variant="destructive" size="icon" onClick={endCall}>
          <PhoneOff />
        </Button>
      </div>
    </div>
  );
}
