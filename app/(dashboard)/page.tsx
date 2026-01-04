"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ConversationList } from "@/components/dashboard/conversation-list";
import { ChatView } from "@/components/dashboard/chat-view";
import { AgentPresence } from "@/components/dashboard/agent-presence";
import { MessageSquare, MessageCircle, Wifi, Mail, Clock, ChevronLeft, ChevronRight, Menu, Archive, Volume2, VolumeX, Bell, BellOff, Search, X } from "lucide-react";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { cn } from "@/lib/utils";
import { Fade } from "@/components/animate-ui/primitives/effects/fade";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { MessageCircleMore } from "@/components/animate-ui/icons/message-circle-more";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebar } from "@/components/ui/sidebar";


interface FilterCounts {
  activeCount: number;
  unansweredCount: number;
  unreadCount: number;
}

type FilterType = "all" | "active" | "unanswered" | "unread" | "archived";

interface Conversation {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerAvatar: string | null;
  customerType: "wordpress" | "guest";
  status: "active" | "closed" | "pending";
  contactType: "email" | "whatsapp" | "none";
  unreadCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastMessageSenderType: "customer" | "agent" | "system" | null;
  lastMessageStatus: "sent" | "delivered" | "read" | null;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const previousUnreadCountRef = useRef<number>(-1); // -1 means not initialized yet
  const lastNotificationTimeRef = useRef<string | null>(null); // Track last notification to avoid duplicates
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();
  const { play: playNotificationSound, isEnabled: soundEnabled, setEnabled: setSoundEnabled, testSound } = useNotificationSound();
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, permission: pushPermission, subscribe: subscribeToPush, unsubscribe: unsubscribeFromPush, showNotification, isLoading: pushLoading } = usePushNotifications();

  const checkScrollButtons = useCallback(() => {
    if (filtersRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = filtersRef.current;
      // In RTL, scrollLeft is negative (starts at 0, goes negative as you scroll left)
      // canScrollRight = can scroll towards the end (more negative values in RTL)
      // canScrollLeft = can scroll towards the start (back to 0 in RTL)
      const maxScroll = scrollWidth - clientWidth;
      setCanScrollLeft(Math.abs(scrollLeft) < maxScroll - 1);
      setCanScrollRight(scrollLeft < 0);
    }
  }, []);

  useEffect(() => {
    checkScrollButtons();
    window.addEventListener("resize", checkScrollButtons);
    return () => window.removeEventListener("resize", checkScrollButtons);
  }, [checkScrollButtons]);

  const fetchFilterCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/conversations/unread-count");
      if (res.ok) {
        const data = await res.json();
        const newUnreadCount = data.unreadCount || 0;

        // Play notification sound and show push notification if unread count increased
        // Skip on first load (-1), but play when count increases after that
        if (previousUnreadCountRef.current >= 0 && newUnreadCount > previousUnreadCountRef.current) {
          playNotificationSound();
          showNotification("הודעה חדשה ב-WhizChat", {
            body: `יש לך ${newUnreadCount} הודעות שלא נקראו`,
            url: "/",
          });
        }
        previousUnreadCountRef.current = newUnreadCount;

        setFilterCounts({
          activeCount: data.activeCount || 0,
          unansweredCount: data.unansweredCount || 0,
          unreadCount: newUnreadCount,
        });
      }
    } catch (error) {
      console.error("Failed to fetch filter counts:", error);
    }
  }, [playNotificationSound, showNotification]);

  const fetchConversations = useCallback(async (filter: FilterType = "all", search?: string) => {
    try {
      const params = new URLSearchParams();
      if (filter === "archived") {
        params.set("archived", "true");
      } else if (filter !== "all") {
        params.set("filter", filter);
      }
      if (search) {
        params.set("search", search);
      }
      const url = `/api/admin/conversations${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      const newConversations = data.conversations || [];

      // Check for new customer messages (not from agent)
      if (lastNotificationTimeRef.current !== null) {
        const newMessageConv = newConversations.find((conv: Conversation) => {
          // Check if this conversation has a new message from customer
          if (conv.lastMessageSenderType === "customer" && conv.lastMessageAt) {
            const lastMsgTime = new Date(conv.lastMessageAt).getTime();
            const lastNotifTime = new Date(lastNotificationTimeRef.current!).getTime();
            // If this message is newer than our last notification AND it's not the currently selected chat
            if (lastMsgTime > lastNotifTime && conv.id !== selectedId) {
              return true;
            }
          }
          return false;
        });

        if (newMessageConv) {
          playNotificationSound();
          showNotification(newMessageConv.customerName, {
            body: newMessageConv.lastMessagePreview || "הודעה חדשה",
            url: "/",
          });
        }
      }

      // Update last notification time to the latest message time
      const latestMessageTime = newConversations.reduce((latest: string | null, conv: Conversation) => {
        if (!conv.lastMessageAt) return latest;
        if (!latest) return conv.lastMessageAt;
        return new Date(conv.lastMessageAt) > new Date(latest) ? conv.lastMessageAt : latest;
      }, null);

      if (latestMessageTime) {
        lastNotificationTimeRef.current = latestMessageTime;
      }

      setConversations(newConversations);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedId, playNotificationSound, showNotification]);

  // Check for direct conversation link on mount only
  useEffect(() => {
    const storedConversationId = sessionStorage.getItem("selectedConversationId");
    if (storedConversationId) {
      setSelectedId(storedConversationId);
      sessionStorage.removeItem("selectedConversationId");
    }
    // Initial fetch
    fetchFilterCounts();
  }, [fetchFilterCounts]);

  // Poll for new conversations and counts every 15 seconds (reduced from 5s)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations(activeFilter, debouncedSearchQuery || undefined);
      fetchFilterCounts();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchConversations, fetchFilterCounts, activeFilter, debouncedSearchQuery]);

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    setIsLoading(true);
  };

  // Stable callback for when a conversation is read
  const handleConversationRead = useCallback(() => {
    fetchConversations(activeFilter, debouncedSearchQuery || undefined);
    fetchFilterCounts();
  }, [fetchConversations, fetchFilterCounts, activeFilter, debouncedSearchQuery]);

  // Handle search with debounce
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setIsSearching(!!query);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce the actual search
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(query);
    }, 300);
  }, []);

  // Trigger fetch when debounced search query changes
  useEffect(() => {
    setIsLoading(true);
    fetchConversations(activeFilter, debouncedSearchQuery || undefined);
  }, [debouncedSearchQuery, activeFilter, fetchConversations]);

  const clearSearch = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setIsSearching(false);
    setShowSearchInput(false);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Focus search input when shown
  useEffect(() => {
    if (showSearchInput && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearchInput]);

  // Handle mobile chat selection
  const handleSelectConversation = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  // Handle going back from chat view on mobile
  const handleBackToList = useCallback(() => {
    setSelectedId(null);
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* DEBUG: Test push button - REMOVE AFTER TESTING */}
      <div className="bg-yellow-100 p-2 flex items-center justify-center gap-2 shrink-0">
        <span className="text-xs text-black">PWA Test:</span>
        <button
          type="button"
          onClick={() => {
            alert("TEST BUTTON WORKS!");
            subscribeToPush();
          }}
          className="bg-blue-500 text-white px-3 py-1 rounded text-sm font-bold"
        >
          Enable Push
        </button>
        <span className="text-xs text-black">
          Loading: {pushLoading ? "Y" : "N"} | Supported: {pushSupported ? "Y" : "N"} | Subscribed: {pushSubscribed ? "Y" : "N"}
        </span>
      </div>

      <div className="flex flex-1 min-h-0">
      {/* Agent presence heartbeat */}
      <AgentPresence />

      {/* Conversations List Panel - hidden on mobile when chat is selected */}
      <div className={cn(
        "shrink-0 border-l bg-card flex flex-col h-full overflow-hidden",
        "w-full md:w-[340px]",
        isMobile && selectedId && "hidden"
      )}>
        {/* Header */}
        <div className="shrink-0 border-b">
          <div className="h-14 flex items-center px-4 justify-between">
            <div className="flex items-center gap-2">
              {/* Hamburger menu for mobile */}
              <button
                onClick={() => setOpenMobile(true)}
                className="md:hidden w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <Menu className="w-4 h-4 text-muted-foreground" />
              </button>
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
            {/* Action buttons */}
            <div className="flex items-center gap-1">
              {/* Search button */}
              <button
                onClick={() => setShowSearchInput(!showSearchInput)}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                  showSearchInput || isSearching
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
                title="חיפוש שיחות"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Divider */}
              <div className="w-px h-5 bg-border mx-0.5" />

              {/* Push notifications toggle */}
              <button
                type="button"
                onPointerDown={() => {
                  console.log("[Push Button] pointerdown");
                }}
                onTouchStart={() => {
                  console.log("[Push Button] touchstart");
                }}
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("[Push Button] clicked", { pushLoading, pushSupported, pushSubscribed, pushPermission });
                  alert("Push button clicked! subscribed=" + pushSubscribed);
                  // Always allow click - handle states inside
                  if (pushSubscribed) {
                    await unsubscribeFromPush();
                  } else {
                    await subscribeToPush();
                  }
                }}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer select-none",
                  pushLoading
                    ? "bg-muted/50 text-muted-foreground animate-pulse"
                    : pushSubscribed
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : pushPermission === "denied"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
                title={
                  pushLoading
                    ? "טוען..."
                    : !pushSupported
                    ? "הדפדפן לא תומך בהתראות Push"
                    : pushPermission === "denied"
                    ? "התראות נחסמו בדפדפן"
                    : pushSubscribed
                    ? "התראות Push מופעלות - לחץ לכיבוי"
                    : "הפעל התראות Push"
                }
              >
                {pushSubscribed ? (
                  <Bell className="w-4 h-4" />
                ) : (
                  <BellOff className="w-4 h-4" />
                )}
              </button>

              {/* Sound toggle button - click to toggle, double-click to test */}
              <button
                onClick={() => {
                  const newState = !soundEnabled;
                  setSoundEnabled(newState);
                  // Play test sound when enabling to activate AudioContext
                  if (newState) {
                    testSound();
                  }
                }}
                onDoubleClick={() => {
                  // Double-click to test sound
                  testSound();
                }}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                  soundEnabled
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
                title={soundEnabled ? "לחץ לכיבוי | לחץ פעמיים לבדיקה" : "לחץ להפעלת צליל התראות"}
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Search input */}
          {showSearchInput && (
            <div className="px-4 pb-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="חיפוש לפי שם, אימייל או תוכן..."
                  className="w-full h-9 pr-9 pl-9 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  dir="rtl"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {isSearching && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  {conversations.length} תוצאות נמצאו
                </p>
              )}
            </div>
          )}
          {/* Filter tabs with horizontal scroll */}
          <div className="flex items-center pt-5 pb-2 px-1">
            {/* Right arrow - scrolls to show more content on the right (in RTL: towards start) */}
            <button
              onClick={() => {
                if (filtersRef.current) {
                  filtersRef.current.scrollBy({ left: 100, behavior: "smooth" });
                  setTimeout(checkScrollButtons, 300);
                }
              }}
              className={cn(
                "shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted transition-colors",
                canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Scrollable filters container */}
            <div
              ref={filtersRef}
              onScroll={checkScrollButtons}
              className="flex-1 flex items-center gap-1.5 px-1 pt-2 overflow-x-auto scroll-smooth"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
            >
              <AnimateIcon animateOnHover asChild>
                <button
                  onClick={() => handleFilterChange("all")}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0",
                    activeFilter === "all"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-border"
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
                      : "text-muted-foreground bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-border"
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
                      : "text-muted-foreground bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-border"
                  )}
                >
                  <Mail className="w-3.5 h-3.5 shrink-0" />
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
                      : "text-muted-foreground bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-border"
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
              <AnimateIcon animateOnHover asChild>
                <button
                  onClick={() => handleFilterChange("archived")}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0",
                    activeFilter === "archived"
                      ? "bg-orange-500 text-white shadow-sm"
                      : "text-muted-foreground bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-border"
                  )}
                >
                  <Archive className="w-3.5 h-3.5 shrink-0" />
                  ארכיון
                </button>
              </AnimateIcon>
            </div>

            {/* Left arrow - scrolls to show more content on the left (in RTL: towards end) */}
            <button
              onClick={() => {
                if (filtersRef.current) {
                  filtersRef.current.scrollBy({ left: -100, behavior: "smooth" });
                  setTimeout(checkScrollButtons, 300);
                }
              }}
              className={cn(
                "shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted transition-colors",
                canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"
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
            onSelect={handleSelectConversation}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Chat View Panel - full width on mobile when selected */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0",
        isMobile && !selectedId && "hidden",
        isMobile && selectedId && "w-full"
      )}>
        {selectedId ? (
          <ChatView
            conversationId={selectedId}
            onClose={handleBackToList}
            onStatusChange={() => fetchConversations(activeFilter, debouncedSearchQuery || undefined)}
            onRead={handleConversationRead}
            showBackButton={isMobile}
          />
        ) : (
          !isMobile && <EmptyState />
        )}
      </div>
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
