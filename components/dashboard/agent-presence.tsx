"use client";

import { useEffect, useRef } from "react";

export function AgentPresence() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Send initial heartbeat
    const sendHeartbeat = async () => {
      try {
        await fetch("/api/admin/presence", {
          method: "POST",
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
      navigator.sendBeacon("/api/admin/presence", "");
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
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
      fetch("/api/admin/presence", {
        method: "DELETE",
      }).catch(() => {});
    };
  }, []);

  // This component doesn't render anything
  return null;
}
