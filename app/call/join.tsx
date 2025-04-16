"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";

export default function JoinCallPage() {
  const router = useRouter();
  const [channelName, setChannelName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinCall = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!channelName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid channel name",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/call/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ channelName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to join call");
      }

      // Navigate to the call room with the channel info
      router.push(
        `/call/room?channel=${channelName}&token=${data.token}&role=audience`
      );
    } catch (error) {
      console.error("Error joining call:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to join call",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join a Call</CardTitle>
          <CardDescription>
            Enter the channel name to join an existing call
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleJoinCall}>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="channelName">Channel Name</Label>
                <Input
                  id="channelName"
                  placeholder="Enter channel name"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Joining..." : "Join Call"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
