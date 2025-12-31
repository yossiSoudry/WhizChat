"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function ChatRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.id as string;

  useEffect(() => {
    if (conversationId) {
      // Store the conversation ID to auto-select it on the main page
      sessionStorage.setItem("selectedConversationId", conversationId);
      router.replace("/");
    }
  }, [conversationId, router]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">מעביר לשיחה...</span>
      </div>
    </div>
  );
}
