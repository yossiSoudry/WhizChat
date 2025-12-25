"use client";

import { useState, useEffect, useCallback } from "react";
import { ConversationList } from "@/components/dashboard/conversation-list";
import { ChatView } from "@/components/dashboard/chat-view";
import { AgentPresence } from "@/components/dashboard/agent-presence";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

// TODO: Replace with actual agent ID from auth
const TEMP_AGENT_ID = "temp-agent-id";

type FilterType = "all" | "active" | "unanswered";

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
  isCustomerOnline: boolean;
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const fetchConversations = useCallback(async (filter: FilterType = "all") => {
    try {
      const url = filter === "all"
        ? "/api/admin/conversations"
        : `/api/admin/conversations?filter=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations(activeFilter);
  }, [fetchConversations, activeFilter]);

  // Poll for new conversations every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchConversations(activeFilter), 5000);
    return () => clearInterval(interval);
  }, [fetchConversations, activeFilter]);

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    setIsLoading(true);
  };

  return (
    <div className="flex h-full">
      {/* Agent presence heartbeat */}
      <AgentPresence agentId={TEMP_AGENT_ID} />

      {/* Conversations List Panel */}
      <div className="w-[340px] shrink-0 border-l bg-card flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="shrink-0 border-b">
          <div className="h-14 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground">שיחות</h1>
              {conversations.length > 0 && (
                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                  {conversations.length}
                </span>
              )}
            </div>
          </div>
          {/* Filter tabs */}
          <div className="flex items-center gap-1 px-4 pb-3">
            <button
              onClick={() => handleFilterChange("all")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                activeFilter === "all"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              הכל
            </button>
            <button
              onClick={() => handleFilterChange("active")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                activeFilter === "active"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              מחוברים
            </button>
            <button
              onClick={() => handleFilterChange("unanswered")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                activeFilter === "unanswered"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              לא נענו
            </button>
          </div>
        </div>

        {/* Conversations List - takes remaining height */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={setSelectedId}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Chat View Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedId ? (
          <ChatView
            conversationId={selectedId}
            onClose={() => setSelectedId(null)}
            onStatusChange={() => fetchConversations(activeFilter)}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

// Empty state component
function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      {/* Decorative background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="w-[500px] h-[500px] rounded-full bg-gradient-to-br from-primary/5 to-transparent blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-6 mx-auto">
          <MessageSquare className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          בחר שיחה להצגה
        </h2>
        <p className="text-muted-foreground max-w-sm">
          בחר שיחה מהרשימה כדי לצפות בהודעות ולהגיב ללקוחות
        </p>

        {/* Quick stats or tips */}
        <div className="mt-8 flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
            <span className="w-2 h-2 rounded-full status-online" />
            <span className="text-sm text-muted-foreground">מחובר ופעיל</span>
          </div>
        </div>
      </div>
    </div>
  );
}
