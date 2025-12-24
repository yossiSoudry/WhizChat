"use client";

import { formatRelativeTime, truncate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, MessageSquare } from "lucide-react";

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

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-muted-foreground">
        <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
        <p>אין שיחות עדיין</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="divide-y">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={cn(
              "w-full p-4 text-right transition-colors hover:bg-muted/50",
              selectedId === conv.id && "bg-muted"
            )}
          >
            <div className="flex items-start gap-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback
                  className={cn(
                    conv.customerType === "wordpress"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {conv.customerName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">
                    {conv.customerName}
                  </span>
                  <div className="flex items-center gap-2">
                    {conv.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {conv.unreadCount}
                      </Badge>
                    )}
                    {conv.lastMessageAt && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(conv.lastMessageAt)}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground truncate mt-1">
                  {conv.lastMessagePreview || "שיחה חדשה"}
                </p>

                <div className="flex items-center gap-2 mt-2">
                  {conv.customerType === "wordpress" && (
                    <Badge variant="secondary" className="text-xs">
                      <User className="w-3 h-3 ml-1" />
                      רשום
                    </Badge>
                  )}
                  {conv.status === "closed" && (
                    <Badge variant="outline" className="text-xs">
                      סגור
                    </Badge>
                  )}
                  {conv.movedToWhatsapp && (
                    <Badge variant="success" className="text-xs">
                      WhatsApp
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
