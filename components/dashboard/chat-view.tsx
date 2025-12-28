"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { formatTime, cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  CheckCheck,
  User,
  Archive,
  Phone,
  Smile,
  ArrowDownCircle,
  MoreVertical,
  ArrowRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// Animate UI components
import { Fade } from "@/components/animate-ui/primitives/effects/fade";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Send } from "@/components/animate-ui/icons/send";
import { X } from "@/components/animate-ui/icons/x";
import { RotateCcw } from "@/components/animate-ui/icons/rotate-ccw";
import { Paperclip } from "@/components/animate-ui/icons/paperclip";
import { Slide } from "@/components/animate-ui/primitives/effects/slide";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/animate-ui/components/radix/tooltip";

interface Message {
  id: string;
  content: string;
  senderType: "customer" | "agent" | "system" | "bot";
  senderName: string | null;
  source: "widget" | "dashboard" | "whatsapp";
  createdAt: string;
  status: "sent" | "delivered" | "read";
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
  onStatusChange?: () => void;
  onRead?: () => void;
  showBackButton?: boolean;
}

// Typing indicator component using Animate UI Fade
function TypingIndicator() {
  return (
    <Fade inView inViewOnce={false}>
      <div className="flex items-center gap-1 px-4 py-2">
        <div className="flex items-center gap-1 bg-muted rounded-full px-3 py-2">
          <span className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-dot" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-dot" style={{ animationDelay: '200ms' }} />
          <span className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-dot" style={{ animationDelay: '400ms' }} />
        </div>
      </div>
    </Fade>
  );
}

// Message status indicator (WhatsApp style)
// - Single check: message sent
// - Double check (gray): message delivered
// - Double check (blue): message read
function MessageStatus({ status }: { status: "sent" | "delivered" | "read" }) {
  if (status === "sent") {
    return <Check className="w-3.5 h-3.5 text-muted-foreground" />;
  }
  if (status === "delivered") {
    return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />;
  }
  if (status === "read") {
    return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />;
  }
  return <Check className="w-3.5 h-3.5 text-muted-foreground" />;
}

// Loading skeleton
function ChatViewSkeleton() {
  return (
    <div className="flex flex-col h-full bg-background animate-pulse">
      <div className="h-16 border-b bg-card flex items-center gap-3 px-4">
        <div className="w-10 h-10 rounded-full skeleton" />
        <div className="space-y-2">
          <div className="h-4 w-32 skeleton" />
          <div className="h-3 w-24 skeleton" />
        </div>
      </div>
      <div className="flex-1 p-4 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
            <div className={cn("skeleton rounded-2xl", i % 2 === 0 ? "w-48 h-16" : "w-64 h-12")} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatView({ conversationId, onClose, onStatusChange, onRead, showBackButton = false }: ChatViewProps) {
  const [conversation, setConversation] = useState<ConversationDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [customerIsTyping, setCustomerIsTyping] = useState(false);
  const [customerIsOnline, setCustomerIsOnline] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Store onRead in a ref to avoid dependency issues
  const onReadRef = useRef(onRead);
  useEffect(() => {
    onReadRef.current = onRead;
  }, [onRead]);

  useEffect(() => {
    async function loadConversation() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/admin/conversations/${conversationId}`);
        const data = await res.json();
        setConversation(data.conversation);
        setMessages(data.messages || []);

        // Mark as read by agent when opening the chat
        const readRes = await fetch("/api/chat/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            readerType: "agent",
          }),
        });

        // Notify parent to refresh counts after marking as read
        if (readRes.ok) {
          onReadRef.current?.();
        }
      } catch (error) {
        console.error("Failed to fetch conversation:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadConversation();
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input on load
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  // Poll for new messages
  const fetchNewMessages = useCallback(async () => {
    if (!conversationId || isLoading) return;

    try {
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage) return;

      const res = await fetch(
        `/api/chat/messages?conversationId=${conversationId}&after=${lastMessage.id}&viewerType=agent`
      );

      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          const newCustomerMessages = data.messages.filter(
            (m: Message) => m.senderType === "customer"
          );

          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMessages = data.messages.filter(
              (m: Message) => !existingIds.has(m.id)
            );
            return [...prev, ...newMessages];
          });

          // Mark new customer messages as read
          if (newCustomerMessages.length > 0) {
            await fetch("/api/chat/read", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                conversationId,
                readerType: "agent",
              }),
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch new messages:", error);
    }
  }, [conversationId, isLoading, messages]);

  // Combined polling for typing, presence, and message status sync
  const pollChatStatus = useCallback(async () => {
    if (!conversationId || isLoading) return;

    try {
      // Fetch all status in parallel
      const [typingRes, presenceRes, messagesRes] = await Promise.all([
        fetch(`/api/chat/typing?conversationId=${conversationId}&userType=agent`),
        fetch(`/api/chat/presence?conversationId=${conversationId}`),
        fetch(`/api/chat/messages?conversationId=${conversationId}&viewerType=agent`),
      ]);

      if (typingRes.ok) {
        const data = await typingRes.json();
        setCustomerIsTyping(data.isTyping);
      }

      if (presenceRes.ok) {
        const data = await presenceRes.json();
        setCustomerIsOnline(data.isOnline);
      }

      // Sync message statuses (for read receipts on agent messages)
      if (messagesRes.ok) {
        const data = await messagesRes.json();
        if (data.messages && data.messages.length > 0) {
          setMessages((prev) =>
            prev.map((msg) => {
              const updated = data.messages.find((m: Message) => m.id === msg.id);
              if (updated && updated.status !== msg.status) {
                return { ...msg, status: updated.status };
              }
              return msg;
            })
          );
        }
      }
    } catch (error) {
      // Silent fail
    }
  }, [conversationId, isLoading]);

  // Single polling interval for messages (5 seconds)
  useEffect(() => {
    if (isLoading || !conversationId) return;

    const interval = setInterval(fetchNewMessages, 5000);
    return () => clearInterval(interval);
  }, [isLoading, conversationId, fetchNewMessages]);

  // Single polling interval for typing, presence, and status sync (3 seconds)
  useEffect(() => {
    if (isLoading || !conversationId) return;

    // Check immediately
    pollChatStatus();

    const interval = setInterval(pollChatStatus, 3000);
    return () => clearInterval(interval);
  }, [isLoading, conversationId, pollChatStatus]);

  // Send typing status
  const sendTypingStatus = useCallback(async (typing: boolean) => {
    if (!conversationId) return;

    try {
      await fetch("/api/chat/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          isTyping: typing,
          userType: "agent",
          userId: "agent-user",
        }),
      });
    } catch (error) {
      // Silent fail
    }
  }, [conversationId]);

  // Handle input change with typing indicator
  const handleInputChange = (value: string) => {
    setNewMessage(value);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (value.trim()) {
      sendTypingStatus(true);
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingStatus(false);
      }, 2000);
    } else {
      sendTypingStatus(false);
    }
  };


  function scrollToBottom() {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }

  function handleScroll() {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
    }
  }

  async function handleSend() {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    sendTypingStatus(false); // Stop typing indicator when sending
    try {
      const res = await fetch("/api/admin/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          content: newMessage,
          agentId: "temp-agent-id",
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
      // Notify parent to refresh conversation list
      onStatusChange?.();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  }

  if (isLoading) {
    return <ChatViewSkeleton />;
  }

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <X className="w-7 h-7" />
        </div>
        <h3 className="font-medium text-foreground mb-1">שיחה לא נמצאה</h3>
        <p className="text-sm text-center">השיחה לא קיימת או שנמחקה</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-3">
          {/* Back button for mobile */}
          {showBackButton && (
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          <div className="relative">
            <Avatar className="w-10 h-10 border-2 border-background shadow-sm">
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {conversation.customerName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {customerIsOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full status-online border-2 border-card" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">
                {conversation.customerName}
              </span>
              {conversation.customerType === "wordpress" && (
                <Badge variant="secondary" className="h-5 text-[10px] px-1.5 gap-1 bg-primary/5 text-primary border-0">
                  <User className="w-2.5 h-2.5" />
                  רשום
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {customerIsOnline ? (
                <span className="text-emerald-500 font-medium">מחובר עכשיו</span>
              ) : conversation.customerEmail ? (
                <span>{conversation.customerEmail}</span>
              ) : (
                <span className="text-muted-foreground">לא מחובר</span>
              )}
              {conversation.status === "closed" && (
                <Badge variant="outline" className="h-4 text-[10px] px-1.5">
                  סגור
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {conversation.waPhone && (
            <Button variant="ghost" size="sm" className="gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">{conversation.waPhone}</span>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {conversation.status === "active" ? (
                <DropdownMenuItem onClick={() => handleStatusChange("closed")}>
                  <Archive className="w-4 h-4 ml-2" />
                  סגור שיחה
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => handleStatusChange("active")}>
                  <RotateCcw className="w-4 h-4 ml-2" />
                  פתח מחדש
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onClose} className="text-destructive focus:text-destructive">
                <X className="w-4 h-4 ml-2" />
                סגור חלון
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea
        className="flex-1"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        <div className="px-4 py-6 pb-24 space-y-3">
          {/* Date separator - can be added for message grouping */}
          {messages.length > 0 && (
            <div className="flex items-center justify-center mb-4">
              <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                {new Date(messages[0].createdAt).toLocaleDateString('he-IL', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}

          {messages.map((message, index) => {
            const isAgent = message.senderType === "agent";
            const isSystem = message.senderType === "system";
            const isCustomer = message.senderType === "customer";
            const showAvatar = index === 0 || messages[index - 1].senderType !== message.senderType;

            return (
              <Slide
                key={message.id}
                direction={isAgent ? "left" : "right"}
                offset={20}
                delay={Math.min(index * 50, 500)}
                inView
                className={cn(
                  "flex gap-2",
                  isAgent ? "justify-start" : "justify-end",
                  isSystem && "justify-center"
                )}
              >
                {/* Agent avatar */}
                {isAgent && showAvatar && (
                  <Avatar className="w-8 h-8 border border-border">
                    <AvatarFallback className="bg-brand-gradient text-white text-xs">
                      W
                    </AvatarFallback>
                  </Avatar>
                )}
                {isAgent && !showAvatar && <div className="w-8" />}

                {/* Message bubble */}
                <div
                  className={cn(
                    "max-w-[70%] animate-scale-in",
                    isSystem && "max-w-[85%]"
                  )}
                >
                  <div
                    className={cn(
                      "px-4 py-2.5 rounded-2xl",
                      isAgent && "bg-brand-gradient text-white rounded-tr-sm shadow-sm",
                      isCustomer && "bg-card border border-border rounded-tl-sm",
                      isSystem && "bg-muted/70 text-muted-foreground text-center text-sm px-4 py-2"
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                      {message.content}
                    </p>
                  </div>

                  {/* Message meta */}
                  {!isSystem && (
                    <div
                      className={cn(
                        "flex items-center gap-1.5 mt-1 px-1",
                        isAgent ? "justify-start" : "justify-end"
                      )}
                    >
                      <span className="text-[11px] text-muted-foreground">
                        {formatTime(message.createdAt)}
                      </span>
                      {/* Show status for agent messages (from agent's perspective in dashboard) */}
                      {isAgent && <MessageStatus status={message.status} />}
                      {message.source === "whatsapp" && (
                        <span className="text-[11px] text-emerald-500 font-medium">
                          WA
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Customer avatar */}
                {isCustomer && showAvatar && (
                  <Avatar className="w-8 h-8 border border-border">
                    <AvatarFallback className={cn(
                      "text-xs",
                      conversation.customerType === "wordpress"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {conversation.customerName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                {isCustomer && !showAvatar && <div className="w-8" />}
              </Slide>
            );
          })}

          {/* Customer typing indicator */}
          {customerIsTyping && (
            <Fade inView inViewOnce={false}>
              <div className="flex items-center gap-2 justify-end px-4">
                <div className="flex items-center gap-1 bg-muted rounded-full px-3 py-2">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-dot" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-dot" style={{ animationDelay: '200ms' }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-dot" style={{ animationDelay: '400ms' }} />
                </div>
                <Avatar className="w-8 h-8 border border-border">
                  <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                    {conversation?.customerName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </Fade>
          )}
        </div>
      </ScrollArea>

      {/* Scroll to bottom button with Animate UI Fade */}
      {showScrollButton && (
        <Fade inView inViewOnce={false}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={scrollToBottom}
                className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-card border border-border rounded-full p-2 shadow-lg hover:shadow-xl transition-all"
              >
                <ArrowDownCircle className="w-5 h-5 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">גלול למטה</TooltipContent>
          </Tooltip>
        </Fade>
      )}

      {/* Floating Input */}
      {conversation.status !== "closed" && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="relative"
          >
            <div className="relative flex items-center bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
              <div className="flex items-center gap-1 pr-3">
                <AnimateIcon animateOnHover asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-foreground"
                  >
                    <Paperclip className="w-4.5 h-4.5" />
                  </Button>
                </AnimateIcon>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                >
                  <Smile className="w-4.5 h-4.5" />
                </Button>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="הקלד הודעה..."
                className="flex-1 h-14 bg-transparent border-none outline-none text-[15px] px-0 placeholder:text-muted-foreground"
                disabled={isSending}
              />
              <div className="pl-2 pr-2">
                <AnimateIcon animateOnHover asChild>
                  <Button
                    type="submit"
                    disabled={isSending || !newMessage.trim()}
                    size="icon"
                    className="h-10 w-10 rounded-xl bg-brand-gradient hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </AnimateIcon>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Closed conversation footer */}
      {conversation.status === "closed" && (
        <div className="p-4 border-t bg-muted/30 text-center">
          <p className="text-sm text-muted-foreground">
            השיחה סגורה.{" "}
            <button
              onClick={() => handleStatusChange("active")}
              className="text-primary hover:underline font-medium"
            >
              פתח מחדש
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
