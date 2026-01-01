"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Message, FAQItem, WidgetConfig, InitResponse } from "./types";

interface ChatWidgetProps {
  config?: WidgetConfig;
  apiUrl?: string;
}

// Storage keys
const STORAGE_SOUND_KEY = "whizchat-widget-sound";
const STORAGE_PUSH_KEY = "whizchat-widget-push";

// Create notification sound using Web Audio API
function playNotificationSound(volume: number = 0.5): void {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = audioContext.currentTime;

    // Pleasant two-tone notification
    const frequencies = [880, 1318.5]; // A5 and E6

    frequencies.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(freq, now);

      const startTime = now + index * 0.12;
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume * 0.4, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.5);
    });
  } catch (error) {
    console.error("Error playing notification sound:", error);
  }
}

// Generate unique ID for deduplication
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Format time for display
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// Message status icons (WhatsApp style)
// - Single check: message sent
// - Double check (gray): message delivered
// - Double check (blue): message read
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function DoubleCheckIcon({ read = false }: { read?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={read ? "#3B82F6" : "currentColor"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 6 9 17 4 12" />
      <polyline points="22 6 13 17" />
    </svg>
  );
}

function MessageStatusIcon({ status }: { status?: "sent" | "delivered" | "read" }) {
  if (status === "read") {
    return <DoubleCheckIcon read />;
  }
  if (status === "delivered") {
    return <DoubleCheckIcon />;
  }
  return <CheckIcon />;
}

export function ChatWidget({ config = {}, apiUrl = "" }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactType, setContactType] = useState<"email" | "whatsapp" | null>(null);
  const [contactValue, setContactValue] = useState("");
  const [userName, setUserName] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [agentIsTyping, setAgentIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "default">("default");
  const [showSettings, setShowSettings] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  const {
    position = "right",
    primaryColor = "#C026D3",
    secondaryColor = "#A21CAF",
    wpUserId,
    wpUserEmail,
    wpUserName,
    wpUserAvatar,
  } = config;

  // Load settings from localStorage
  useEffect(() => {
    try {
      const soundStored = localStorage.getItem(STORAGE_SOUND_KEY);
      if (soundStored !== null) {
        setSoundEnabled(JSON.parse(soundStored));
      }
      const pushStored = localStorage.getItem(STORAGE_PUSH_KEY);
      if (pushStored !== null) {
        setPushEnabled(JSON.parse(pushStored));
      }
      // Check notification permission
      if ("Notification" in window) {
        setPushPermission(Notification.permission);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save sound setting
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SOUND_KEY, JSON.stringify(soundEnabled));
    } catch {
      // Ignore
    }
  }, [soundEnabled]);

  // Save push setting
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PUSH_KEY, JSON.stringify(pushEnabled));
    } catch {
      // Ignore
    }
  }, [pushEnabled]);

  // Request push notification permission
  const requestPushPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    try {
      const result = await Notification.requestPermission();
      setPushPermission(result);
      if (result === "granted") {
        setPushEnabled(true);
        return true;
      }
      setPushEnabled(false);
      return false;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, []);

  // Show push notification
  const showPushNotification = useCallback((title: string, body: string) => {
    if (!pushEnabled || pushPermission !== "granted") return;
    // Only show if tab is not visible
    if (document.visibilityState === "visible" && isOpen) return;
    try {
      new Notification(title, {
        body,
        icon: "/icons/icon-192x192.png",
        tag: "whizchat-widget",
      });
    } catch (error) {
      console.error("Error showing notification:", error);
    }
  }, [pushEnabled, pushPermission, isOpen]);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input when opened and clear unread count
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  // Initialize chat
  const initChat = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/chat/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wpUserId,
          wpUserEmail,
          wpUserName,
          wpUserAvatar,
        }),
      });

      if (res.ok) {
        const data: InitResponse = await res.json();
        setConversationId(data.conversation.id);
        setMessages(data.messages || []);
        setIsOnline(data.settings.isOnline);
        setWelcomeMessage(data.settings.welcomeMessage);
        setFaqItems(data.settings.faqItems || []);

        // Mark agent messages as read by customer
        await fetch(`${apiUrl}/api/chat/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: data.conversation.id,
            readerType: "customer",
          }),
        });
      }
    } catch (error) {
      console.error("Failed to init chat:", error);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, wpUserId, wpUserEmail, wpUserName, wpUserAvatar]);

  // Initialize on first open
  useEffect(() => {
    if (isOpen && !conversationId) {
      initChat();
    }
  }, [isOpen, conversationId, initChat]);

  // Poll for new messages and status updates
  const fetchNewMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      const lastMessage = messages[messages.length - 1];
      const afterParam = lastMessage ? `&after=${lastMessage.id}` : "";
      const res = await fetch(
        `${apiUrl}/api/chat/messages?conversationId=${conversationId}${afterParam}&viewerType=customer`
      );

      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          const newAgentMessages = data.messages.filter(
            (m: Message) => m.senderType === "agent" && m.id !== lastMessageIdRef.current
          );

          // Play notification sound and show push notification for new agent messages
          if (newAgentMessages.length > 0) {
            const latestAgentMsg = newAgentMessages[newAgentMessages.length - 1];
            lastMessageIdRef.current = latestAgentMsg.id;

            // Play sound if enabled
            if (soundEnabled) {
              playNotificationSound();
            }

            // Show push notification if widget is closed or tab not visible
            if (!isOpen || document.visibilityState !== "visible") {
              showPushNotification(
                "New Message",
                latestAgentMsg.content.substring(0, 100)
              );
              // Increment unread count if widget is closed
              if (!isOpen) {
                setUnreadCount(prev => prev + newAgentMessages.length);
              }
            }
          }

          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMessages = data.messages.filter(
              (m: Message) => !existingIds.has(m.id)
            );
            return [...prev, ...newMessages];
          });

          // Mark new agent messages as read if widget is open
          if (newAgentMessages.length > 0 && isOpen) {
            await fetch(`${apiUrl}/api/chat/read`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                conversationId,
                readerType: "customer",
              }),
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }, [apiUrl, conversationId, isOpen, messages, soundEnabled, showPushNotification]);

  // Sync message statuses (to get read receipts)
  const syncMessageStatuses = useCallback(async () => {
    if (!conversationId || !isOpen || messages.length === 0) return;

    try {
      const res = await fetch(
        `${apiUrl}/api/chat/messages?conversationId=${conversationId}&viewerType=customer`
      );

      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          // Update status of existing messages
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
      // Silent fail for status sync
    }
  }, [apiUrl, conversationId, isOpen, messages.length]);

  // Polling interval for new messages (3 seconds when open, 10 seconds when closed for notifications)
  useEffect(() => {
    if (!conversationId) return;

    // Poll more frequently when open, less when closed
    const pollInterval = isOpen ? 3000 : 10000;
    const interval = setInterval(fetchNewMessages, pollInterval);
    return () => clearInterval(interval);
  }, [isOpen, conversationId, fetchNewMessages]);

  // Polling interval for status sync (5 seconds)
  useEffect(() => {
    if (!isOpen || !conversationId) return;

    const interval = setInterval(syncMessageStatuses, 5000);
    return () => clearInterval(interval);
  }, [isOpen, conversationId, syncMessageStatuses]);

  // Check if agent is typing
  const checkAgentTyping = useCallback(async () => {
    if (!conversationId || !isOpen) return;

    try {
      const res = await fetch(
        `${apiUrl}/api/chat/typing?conversationId=${conversationId}&userType=customer`
      );
      if (res.ok) {
        const data = await res.json();
        setAgentIsTyping(data.isTyping);
      }
    } catch (error) {
      // Silent fail for typing status
    }
  }, [apiUrl, conversationId, isOpen]);

  // Poll for agent typing status
  useEffect(() => {
    if (!isOpen || !conversationId) return;

    const interval = setInterval(checkAgentTyping, 2000);
    return () => clearInterval(interval);
  }, [isOpen, conversationId, checkAgentTyping]);

  // Send customer presence heartbeat
  const sendPresenceHeartbeat = useCallback(async () => {
    if (!conversationId || !isOpen) return;

    try {
      await fetch(`${apiUrl}/api/chat/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });
    } catch (error) {
      // Silent fail for presence
    }
  }, [apiUrl, conversationId, isOpen]);

  // Customer presence heartbeat - every 30 seconds when widget is open
  useEffect(() => {
    if (!isOpen || !conversationId) return;

    // Send immediately when opening
    sendPresenceHeartbeat();

    const interval = setInterval(sendPresenceHeartbeat, 30000);
    return () => clearInterval(interval);
  }, [isOpen, conversationId, sendPresenceHeartbeat]);

  // Send typing status
  const sendTypingStatus = useCallback(async (typing: boolean) => {
    if (!conversationId) return;

    try {
      await fetch(`${apiUrl}/api/chat/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          isTyping: typing,
          userType: "customer",
          userId: "widget-user",
        }),
      });
    } catch (error) {
      // Silent fail for typing status
    }
  }, [apiUrl, conversationId]);

  // Handle input change with typing indicator
  const handleInputChange = (value: string) => {
    setInputValue(value);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (value.trim()) {
      // Send typing = true
      sendTypingStatus(true);

      // Set timeout to send typing = false after 2 seconds of no typing
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingStatus(false);
      }, 2000);
    } else {
      sendTypingStatus(false);
    }
  };

  // Send message
  async function sendMessage(content: string) {
    if (!content.trim() || !conversationId || isSending) return;

    const clientMessageId = generateId();
    const tempMessage: Message = {
      id: clientMessageId,
      content,
      senderType: "customer",
      senderName: userName || null,
      source: "widget",
      createdAt: new Date().toISOString(),
      status: "sent",
    };

    setMessages((prev) => [...prev, tempMessage]);
    setInputValue("");
    setIsSending(true);
    sendTypingStatus(false); // Stop typing indicator when sending

    try {
      const res = await fetch(`${apiUrl}/api/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          content,
          clientMessageId,
          senderType: "customer",
          senderName: userName || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === clientMessageId ? data.message : m))
        );
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  }

  // Handle FAQ click
  async function handleFAQClick(item: FAQItem) {
    await sendMessage(item.question);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const botMessage: Message = {
        id: generateId(),
        content: item.answer,
        senderType: "bot",
        senderName: "WhizBot",
        source: "widget",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 1000);
  }

  // Submit contact info
  async function submitContact() {
    if (!contactType || !contactValue.trim() || !conversationId) return;

    try {
      await fetch(`${apiUrl}/api/chat/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          contactType,
          contactValue,
          name: userName || undefined,
        }),
      });

      setShowContactForm(false);

      const systemMessage: Message = {
        id: generateId(),
        content: contactType === "whatsapp"
          ? "Excellent! We will continue this conversation on WhatsApp."
          : "Thank you for your inquiry. We will respond shortly.",
        senderType: "system",
        senderName: null,
        source: "widget",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, systemMessage]);
    } catch (error) {
      console.error("Failed to submit contact:", error);
    }
  }

  // Upload file
  async function uploadFile(file: File) {
    if (!file || !conversationId || isUploading) return;

    const clientMessageId = generateId();

    // Create temp message
    const tempMessage: Message = {
      id: clientMessageId,
      content: file.name,
      senderType: "customer",
      senderName: userName || null,
      source: "widget",
      createdAt: new Date().toISOString(),
      status: "sent",
      messageType: file.type.startsWith("image/") ? "image" : "file",
      fileName: file.name,
      fileSize: file.size,
      fileMimeType: file.type,
    };

    setMessages((prev) => [...prev, tempMessage]);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("conversationId", conversationId);
      formData.append("clientMessageId", clientMessageId);
      formData.append("senderType", "customer");
      if (userName) formData.append("senderName", userName);

      const res = await fetch(`${apiUrl}/api/chat/upload`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === clientMessageId ? data.message : m))
        );
      } else {
        // Remove failed message
        setMessages((prev) => prev.filter((m) => m.id !== clientMessageId));
        console.error("Upload failed");
      }
    } catch (error) {
      // Remove failed message
      setMessages((prev) => prev.filter((m) => m.id !== clientMessageId));
      console.error("Failed to upload file:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  }

  // Format file size
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="whizchat-widget-container">
      <style>{`
        /* ========================================
           WhizChat Widget - Premium Design
           Clean, subtle, modern aesthetics
           ======================================== */

        .whizchat-widget-container {
          --wc-primary: ${primaryColor};
          --wc-primary-hover: ${secondaryColor};
          --wc-bg: #FFFFFF;
          --wc-bg-secondary: #F8F9FA;
          --wc-text: #1a1a2e;
          --wc-text-secondary: #6B7280;
          --wc-border: #E8EAED;
          --wc-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
          --wc-shadow-lg: 0 20px 50px rgba(0, 0, 0, 0.12);
          --wc-radius: 1rem;
          --wc-radius-lg: 1.25rem;

          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
          position: fixed;
          bottom: 24px;
          ${position}: 24px;
          z-index: 999999;
          direction: ltr;
        }

        /* ========================================
           Chat Button
           ======================================== */
        .wc-button {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--wc-primary), var(--wc-primary-hover));
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--wc-shadow-lg), 0 0 0 0 rgba(192, 38, 211, 0.3);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .wc-button:hover {
          transform: scale(1.05);
          box-shadow: var(--wc-shadow-lg), 0 0 0 8px rgba(192, 38, 211, 0.1);
        }

        .wc-button:active {
          transform: scale(0.98);
        }

        .wc-button svg {
          width: 26px;
          height: 26px;
          color: white;
          transition: transform 0.3s ease;
        }

        .wc-button.open svg {
          transform: rotate(90deg);
        }

        /* Notification badge */
        .wc-button-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          border-radius: 10px;
          background: #EF4444;
          color: white;
          font-size: 11px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          animation: wc-pulse 2s infinite;
        }

        @keyframes wc-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        /* ========================================
           Chat Window
           ======================================== */
        .wc-window {
          position: absolute;
          bottom: 72px;
          ${position}: 0;
          width: 380px;
          height: 540px;
          background: var(--wc-bg);
          border-radius: var(--wc-radius-lg);
          box-shadow: var(--wc-shadow-lg);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: wc-slide-up 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid var(--wc-border);
        }

        @keyframes wc-slide-up {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* ========================================
           Header
           ======================================== */
        .wc-header {
          background: var(--wc-bg);
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--wc-border);
        }

        .wc-header-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .wc-header-avatar {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--wc-primary), var(--wc-primary-hover));
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(192, 38, 211, 0.25);
        }

        .wc-header-avatar svg {
          width: 20px;
          height: 20px;
          color: white;
        }

        .wc-header-info h3 {
          font-size: 15px;
          font-weight: 600;
          color: var(--wc-text);
          margin: 0;
        }

        .wc-header-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--wc-text-secondary);
          margin-top: 2px;
        }

        .wc-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
        }

        .wc-status-dot.offline {
          background: #9CA3AF;
          box-shadow: none;
        }

        .wc-close {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--wc-text-secondary);
          transition: all 0.2s ease;
        }

        .wc-close:hover {
          background: var(--wc-bg-secondary);
          color: var(--wc-text);
        }

        /* ========================================
           Messages
           ======================================== */
        .wc-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: var(--wc-bg-secondary);
        }

        .wc-messages::-webkit-scrollbar {
          width: 4px;
        }

        .wc-messages::-webkit-scrollbar-thumb {
          background: var(--wc-border);
          border-radius: 2px;
        }

        .wc-message {
          display: flex;
          flex-direction: column;
          max-width: 85%;
          animation: wc-fade-in 0.25s ease-out;
        }

        @keyframes wc-fade-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .wc-message-bubble {
          padding: 12px 16px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.5;
          position: relative;
          width: fit-content;
        }

        .wc-message.customer {
          align-self: flex-end;
          align-items: flex-end;
        }

        .wc-message.customer .wc-message-bubble {
          background: var(--wc-bg);
          color: var(--wc-text);
          border: 1px solid var(--wc-border);
          border-bottom-right-radius: 4px;
        }

        .wc-message.agent,
        .wc-message.bot {
          align-self: flex-start;
          align-items: flex-start;
        }

        .wc-message.agent .wc-message-bubble,
        .wc-message.bot .wc-message-bubble {
          background: linear-gradient(135deg, var(--wc-primary), var(--wc-primary-hover));
          color: white;
          border-bottom-left-radius: 4px;
          box-shadow: 0 2px 8px rgba(192, 38, 211, 0.2);
        }

        .wc-message.system .wc-message-bubble {
          background: rgba(99, 102, 241, 0.1);
          color: #4338CA;
          border-radius: 12px;
          text-align: center;
          font-size: 13px;
          align-self: center;
          max-width: 90%;
        }

        .wc-message-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
          padding: 0 4px;
        }

        .wc-message.customer .wc-message-meta {
          justify-content: flex-end;
        }

        .wc-message-time {
          font-size: 11px;
          color: var(--wc-text-secondary);
        }

        .wc-message-status {
          display: flex;
          align-items: center;
          color: var(--wc-text-secondary);
        }

        /* Typing indicator */
        .wc-typing {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 12px 16px;
          background: var(--wc-bg);
          border-radius: 16px;
          border-bottom-left-radius: 4px;
          align-self: flex-start;
          border: 1px solid var(--wc-border);
        }

        .wc-typing-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--wc-text-secondary);
          animation: wc-typing 1.4s infinite ease-in-out;
        }

        .wc-typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .wc-typing-dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes wc-typing {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          30% {
            transform: translateY(-4px);
            opacity: 1;
          }
        }

        /* ========================================
           FAQ
           ======================================== */
        .wc-faq {
          padding: 12px 16px;
          border-top: 1px solid var(--wc-border);
          background: var(--wc-bg);
        }

        .wc-faq-title {
          font-size: 12px;
          color: var(--wc-text-secondary);
          margin-bottom: 10px;
          font-weight: 500;
        }

        .wc-faq-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .wc-faq-item {
          background: var(--wc-bg);
          border: 1px solid var(--wc-border);
          border-radius: 20px;
          padding: 8px 14px;
          font-size: 13px;
          color: var(--wc-text);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .wc-faq-item:hover {
          border-color: var(--wc-primary);
          color: var(--wc-primary);
          background: rgba(192, 38, 211, 0.05);
        }

        /* ========================================
           Input Area
           ======================================== */
        .wc-input-area {
          padding: 16px;
          border-top: 1px solid var(--wc-border);
          background: var(--wc-bg);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .wc-input-wrapper {
          flex: 1;
          position: relative;
        }

        .wc-input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid var(--wc-border);
          border-radius: 24px;
          font-size: 14px;
          outline: none;
          transition: all 0.2s ease;
          background: var(--wc-bg-secondary);
          color: var(--wc-text);
        }

        .wc-input:focus {
          border-color: var(--wc-primary);
          box-shadow: 0 0 0 3px rgba(192, 38, 211, 0.1);
          background: var(--wc-bg);
        }

        .wc-input::placeholder {
          color: var(--wc-text-secondary);
        }

        .wc-send {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--wc-primary), var(--wc-primary-hover));
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .wc-send:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(192, 38, 211, 0.3);
        }

        .wc-send:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .wc-send svg {
          width: 18px;
          height: 18px;
        }

        /* ========================================
           Contact Form
           ======================================== */
        .wc-contact {
          padding: 20px;
          border-top: 1px solid var(--wc-border);
          background: var(--wc-bg);
        }

        .wc-contact-title {
          font-size: 14px;
          font-weight: 500;
          color: var(--wc-text);
          margin-bottom: 12px;
        }

        .wc-contact-buttons {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .wc-contact-btn {
          flex: 1;
          padding: 12px;
          border: 1px solid var(--wc-border);
          border-radius: 12px;
          background: var(--wc-bg);
          cursor: pointer;
          font-size: 14px;
          color: var(--wc-text);
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .wc-contact-btn:hover {
          border-color: var(--wc-primary);
        }

        .wc-contact-btn.selected {
          background: linear-gradient(135deg, var(--wc-primary), var(--wc-primary-hover));
          color: white;
          border-color: transparent;
        }

        .wc-contact-input {
          width: 100%;
          margin-top: 8px;
          padding: 12px;
          border: 1px solid var(--wc-border);
          border-radius: 12px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }

        .wc-contact-input:focus {
          border-color: var(--wc-primary);
        }

        .wc-contact-submit {
          width: 100%;
          margin-top: 12px;
          padding: 12px;
          background: linear-gradient(135deg, var(--wc-primary), var(--wc-primary-hover));
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .wc-contact-submit:hover {
          opacity: 0.9;
        }

        /* ========================================
           Loading
           ======================================== */
        .wc-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 1;
        }

        .wc-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--wc-border);
          border-top-color: var(--wc-primary);
          border-radius: 50%;
          animation: wc-spin 0.8s linear infinite;
        }

        @keyframes wc-spin {
          to { transform: rotate(360deg); }
        }

        /* ========================================
           File Messages
           ======================================== */
        .wc-file-message {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.03);
          border-radius: 12px;
          text-decoration: none;
          color: inherit;
          transition: background 0.2s;
        }

        .wc-file-message:hover {
          background: rgba(0, 0, 0, 0.06);
        }

        .wc-message.agent .wc-file-message,
        .wc-message.bot .wc-file-message {
          background: rgba(255, 255, 255, 0.15);
        }

        .wc-message.agent .wc-file-message:hover,
        .wc-message.bot .wc-file-message:hover {
          background: rgba(255, 255, 255, 0.25);
        }

        .wc-file-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: var(--wc-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .wc-message.agent .wc-file-icon,
        .wc-message.bot .wc-file-icon {
          background: rgba(255, 255, 255, 0.2);
        }

        .wc-file-icon svg {
          width: 20px;
          height: 20px;
          color: white;
        }

        .wc-file-info {
          flex: 1;
          min-width: 0;
        }

        .wc-file-name {
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .wc-file-size {
          font-size: 11px;
          opacity: 0.7;
        }

        .wc-file-download {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.5;
          flex-shrink: 0;
        }

        .wc-file-download svg {
          width: 18px;
          height: 18px;
        }

        .wc-image-message {
          max-width: 240px;
          border-radius: 12px;
          overflow: hidden;
        }

        .wc-image-message img {
          width: 100%;
          height: auto;
          display: block;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .wc-image-message img:hover {
          opacity: 0.9;
        }

        .wc-image-loading {
          width: 200px;
          height: 150px;
          background: var(--wc-bg-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .wc-attach-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--wc-text-secondary);
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .wc-attach-btn:hover:not(:disabled) {
          background: var(--wc-bg-secondary);
          color: var(--wc-text);
        }

        .wc-attach-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .wc-attach-btn svg {
          width: 20px;
          height: 20px;
        }

        /* ========================================
           Settings Panel
           ======================================== */
        .wc-settings-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--wc-text-secondary);
          transition: all 0.2s ease;
          margin-left: 4px;
        }

        .wc-settings-btn:hover {
          background: var(--wc-bg-secondary);
          color: var(--wc-text);
        }

        .wc-settings-btn.active {
          background: var(--wc-primary);
          color: white;
        }

        .wc-settings-panel {
          padding: 16px;
          border-bottom: 1px solid var(--wc-border);
          background: var(--wc-bg);
          animation: wc-fade-in 0.2s ease-out;
        }

        .wc-settings-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--wc-text);
          margin-bottom: 12px;
        }

        .wc-setting-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 0;
        }

        .wc-setting-item + .wc-setting-item {
          border-top: 1px solid var(--wc-border);
        }

        .wc-setting-label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          color: var(--wc-text);
        }

        .wc-setting-label svg {
          width: 18px;
          height: 18px;
          color: var(--wc-text-secondary);
        }

        .wc-toggle {
          position: relative;
          width: 44px;
          height: 24px;
          background: var(--wc-border);
          border-radius: 12px;
          border: none;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .wc-toggle.on {
          background: var(--wc-primary);
        }

        .wc-toggle::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: transform 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .wc-toggle.on::after {
          transform: translateX(20px);
        }

        .wc-setting-note {
          font-size: 12px;
          color: var(--wc-text-secondary);
          margin-top: 4px;
          padding-right: 28px;
        }

        .wc-enable-btn {
          padding: 6px 12px;
          background: var(--wc-primary);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .wc-enable-btn:hover {
          opacity: 0.9;
        }

        /* ========================================
           Responsive
           ======================================== */
        @media (max-width: 480px) {
          .wc-window {
            width: calc(100vw - 32px);
            height: calc(100vh - 140px);
            bottom: 80px;
            right: 16px !important;
            left: 16px !important;
          }
        }
      `}</style>

      {/* Chat Button */}
      <button
        className={`wc-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
        {/* Unread badge */}
        {!isOpen && unreadCount > 0 && (
          <span className="wc-button-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="wc-window">
          {/* Header */}
          <div className="wc-header">
            <div className="wc-header-content">
              <div className="wc-header-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="wc-header-info">
                <h3>WhizChat</h3>
                <div className="wc-header-status">
                  <span className={`wc-status-dot ${!isOnline ? 'offline' : ''}`} />
                  {isOnline ? "Online" : "Offline"}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {/* Settings button */}
              <button
                className={`wc-settings-btn ${showSettings ? 'active' : ''}`}
                onClick={() => setShowSettings(!showSettings)}
                aria-label="Settings"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
              <button className="wc-close" onClick={() => setIsOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="wc-settings-panel">
              <div className="wc-settings-title">Notification Settings</div>

              {/* Sound toggle */}
              <div className="wc-setting-item">
                <div className="wc-setting-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                  Sounds
                </div>
                <button
                  className={`wc-toggle ${soundEnabled ? 'on' : ''}`}
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  aria-label={soundEnabled ? "Disable sounds" : "Enable sounds"}
                />
              </div>

              {/* Push notifications */}
              <div className="wc-setting-item">
                <div>
                  <div className="wc-setting-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    Notifications
                  </div>
                  {pushPermission === "denied" && (
                    <div className="wc-setting-note">Notifications are blocked in browser</div>
                  )}
                </div>
                {pushPermission === "granted" ? (
                  <button
                    className={`wc-toggle ${pushEnabled ? 'on' : ''}`}
                    onClick={() => setPushEnabled(!pushEnabled)}
                    aria-label={pushEnabled ? "Disable notifications" : "Enable notifications"}
                  />
                ) : pushPermission !== "denied" ? (
                  <button
                    className="wc-enable-btn"
                    onClick={requestPushPermission}
                  >
                    Enable
                  </button>
                ) : null}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="wc-messages">
            {isLoading ? (
              <div className="wc-loading">
                <div className="wc-spinner" />
              </div>
            ) : (
              <>
                {/* Welcome message */}
                {welcomeMessage && messages.length === 0 && (
                  <div className="wc-message bot">
                    <div className="wc-message-bubble">{welcomeMessage}</div>
                  </div>
                )}

                {/* Messages */}
                {messages.map((msg) => (
                  <div key={msg.id} className={`wc-message ${msg.senderType}`}>
                    <div className="wc-message-bubble">
                      {/* Image message */}
                      {msg.messageType === 'image' && msg.fileUrl ? (
                        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="wc-image-message">
                          <img src={msg.fileUrl} alt={msg.fileName || 'Image'} />
                        </a>
                      ) : msg.messageType && msg.messageType !== 'text' && msg.fileUrl ? (
                        /* File message */
                        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" download={msg.fileName} className="wc-file-message">
                          <div className="wc-file-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          </div>
                          <div className="wc-file-info">
                            <div className="wc-file-name">{msg.fileName}</div>
                            <div className="wc-file-size">{msg.fileSize ? formatFileSize(msg.fileSize) : ''}</div>
                          </div>
                          <div className="wc-file-download">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                          </div>
                        </a>
                      ) : (
                        /* Text message */
                        msg.content
                      )}
                    </div>
                    {msg.senderType !== 'system' && (
                      <div className="wc-message-meta">
                        <span className="wc-message-time">{formatTime(msg.createdAt)}</span>
                        {msg.senderType === 'customer' && (
                          <span className="wc-message-status">
                            <MessageStatusIcon status={msg.status} />
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing indicator - show when agent is typing */}
                {(isTyping || agentIsTyping) && (
                  <div className="wc-typing">
                    <span className="wc-typing-dot" />
                    <span className="wc-typing-dot" />
                    <span className="wc-typing-dot" />
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* FAQ */}
          {faqItems.length > 0 && messages.length === 0 && !isLoading && (
            <div className="wc-faq">
              <div className="wc-faq-title">Frequently Asked Questions:</div>
              <div className="wc-faq-list">
                {faqItems.slice(0, 4).map((item) => (
                  <button
                    key={item.id}
                    className="wc-faq-item"
                    onClick={() => handleFAQClick(item)}
                  >
                    {item.question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Contact Form */}
          {showContactForm && (
            <div className="wc-contact">
              <div className="wc-contact-title">How would you prefer to be contacted?</div>
              <div className="wc-contact-buttons">
                <button
                  className={`wc-contact-btn ${contactType === 'email' ? 'selected' : ''}`}
                  onClick={() => setContactType('email')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  Email
                </button>
                <button
                  className={`wc-contact-btn ${contactType === 'whatsapp' ? 'selected' : ''}`}
                  onClick={() => setContactType('whatsapp')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  WhatsApp
                </button>
              </div>
              {contactType && (
                <>
                  <input
                    type="text"
                    className="wc-contact-input"
                    placeholder="Full Name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                  <input
                    type={contactType === 'email' ? 'email' : 'tel'}
                    className="wc-contact-input"
                    placeholder={contactType === 'email' ? 'Email Address' : 'Phone Number'}
                    value={contactValue}
                    onChange={(e) => setContactValue(e.target.value)}
                  />
                  <button className="wc-contact-submit" onClick={submitContact}>
                    Submit
                  </button>
                </>
              )}
            </div>
          )}

          {/* Input Area */}
          <div className="wc-input-area">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json,.zip,.rar"
              onChange={handleFileSelect}
            />
            <button
              className="wc-attach-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              title="Attach file"
            >
              {isUploading ? (
                <div className="wc-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              )}
            </button>
            <div className="wc-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                className="wc-input"
                placeholder="Enter your message..."
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    sendMessage(inputValue);
                  }
                }}
                disabled={isSending}
              />
            </div>
            <button
              className="wc-send"
              onClick={() => sendMessage(inputValue)}
              disabled={!inputValue.trim() || isSending}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatWidget;
