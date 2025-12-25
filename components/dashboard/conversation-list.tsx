"use client";

import { formatRelativeTime, cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Search, Inbox } from "lucide-react";
import { useState, useMemo } from "react";
// Animate UI components
import { Fade } from "@/components/animate-ui/primitives/effects/fade";

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

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}

// Skeleton component for loading state
function ConversationSkeleton() {
  return (
    <div className="p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-full skeleton" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 skeleton" />
            <div className="h-3 w-12 skeleton" />
          </div>
          <div className="h-3 w-full skeleton" />
          <div className="flex gap-2">
            <div className="h-5 w-14 rounded-full skeleton" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.customerName.toLowerCase().includes(query) ||
        conv.customerEmail?.toLowerCase().includes(query) ||
        conv.lastMessagePreview?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 shrink-0">
          <div className="h-10 skeleton rounded-lg" />
        </div>
        <div className="flex-1 overflow-auto divide-y divide-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <ConversationSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="p-4 shrink-0">
        <div className="relative flex items-center h-10 w-full rounded-lg bg-muted/50 focus-within:bg-card transition-colors">
          <Search className="w-4 h-4 text-muted-foreground absolute right-3 pointer-events-none" />
          <input
            type="text"
            placeholder="חיפוש שיחות..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-full bg-transparent rounded-lg pr-10 pl-3 text-sm placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* List */}
      {filteredConversations.length === 0 ? (
        <Fade inView>
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              {searchQuery ? (
                <Search className="w-7 h-7 text-muted-foreground" />
              ) : (
                <Inbox className="w-7 h-7 text-muted-foreground" />
              )}
            </div>
            <h3 className="font-medium text-foreground mb-1">
              {searchQuery ? "לא נמצאו תוצאות" : "אין שיחות עדיין"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? "נסה לחפש במילים אחרות"
                : "שיחות חדשות יופיעו כאן"}
            </p>
          </div>
        </Fade>
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          <div className="border-t border-border">
            {filteredConversations.map((conv, index) => (
              <Fade key={conv.id} delay={index * 30} inView>
                <button
                  onClick={() => onSelect(conv.id)}
                  className={cn(
                    "w-full px-4 py-2.5 text-right transition-all duration-150 border-b border-border",
                    "hover:bg-muted/50 focus:outline-none focus:bg-muted/50",
                    selectedId === conv.id && "bg-muted/80"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <Avatar className="w-10 h-10 border-2 border-background shadow-sm">
                        <AvatarFallback
                          className={cn(
                            "text-sm font-medium",
                            conv.customerType === "wordpress"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {conv.customerName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Online status dot */}
                      {conv.isCustomerOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full status-online border-2 border-background" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-medium text-sm truncate text-foreground">
                            {conv.customerName}
                          </span>
                          {conv.customerType === "wordpress" && (
                            <Badge
                              variant="secondary"
                              className="h-4 text-[9px] px-1 gap-0.5 bg-primary/5 text-primary border-0 shrink-0"
                            >
                              <User className="w-2 h-2" />
                              רשום
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {conv.unreadCount > 0 && (
                            <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
                              {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Message preview */}
                      <p className={cn(
                        "text-[13px] truncate",
                        conv.unreadCount > 0
                          ? "text-foreground font-medium"
                          : "text-muted-foreground"
                      )}>
                        {conv.lastMessagePreview || "שיחה חדשה"}
                      </p>

                      {/* Bottom row - time and status */}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {conv.lastMessageAt && (
                          <span className="text-[11px] text-muted-foreground">
                            {formatRelativeTime(conv.lastMessageAt)}
                          </span>
                        )}
                        {conv.status === "closed" && (
                          <Badge
                            variant="outline"
                            className="h-4 text-[9px] px-1"
                          >
                            סגור
                          </Badge>
                        )}
                        {conv.movedToWhatsapp && (
                          <Badge
                            className="h-4 text-[9px] px-1 bg-emerald-500/10 text-emerald-600 border-0"
                          >
                            WA
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              </Fade>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
