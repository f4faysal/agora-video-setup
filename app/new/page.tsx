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

export default function NewCallPage() {
  const router = useRouter();
  const [receiverId, setReceiverId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleStartCall = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!receiverId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid receiver ID",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/call/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ receiverId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to initiate call");
      }

      // Navigate to the call room with the channel info
      router.push(
        `/call/room?channel=${data.channelName}&token=${data.token}&role=host`
      );
    } catch (error) {
      console.error("Error starting call:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to start call",
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
          <CardTitle>Start a New Call</CardTitle>
          <CardDescription>
            Enter the ID of the user you want to call
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleStartCall}>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="receiverId">Receiver ID</Label>
                <Input
                  id="receiverId"
                  placeholder="Enter receiver ID"
                  value={receiverId}
                  onChange={(e) => setReceiverId(e.target.value)}
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
              {isLoading ? "Starting Call..." : "Start Call"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
