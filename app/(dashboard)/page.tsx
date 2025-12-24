"use client";

import { useState, useEffect } from "react";
import { ConversationList } from "@/components/dashboard/conversation-list";
import { ChatView } from "@/components/dashboard/chat-view";

interface Conversation {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerType: "wordpress" | "guest";
  status: "active" | "closed" | "pending";
  contactType: "email" | "whatsapp" | "none";
  unreadCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  movedToWhatsapp: boolean;
  createdAt: string;
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  async function fetchConversations() {
    try {
      const res = await fetch("/api/admin/conversations");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-full">
      {/* Conversations List */}
      <div className="w-80 border-l flex flex-col bg-card">
        <div className="p-4 border-b">
          <h1 className="text-lg font-semibold">שיחות</h1>
        </div>
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={setSelectedId}
          isLoading={isLoading}
        />
      </div>

      {/* Chat View */}
      <div className="flex-1">
        {selectedId ? (
          <ChatView
            conversationId={selectedId}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            בחר שיחה מהרשימה
          </div>
        )}
      </div>
    </div>
  );
}
