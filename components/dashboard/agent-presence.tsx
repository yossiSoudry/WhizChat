"use client";

import { useEffect, useRef } from "react";

interface AgentPresenceProps {
  agentId: string;
}

export function AgentPresence({ agentId }: AgentPresenceProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!agentId) return;

    // Send initial heartbeat
    const sendHeartbeat = async () => {
      try {
        await fetch("/api/admin/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId }),
        });
      } catch (error) {
        console.error("Failed to send heartbeat:", error);
      }
    };

    // Send heartbeat immediately
    sendHeartbeat();

    // Send heartbeat every 30 seconds
    intervalRef.current = setInterval(sendHeartbeat, 30000);

    // Mark offline when leaving
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliability on page unload
      navigator.sendBeacon(
        `/api/admin/presence?agentId=${agentId}`,
        JSON.stringify({ offline: true })
      );
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // User switched tabs - still send heartbeat but less frequently
        // For now, just continue normal heartbeat
      } else {
        // User returned - send heartbeat immediately
        sendHeartbeat();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      // Mark offline when component unmounts
      fetch(`/api/admin/presence?agentId=${agentId}`, {
        method: "DELETE",
      }).catch(() => {});
    };
  }, [agentId]);

  // This component doesn't render anything
  return null;
}
