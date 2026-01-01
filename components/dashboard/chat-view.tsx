"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { formatTime, cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAgent } from "@/contexts/agent-context";
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
  Search,
  X as XIcon,
  ChevronUp,
  ChevronDown,
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
import { FileMessage } from "./file-message";
import { ImagePreviewModal } from "./image-preview-modal";

// Format date for message separators (היום, אתמול, יום שלישי, or full date)
function formatDateSeparator(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Reset times to midnight for comparison
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

  const diffDays = Math.floor((todayOnly.getTime() - dateOnly.getTime()) / (1000 * 60 * 60 * 24));

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return "היום";
  }

  if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return "אתמול";
  }

  // Within last 7 days - show day name
  if (diffDays < 7) {
    return date.toLocaleDateString('he-IL', { weekday: 'long' });
  }

  // Older than a week - show full date
  return date.toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

interface Message {
  id: string;
  content: string;
  senderType: "customer" | "agent" | "system" | "bot";
  senderName: string | null;
  source: "widget" | "dashboard" | "whatsapp";
  createdAt: string;
  status: "sent" | "delivered" | "read";
  waStatus?: "sent" | "delivered" | "read" | "failed" | null;
  messageType?: "text" | "image" | "file" | "audio" | "video";
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileMimeType?: string | null;
  isUploading?: boolean;
  localPreviewUrl?: string;
}

interface ConversationDetails {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerAvatar: string | null;
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
  const { agent } = useAgent();
  const [conversation, setConversation] = useState<ConversationDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [customerIsTyping, setCustomerIsTyping] = useState(false);
  const [customerIsOnline, setCustomerIsOnline] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<File | null>(null);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageSearchInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

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

  // Search in messages
  useEffect(() => {
    if (!messageSearchQuery.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    const query = messageSearchQuery.toLowerCase();
    const results: number[] = [];

    messages.forEach((msg, index) => {
      if (msg.content.toLowerCase().includes(query)) {
        results.push(index);
      }
    });

    setSearchResults(results);
    setCurrentSearchIndex(0);

    // Scroll to first result
    if (results.length > 0) {
      scrollToMessage(results[0]);
    }
  }, [messageSearchQuery, messages]);

  // Focus search input when shown
  useEffect(() => {
    if (showMessageSearch && messageSearchInputRef.current) {
      messageSearchInputRef.current.focus();
    }
  }, [showMessageSearch]);

  function scrollToMessage(messageIndex: number) {
    const element = messageRefs.current.get(messageIndex);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function goToNextSearchResult() {
    if (searchResults.length === 0) return;
    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    scrollToMessage(searchResults[nextIndex]);
  }

  function goToPrevSearchResult() {
    if (searchResults.length === 0) return;
    const prevIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIndex(prevIndex);
    scrollToMessage(searchResults[prevIndex]);
  }

  function closeMessageSearch() {
    setShowMessageSearch(false);
    setMessageSearchQuery("");
    setSearchResults([]);
    setCurrentSearchIndex(0);
  }

  function highlightSearchText(text: string): React.ReactNode {
    if (!messageSearchQuery.trim()) return text;

    const query = messageSearchQuery.toLowerCase();
    const lowerText = text.toLowerCase();
    const index = lowerText.indexOf(query);

    if (index === -1) return text;

    return (
      <>
        {text.slice(0, index)}
        <mark className="bg-yellow-300 text-foreground rounded px-0.5">
          {text.slice(index, index + messageSearchQuery.length)}
        </mark>
        {text.slice(index + messageSearchQuery.length)}
      </>
    );
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

  async function handleArchive() {
    if (!confirm("האם אתה בטוח שברצונך להעביר את השיחה לארכיון?\nכל הקבצים והתמונות ימחקו לצמיתות.")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/conversations/${conversationId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        onStatusChange?.();
        onClose();
      } else {
        const error = await res.json();
        alert(error.error || "שגיאה בהעברה לארכיון");
      }
    } catch (error) {
      console.error("Failed to archive:", error);
      alert("שגיאה בהעברה לארכיון");
    }
  }

  async function handleFileUpload(file: File, caption?: string) {
    if (!file || isUploading) return;

    setIsUploading(true);

    // Create temporary message ID
    const tempId = `temp-${Date.now()}`;
    const isImage = file.type.startsWith("image/");
    const localPreviewUrl = isImage ? URL.createObjectURL(file) : undefined;

    // Add temporary uploading message immediately
    const tempMessage: Message = {
      id: tempId,
      content: caption?.trim() || file.name,
      senderType: "agent",
      senderName: agent?.name || null,
      source: "dashboard",
      createdAt: new Date().toISOString(),
      status: "sent",
      messageType: isImage ? "image" : "file",
      fileName: file.name,
      fileSize: file.size,
      fileMimeType: file.type,
      isUploading: true,
      localPreviewUrl,
    };

    setMessages((prev) => [...prev, tempMessage]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("conversationId", conversationId);
      if (caption) {
        formData.append("caption", caption);
      }

      const res = await fetch("/api/admin/messages/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        // Replace temp message with real message
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? data.message : m))
        );
      } else {
        const error = await res.json();
        console.error("Upload failed:", error.error);
        // Remove temp message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        alert(error.error || "שגיאה בהעלאת הקובץ");
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert("שגיאה בהעלאת הקובץ");
    } finally {
      setIsUploading(false);
      // Cleanup local preview URL
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      // Check if it's an image - show preview modal
      if (file.type.startsWith("image/")) {
        setPreviewImage(file);
      } else {
        // For non-image files, upload directly
        handleFileUpload(file);
      }
    }
  }

  function handleImageSend(file: File, caption: string) {
    setPreviewImage(null);
    handleFileUpload(file, caption);
  }

  function handleImageCancel() {
    setPreviewImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
              {conversation.customerAvatar && (
                <AvatarImage src={conversation.customerAvatar} alt={conversation.customerName} />
              )}
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
          {/* Search messages button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMessageSearch(!showMessageSearch)}
            className={cn(
              "text-muted-foreground hover:text-foreground",
              showMessageSearch && "bg-primary/10 text-primary"
            )}
            title="חיפוש בהודעות"
          >
            <Search className="w-4 h-4" />
          </Button>
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
              <DropdownMenuItem onClick={handleArchive} className="text-orange-600 focus:text-orange-600">
                <Archive className="w-4 h-4 ml-2" />
                העבר לארכיון
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onClose} className="text-destructive focus:text-destructive">
                <X className="w-4 h-4 ml-2" />
                סגור חלון
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Message search bar */}
      {showMessageSearch && (
        <div className="px-4 py-2 border-b bg-card flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={messageSearchInputRef}
              type="text"
              value={messageSearchQuery}
              onChange={(e) => setMessageSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (e.shiftKey) {
                    goToPrevSearchResult();
                  } else {
                    goToNextSearchResult();
                  }
                } else if (e.key === "Escape") {
                  closeMessageSearch();
                }
              }}
              placeholder="חיפוש בהודעות..."
              className="w-full h-8 pr-9 pl-3 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              dir="rtl"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {currentSearchIndex + 1} / {searchResults.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={goToPrevSearchResult}
                disabled={searchResults.length <= 1}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={goToNextSearchResult}
                disabled={searchResults.length <= 1}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          )}
          {messageSearchQuery && searchResults.length === 0 && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">לא נמצאו תוצאות</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={closeMessageSearch}
          >
            <XIcon className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Messages */}
      <ScrollArea
        className="flex-1"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        <div className="px-4 py-6 pb-24 space-y-3">

          {messages.map((message, index) => {
            const isAgent = message.senderType === "agent";
            const isSystem = message.senderType === "system";
            const isCustomer = message.senderType === "customer";
            const showAvatar = index === 0 || messages[index - 1].senderType !== message.senderType;

            // Check if we need to show a date separator
            const messageDate = new Date(message.createdAt).toDateString();
            const prevMessageDate = index > 0 ? new Date(messages[index - 1].createdAt).toDateString() : null;
            const showDateSeparator = index === 0 || messageDate !== prevMessageDate;

            const isSearchResult = searchResults.includes(index);
            const isCurrentSearchResult = searchResults[currentSearchIndex] === index;

            return (
              <div
                key={message.id}
                ref={(el) => {
                  if (el) messageRefs.current.set(index, el);
                }}
              >
                {/* Date separator */}
                {showDateSeparator && (
                  <div className="flex items-center justify-center my-4">
                    <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                      {formatDateSeparator(message.createdAt)}
                    </span>
                  </div>
                )}

              <Slide
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
                    {agent?.avatarUrl && <AvatarImage src={agent.avatarUrl} alt={agent.name} />}
                    <AvatarFallback className="bg-brand-gradient text-white text-xs">
                      {agent?.name?.slice(0, 2).toUpperCase() || "W"}
                    </AvatarFallback>
                  </Avatar>
                )}
                {isAgent && !showAvatar && <div className="w-8" />}

                {/* Message bubble */}
                {(() => {
                  const isFileMessage = message.messageType && message.messageType !== "text";
                  const isImageMessage = message.messageType === "image";

                  return (
                    <div
                      className={cn(
                        "max-w-[70%] animate-scale-in",
                        isSystem && "max-w-[85%]"
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-2xl transition-all",
                          // Smaller padding for images, normal for text/files
                          isImageMessage ? "p-1.5" : isFileMessage ? "p-2" : "px-4 py-2.5",
                          isAgent && "bg-brand-gradient text-white rounded-tr-sm shadow-sm",
                          isCustomer && "bg-card border border-border rounded-tl-sm",
                          isSystem && "bg-muted/70 text-muted-foreground text-center text-sm px-4 py-2",
                          // Highlight search results
                          isCurrentSearchResult && "ring-2 ring-yellow-400 ring-offset-2",
                          isSearchResult && !isCurrentSearchResult && "ring-1 ring-yellow-300/50"
                        )}
                      >
                        {/* File/Image message */}
                        {isFileMessage ? (
                          <FileMessage
                            messageType={message.messageType!}
                            fileUrl={message.fileUrl || ""}
                            fileName={message.fileName || "file"}
                            fileSize={message.fileSize || 0}
                            fileMimeType={message.fileMimeType || "application/octet-stream"}
                            isAgent={isAgent}
                            isUploading={message.isUploading}
                            localPreviewUrl={message.localPreviewUrl}
                            caption={message.content}
                          />
                        ) : (
                          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                            {isSearchResult ? highlightSearchText(message.content) : message.content}
                          </p>
                        )}
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
                  );
                })()}

                {/* Customer avatar */}
                {isCustomer && showAvatar && (
                  <Avatar className="w-8 h-8 border border-border">
                    {conversation.customerAvatar && (
                      <AvatarImage src={conversation.customerAvatar} alt={conversation.customerName} />
                    )}
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
              </div>
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
                  {conversation?.customerAvatar && (
                    <AvatarImage src={conversation.customerAvatar} alt={conversation.customerName} />
                  )}
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
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json,.zip,.rar,audio/*,video/*"
                onChange={handleFileSelect}
              />
              <div className="flex items-center gap-1 pr-3">
                <AnimateIcon animateOnHover asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Paperclip className="w-4.5 h-4.5" />
                    )}
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
                className="flex-1 h-14 bg-transparent !border-0 !outline-none !ring-0 !shadow-none focus:!outline-none focus:!ring-0 focus:!border-0 focus:!shadow-none focus-visible:!outline-none focus-visible:!ring-0 text-[15px] px-0 placeholder:text-muted-foreground"
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

      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          file={previewImage}
          onSend={handleImageSend}
          onCancel={handleImageCancel}
        />
      )}
    </div>
  );
}
