"use client";

import { formatRelativeTime, cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { User, Search, Inbox, Check, CheckCheck } from "lucide-react";
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
  lastMessageSenderType: "customer" | "agent" | "system" | null;
  lastMessageStatus: "sent" | "delivered" | "read" | null;
  movedToWhatsapp: boolean;
  createdAt: string;
  isCustomerOnline: boolean;
}

// Message status indicator for conversation list
function MessageStatusIndicator({ status }: { status: "sent" | "delivered" | "read" | null }) {
  if (!status) return null;

  if (status === "read") {
    return <CheckCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
  }
  if (status === "delivered") {
    return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
  }
  return <Check className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
}

// Truncate text to a maximum length
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
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
                    "w-full px-4 py-3 text-right transition-all duration-150 border-b border-border",
                    "hover:bg-muted/50 focus:outline-none focus:bg-muted/50",
                    selectedId === conv.id && "bg-muted/80"
                  )}
                >
                  <div className="flex items-start gap-3 overflow-hidden">
                    {/* Right side (in RTL) - Avatar */}
                    <div className="relative shrink-0">
                      <Avatar className="w-11 h-11 border-2 border-background shadow-sm">
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

                    {/* Center - Content */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      {/* First row: Name + badges + time */}
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
                          {conv.status === "closed" && (
                            <Badge
                              variant="outline"
                              className="h-4 text-[9px] px-1.5 shrink-0"
                            >
                              סגור
                            </Badge>
                          )}
                          {conv.movedToWhatsapp && (
                            <Badge
                              className="h-4 text-[9px] px-1.5 bg-emerald-500/10 text-emerald-600 border-0 shrink-0"
                            >
                              WA
                            </Badge>
                          )}
                        </div>
                        {conv.lastMessageAt && (
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                            {formatRelativeTime(conv.lastMessageAt)}
                          </span>
                        )}
                      </div>

                      {/* Second row: Message preview + unread count */}
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <div className="flex items-center gap-1">
                          {/* Show status only for agent messages */}
                          {conv.lastMessageSenderType === "agent" && (
                            <MessageStatusIndicator status={conv.lastMessageStatus} />
                          )}
                          {(conv.lastMessagePreview?.length || 0) > 30 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={cn(
                                  "text-[13px] cursor-default",
                                  conv.unreadCount > 0
                                    ? "text-foreground font-medium"
                                    : "text-muted-foreground"
                                )}>
                                  {truncateText(conv.lastMessagePreview || "שיחה חדשה", 30)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-[300px] text-right">
                                {conv.lastMessagePreview}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className={cn(
                              "text-[13px]",
                              conv.unreadCount > 0
                                ? "text-foreground font-medium"
                                : "text-muted-foreground"
                            )}>
                              {conv.lastMessagePreview || "שיחה חדשה"}
                            </span>
                          )}
                        </div>
                        {conv.unreadCount > 0 && (
                          <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium shrink-0">
                            {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                          </span>
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
