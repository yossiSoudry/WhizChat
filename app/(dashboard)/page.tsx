"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ConversationList } from "@/components/dashboard/conversation-list";
import { ChatView } from "@/components/dashboard/chat-view";
import { AgentPresence } from "@/components/dashboard/agent-presence";
import { MessageSquare, MessageCircle, Wifi, MailOpen, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Fade } from "@/components/animate-ui/primitives/effects/fade";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { MessageCircleMore } from "@/components/animate-ui/icons/message-circle-more";

// TODO: Replace with actual agent ID from auth
const TEMP_AGENT_ID = "temp-agent-id";

interface FilterCounts {
  activeCount: number;
  unansweredCount: number;
  unreadCount: number;
}

type FilterType = "all" | "active" | "unanswered" | "unread";

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
  const [filterCounts, setFilterCounts] = useState<FilterCounts>({
    activeCount: 0,
    unansweredCount: 0,
    unreadCount: 0,
  });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);

  const checkScrollButtons = useCallback(() => {
    if (filtersRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = filtersRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  }, []);

  useEffect(() => {
    checkScrollButtons();
    window.addEventListener("resize", checkScrollButtons);
    return () => window.removeEventListener("resize", checkScrollButtons);
  }, [checkScrollButtons]);

  const scrollFilters = (direction: "left" | "right") => {
    if (filtersRef.current) {
      const scrollAmount = 100;
      filtersRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkScrollButtons, 300);
    }
  };

  const fetchFilterCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/conversations/unread-count");
      if (res.ok) {
        const data = await res.json();
        setFilterCounts({
          activeCount: data.activeCount || 0,
          unansweredCount: data.unansweredCount || 0,
          unreadCount: data.unreadCount || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch filter counts:", error);
    }
  }, []);

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
    fetchFilterCounts();
  }, [fetchConversations, fetchFilterCounts, activeFilter]);

  // Poll for new conversations and counts every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations(activeFilter);
      fetchFilterCounts();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations, fetchFilterCounts, activeFilter]);

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
          <div className="h-14 flex items-center px-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-foreground">שיחות</h1>
                <p className="text-[10px] text-muted-foreground">
                  {conversations.filter(c => c.status === 'active').length} פעילות
                </p>
              </div>
            </div>
          </div>
          {/* Filter tabs with horizontal scroll */}
          <div className="flex items-center pt-2 pb-2 px-1">
            {/* Right scroll arrow */}
            <button
              onClick={() => scrollFilters("left")}
              className={cn(
                "shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted transition-colors",
                canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Scrollable filters container */}
            <div
              ref={filtersRef}
              onScroll={checkScrollButtons}
              className="flex-1 flex items-center gap-1.5 px-1 overflow-x-auto scrollbar-none"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <AnimateIcon animateOnHover asChild>
                <button
                  onClick={() => handleFilterChange("all")}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0",
                    activeFilter === "all"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <MessageCircleMore className="w-3.5 h-3.5 shrink-0" />
                  הכל
                </button>
              </AnimateIcon>
              <AnimateIcon animateOnHover asChild>
                <button
                  onClick={() => handleFilterChange("active")}
                  className={cn(
                    "relative flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0",
                    activeFilter === "active"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Wifi className="w-3.5 h-3.5 shrink-0" />
                  מחוברים
                  {filterCounts.activeCount > 0 && (
                    <span className="absolute -top-1.5 -left-1.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-600 to-pink-500 text-white text-[10px] font-medium shadow-sm">
                      {filterCounts.activeCount}
                    </span>
                  )}
                </button>
              </AnimateIcon>
              <AnimateIcon animateOnHover asChild>
                <button
                  onClick={() => handleFilterChange("unread")}
                  className={cn(
                    "relative flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0",
                    activeFilter === "unread"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <MailOpen className="w-3.5 h-3.5 shrink-0" />
                  לא נקראו
                  {filterCounts.unreadCount > 0 && (
                    <span className="absolute -top-1.5 -left-1.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-600 to-pink-500 text-white text-[10px] font-medium shadow-sm">
                      {filterCounts.unreadCount}
                    </span>
                  )}
                </button>
              </AnimateIcon>
              <AnimateIcon animateOnHover asChild>
                <button
                  onClick={() => handleFilterChange("unanswered")}
                  className={cn(
                    "relative flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0",
                    activeFilter === "unanswered"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  לא נענו
                  {filterCounts.unansweredCount > 0 && (
                    <span className="absolute -top-1.5 -left-1.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-600 to-pink-500 text-white text-[10px] font-medium shadow-sm">
                      {filterCounts.unansweredCount}
                    </span>
                  )}
                </button>
              </AnimateIcon>
            </div>

            {/* Left scroll arrow */}
            <button
              onClick={() => scrollFilters("right")}
              className={cn(
                "shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted transition-colors",
                canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
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
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/5 via-primary/3 to-transparent blur-3xl" />
      </div>

      {/* Content */}
      <Fade inView>
        <div className="relative z-10">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 mx-auto shadow-lg shadow-primary/10">
            <MessageSquare className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            בחר שיחה להצגה
          </h2>
          <p className="text-muted-foreground max-w-md leading-relaxed">
            בחר שיחה מהרשימה מימין כדי לצפות בהודעות ולהתחיל לשוחח עם הלקוחות שלך
          </p>

          {/* Status indicator */}
          <div className="mt-10 inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-card border border-border shadow-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <span className="text-sm font-medium text-foreground">מחובר ופעיל</span>
            <span className="text-xs text-muted-foreground">• מוכן לקבל שיחות</span>
          </div>
        </div>
      </Fade>
    </div>
  );
}
