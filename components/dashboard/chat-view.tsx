"use client";

import { useState, useEffect, useRef } from "react";
import { formatTime, cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  X,
  Check,
  CheckCheck,
  User,
  MoreVertical,
  Archive,
  Phone,
} from "lucide-react";

interface Message {
  id: string;
  content: string;
  senderType: "customer" | "agent" | "system" | "bot";
  senderName: string | null;
  source: "widget" | "dashboard" | "whatsapp";
  createdAt: string;
  waStatus?: "sent" | "delivered" | "read" | "failed" | null;
}

interface ConversationDetails {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerType: "wordpress" | "guest";
  contactType: "email" | "whatsapp" | "none";
  status: "active" | "closed" | "pending";
  movedToWhatsapp: boolean;
  waPhone: string | null;
  lastReadAtCustomer: string | null;
  createdAt: string;
}

interface ChatViewProps {
  conversationId: string;
  onClose: () => void;
}

export function ChatView({ conversationId, onClose }: ChatViewProps) {
  const [conversation, setConversation] = useState<ConversationDetails | null>(
    null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversation();
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function fetchConversation() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/conversations/${conversationId}`);
      const data = await res.json();
      setConversation(data.conversation);
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Failed to fetch conversation:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function scrollToBottom() {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }

  async function handleSend() {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const res = await fetch("/api/admin/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          content: newMessage,
          agentId: "temp-agent-id", // TODO: Get from auth
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages([...messages, data.message]);
        setNewMessage("");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  }

  async function handleStatusChange(status: "active" | "closed") {
    try {
      await fetch(`/api/admin/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setConversation((prev) => (prev ? { ...prev, status } : null));
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        שיחה לא נמצאה
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-primary/10 text-primary">
              {conversation.customerName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{conversation.customerName}</span>
              {conversation.customerType === "wordpress" && (
                <Badge variant="secondary" className="text-xs">
                  <User className="w-3 h-3 ml-1" />
                  רשום
                </Badge>
              )}
              {conversation.status === "closed" && (
                <Badge variant="outline" className="text-xs">
                  סגור
                </Badge>
              )}
            </div>
            {conversation.customerEmail && (
              <span className="text-sm text-muted-foreground">
                {conversation.customerEmail}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {conversation.waPhone && (
            <Button variant="outline" size="sm">
              <Phone className="w-4 h-4 ml-2" />
              {conversation.waPhone}
            </Button>
          )}
          {conversation.status === "active" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("closed")}
            >
              <Archive className="w-4 h-4 ml-2" />
              סגור שיחה
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("active")}
            >
              פתח מחדש
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.senderType === "agent" ? "justify-start" : "justify-end"
              )}
            >
              <div
                className={cn(
                  "max-w-[70%] rounded-2xl px-4 py-2 animate-fade-in",
                  message.senderType === "agent"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : message.senderType === "system"
                    ? "bg-muted text-muted-foreground text-center text-sm max-w-full"
                    : "bg-muted rounded-tl-sm"
                )}
              >
                <p className="whitespace-pre-wrap break-words">
                  {message.content}
                </p>
                <div
                  className={cn(
                    "flex items-center gap-1 mt-1 text-xs",
                    message.senderType === "agent"
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  )}
                >
                  <span>{formatTime(message.createdAt)}</span>
                  {message.senderType === "customer" && (
                    <>
                      {message.waStatus === "read" ? (
                        <CheckCheck className="w-3 h-3 text-blue-500" />
                      ) : message.waStatus === "delivered" ? (
                        <CheckCheck className="w-3 h-3" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                    </>
                  )}
                  {message.source === "whatsapp" && (
                    <span className="text-green-500">WhatsApp</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      {conversation.status !== "closed" && (
        <div className="p-4 border-t bg-card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="הקלד הודעה..."
              className="flex-1"
              disabled={isSending}
            />
            <Button type="submit" disabled={isSending || !newMessage.trim()}>
              <Send className="w-4 h-4 ml-2" />
              שלח
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
