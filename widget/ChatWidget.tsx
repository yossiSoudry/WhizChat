"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Message, FAQItem, WidgetConfig, InitResponse } from "./types";

interface ChatWidgetProps {
  config?: WidgetConfig;
  apiUrl?: string;
}

// Generate unique ID for deduplication
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Format time for display
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    position = "right",
    primaryColor = "#A31CAF",
    secondaryColor = "#39C3EF",
    wpUserId,
    wpUserEmail,
    wpUserName,
  } = config;

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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
        }),
      });

      if (res.ok) {
        const data: InitResponse = await res.json();
        setConversationId(data.conversation.id);
        setMessages(data.messages || []);
        setIsOnline(data.settings.isOnline);
        setWelcomeMessage(data.settings.welcomeMessage);
        setFaqItems(data.settings.faqItems || []);
      }
    } catch (error) {
      console.error("Failed to init chat:", error);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, wpUserId, wpUserEmail, wpUserName]);

  // Initialize on first open
  useEffect(() => {
    if (isOpen && !conversationId) {
      initChat();
    }
  }, [isOpen, conversationId, initChat]);

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
    };

    // Optimistic update
    setMessages((prev) => [...prev, tempMessage]);
    setInputValue("");
    setIsSending(true);

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
        // Replace temp message with real one
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
    // Add question as customer message
    await sendMessage(item.question);

    // Add answer as bot message after a short delay
    setTimeout(() => {
      const botMessage: Message = {
        id: generateId(),
        content: item.answer,
        senderType: "bot",
        senderName: "WhizBot",
        source: "widget",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 500);
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

      // Add system message
      const systemMessage: Message = {
        id: generateId(),
        content: contactType === "whatsapp"
          ? "תודה! נמשיך את השיחה בוואטסאפ."
          : "תודה! נחזור אליך בהקדם.",
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

  // CSS custom properties for theming
  const cssVars = {
    "--widget-primary": primaryColor,
    "--widget-secondary": secondaryColor,
  } as React.CSSProperties;

  return (
    <div style={cssVars} className="whizchat-widget">
      {/* Styles */}
      <style>{`
        .whizchat-widget {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          position: fixed;
          bottom: 20px;
          ${position}: 20px;
          z-index: 999999;
          direction: rtl;
        }

        .whizchat-button {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--widget-primary), var(--widget-secondary));
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .whizchat-button:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
        }

        .whizchat-button svg {
          width: 28px;
          height: 28px;
          fill: white;
        }

        .whizchat-window {
          position: absolute;
          bottom: 70px;
          ${position}: 0;
          width: 380px;
          height: 500px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .whizchat-header {
          background: linear-gradient(135deg, var(--widget-primary), var(--widget-secondary));
          color: white;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .whizchat-header-title {
          font-weight: 600;
          font-size: 16px;
        }

        .whizchat-header-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          opacity: 0.9;
        }

        .whizchat-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #4ade80;
        }

        .whizchat-status-dot.offline {
          background: #f87171;
        }

        .whizchat-close {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 4px;
        }

        .whizchat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .whizchat-message {
          max-width: 80%;
          padding: 10px 14px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.4;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .whizchat-message.customer {
          background: linear-gradient(135deg, var(--widget-primary), var(--widget-secondary));
          color: white;
          align-self: flex-start;
          border-bottom-right-radius: 4px;
        }

        .whizchat-message.agent,
        .whizchat-message.bot {
          background: #f3f4f6;
          color: #1f2937;
          align-self: flex-end;
          border-bottom-left-radius: 4px;
        }

        .whizchat-message.system {
          background: #fef3c7;
          color: #92400e;
          align-self: center;
          text-align: center;
          font-size: 13px;
          max-width: 90%;
        }

        .whizchat-message-time {
          font-size: 11px;
          opacity: 0.7;
          margin-top: 4px;
        }

        .whizchat-faq {
          padding: 12px 16px;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .whizchat-faq-title {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 8px;
        }

        .whizchat-faq-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .whizchat-faq-item {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          padding: 6px 12px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .whizchat-faq-item:hover {
          background: var(--widget-primary);
          color: white;
          border-color: var(--widget-primary);
        }

        .whizchat-input-area {
          padding: 12px 16px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          gap: 8px;
        }

        .whizchat-input {
          flex: 1;
          border: 1px solid #e5e7eb;
          border-radius: 24px;
          padding: 10px 16px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }

        .whizchat-input:focus {
          border-color: var(--widget-primary);
        }

        .whizchat-send {
          background: linear-gradient(135deg, var(--widget-primary), var(--widget-secondary));
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        }

        .whizchat-send:hover:not(:disabled) {
          transform: scale(1.05);
        }

        .whizchat-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .whizchat-send svg {
          width: 18px;
          height: 18px;
          fill: white;
        }

        .whizchat-contact-form {
          padding: 16px;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .whizchat-contact-buttons {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .whizchat-contact-btn {
          flex: 1;
          padding: 10px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .whizchat-contact-btn.selected {
          background: var(--widget-primary);
          color: white;
          border-color: var(--widget-primary);
        }

        .whizchat-contact-input {
          width: 100%;
          margin-top: 8px;
          padding: 10px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
        }

        .whizchat-contact-submit {
          width: 100%;
          margin-top: 8px;
          padding: 10px;
          background: var(--widget-primary);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }

        .whizchat-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }

        .whizchat-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e5e7eb;
          border-top-color: var(--widget-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 480px) {
          .whizchat-window {
            width: calc(100vw - 40px);
            height: calc(100vh - 120px);
            bottom: 80px;
          }
        }
      `}</style>

      {/* Chat Button */}
      <button
        className="whizchat-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "סגור צ'אט" : "פתח צ'אט"}
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
          </svg>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="whizchat-window">
          {/* Header */}
          <div className="whizchat-header">
            <div>
              <div className="whizchat-header-title">WhizChat</div>
              <div className="whizchat-header-status">
                <span
                  className={`whizchat-status-dot ${!isOnline ? "offline" : ""}`}
                />
                {isOnline ? "מחובר" : "לא מחובר"}
              </div>
            </div>
            <button className="whizchat-close" onClick={() => setIsOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="whizchat-messages">
            {isLoading ? (
              <div className="whizchat-loading">
                <div className="whizchat-spinner" />
              </div>
            ) : (
              <>
                {/* Welcome message */}
                {welcomeMessage && messages.length === 0 && (
                  <div className="whizchat-message bot">
                    {welcomeMessage}
                  </div>
                )}

                {/* Messages */}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`whizchat-message ${msg.senderType}`}
                  >
                    <div>{msg.content}</div>
                    <div className="whizchat-message-time">
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* FAQ */}
          {faqItems.length > 0 && messages.length === 0 && (
            <div className="whizchat-faq">
              <div className="whizchat-faq-title">שאלות נפוצות:</div>
              <div className="whizchat-faq-list">
                {faqItems.slice(0, 4).map((item) => (
                  <button
                    key={item.id}
                    className="whizchat-faq-item"
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
            <div className="whizchat-contact-form">
              <div className="whizchat-contact-buttons">
                <button
                  className={`whizchat-contact-btn ${contactType === "email" ? "selected" : ""}`}
                  onClick={() => setContactType("email")}
                >
                  📧 אימייל
                </button>
                <button
                  className={`whizchat-contact-btn ${contactType === "whatsapp" ? "selected" : ""}`}
                  onClick={() => setContactType("whatsapp")}
                >
                  💬 וואטסאפ
                </button>
              </div>
              {contactType && (
                <>
                  <input
                    type="text"
                    className="whizchat-contact-input"
                    placeholder="שם"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                  <input
                    type={contactType === "email" ? "email" : "tel"}
                    className="whizchat-contact-input"
                    placeholder={contactType === "email" ? "כתובת אימייל" : "מספר טלפון"}
                    value={contactValue}
                    onChange={(e) => setContactValue(e.target.value)}
                  />
                  <button
                    className="whizchat-contact-submit"
                    onClick={submitContact}
                  >
                    שלח
                  </button>
                </>
              )}
            </div>
          )}

          {/* Input Area */}
          <div className="whizchat-input-area">
            <input
              type="text"
              className="whizchat-input"
              placeholder="הקלד הודעה..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  sendMessage(inputValue);
                }
              }}
              disabled={isSending}
            />
            <button
              className="whizchat-send"
              onClick={() => sendMessage(inputValue)}
              disabled={!inputValue.trim() || isSending}
            >
              <svg viewBox="0 0 24 24">
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
