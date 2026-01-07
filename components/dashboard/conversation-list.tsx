"use client";

import { formatRelativeTime, cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { User, Inbox, Check, CheckCheck } from "lucide-react";
// Animate UI components
import { Fade } from "@/components/animate-ui/primitives/effects/fade";

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
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-muted to-muted/50" />
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 rounded-md bg-gradient-to-r from-muted to-muted/50" />
            <div className="h-3 w-14 rounded-md bg-muted/60" />
          </div>
          <div className="h-3.5 w-4/5 rounded-md bg-gradient-to-r from-muted to-transparent" />
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
  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
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
      {/* List */}
      {conversations.length === 0 ? (
        <Fade inView>
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-5 shadow-sm">
              <Inbox className="w-9 h-9 text-primary/60" />
            </div>
            <h3 className="font-semibold text-foreground mb-1.5 text-lg">
              אין שיחות
            </h3>
            <p className="text-sm text-muted-foreground">
              שיחות חדשות יופיעו כאן
            </p>
          </div>
        </Fade>
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          <div className="py-1">
            {conversations.map((conv, index) => (
              <Fade key={conv.id} delay={index * 30} inView>
                <button
                  onClick={() => onSelect(conv.id)}
                  className={cn(
                    "group w-full px-3 py-3 text-right transition-all duration-200 relative",
                    "hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-inset",
                    selectedId === conv.id
                      ? "bg-primary/5 before:absolute before:right-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-primary before:rounded-l-full"
                      : "hover:before:absolute hover:before:right-0 hover:before:top-2 hover:before:bottom-2 hover:before:w-[3px] hover:before:bg-primary/30 hover:before:rounded-l-full"
                  )}
                >
                  <div className="flex items-start gap-3 overflow-hidden">
                    {/* Right side (in RTL) - Avatar */}
                    <div className="relative shrink-0">
                      <Avatar className={cn(
                        "w-12 h-12 ring-2 ring-offset-2 ring-offset-background transition-all duration-200",
                        selectedId === conv.id
                          ? "ring-primary/30"
                          : "ring-transparent group-hover:ring-primary/20"
                      )}>
                        {conv.customerAvatar && (
                          <AvatarImage src={conv.customerAvatar} alt={conv.customerName} />
                        )}
                        <AvatarFallback
                          className={cn(
                            "text-sm font-semibold",
                            conv.customerType === "wordpress"
                              ? "bg-gradient-to-br from-primary/20 to-primary/10 text-primary"
                              : "bg-gradient-to-br from-muted to-muted/50 text-muted-foreground"
                          )}
                        >
                          {conv.customerName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Online status dot */}
                      {conv.isCustomerOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-[2.5px] border-background shadow-sm shadow-emerald-500/50 animate-pulse" />
                      )}
                    </div>

                    {/* Center - Content */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      {/* First row: Name + badges + time */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={cn(
                            "font-semibold text-sm truncate transition-colors",
                            conv.unreadCount > 0 ? "text-foreground" : "text-foreground/90"
                          )}>
                            {conv.customerName}
                          </span>
                          {conv.customerType === "wordpress" && (
                            <Badge
                              variant="secondary"
                              className="h-[18px] text-[9px] px-1.5 gap-0.5 bg-gradient-to-r from-primary/10 to-primary/5 text-primary border-0 shrink-0 font-medium"
                            >
                              <User className="w-2.5 h-2.5" />
                              רשום
                            </Badge>
                          )}
                          {conv.status === "closed" && (
                            <Badge
                              variant="outline"
                              className="h-[18px] text-[9px] px-1.5 shrink-0 opacity-70"
                            >
                              סגור
                            </Badge>
                          )}
                          {conv.movedToWhatsapp && (
                            <Badge
                              className="h-[18px] text-[9px] px-1.5 bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 text-emerald-600 border-0 shrink-0 font-medium"
                            >
                              WA
                            </Badge>
                          )}
                        </div>
                        {conv.lastMessageAt && (
                          <span className={cn(
                            "text-[11px] whitespace-nowrap shrink-0 transition-colors",
                            conv.unreadCount > 0 ? "text-primary font-medium" : "text-muted-foreground"
                          )}>
                            {formatRelativeTime(conv.lastMessageAt)}
                          </span>
                        )}
                      </div>

                      {/* Second row: Message preview + unread count */}
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {/* Show status only for agent messages */}
                          {conv.lastMessageSenderType === "agent" && (
                            <MessageStatusIndicator status={conv.lastMessageStatus} />
                          )}
                          {(conv.lastMessagePreview?.length || 0) > 30 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={cn(
                                  "text-[13px] cursor-default truncate",
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
                              "text-[13px] truncate",
                              conv.unreadCount > 0
                                ? "text-foreground font-medium"
                                : "text-muted-foreground"
                            )}>
                              {conv.lastMessagePreview || "שיחה חדשה"}
                            </span>
                          )}
                        </div>
                        {conv.unreadCount > 0 && (
                          <span className="flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[10px] font-bold shrink-0 shadow-sm shadow-primary/30">
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
