(function() {
  'use strict';

  // Configuration - will be set by the embed script
  var config = window.WhizChatConfig || {};
  var API_URL = config.apiUrl || '';
  var PRIMARY_COLOR = config.primaryColor || '#C026D3';
  var SECONDARY_COLOR = config.secondaryColor || '#A21CAF';
  var POSITION = config.position || 'right'; // 'right' or 'left' - visual position on screen
  var WP_USER_ID = config.wpUserId || null;
  var WP_USER_EMAIL = config.wpUserEmail || null;
  var WP_USER_NAME = config.wpUserName || null;

  // For LTR sites, we need to use actual CSS properties (not logical)
  // 'right' position means visually on the right side of the screen
  var CSS_POSITION = POSITION === 'right' ? 'right' : 'left';

  // Generate or get anonymous user ID
  function getAnonUserId() {
    var storageKey = 'whizchat_anon_id';
    var existingId = localStorage.getItem(storageKey);
    if (existingId) return existingId;

    // Generate UUID v4
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

    localStorage.setItem(storageKey, uuid);
    return uuid;
  }

  var ANON_USER_ID = getAnonUserId();

  // State
  var isOpen = false;
  var conversationId = null;
  var messages = [];
  var faqItems = [];
  var isOnline = true;
  var welcomeMessage = '';
  var isLoading = false;
  var isSending = false;
  var agentIsTyping = false;
  var pollInterval = null;
  var typingInterval = null;
  var presenceInterval = null;
  var lastWpUserId = WP_USER_ID; // Track current WP user ID to detect user changes

  // Generate unique ID
  function generateId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  // Format time
  function formatTime(dateString) {
    var date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  // Format date for separators (Today, Yesterday, or full date)
  function formatDateSeparator(dateString) {
    var date = new Date(dateString);
    var today = new Date();
    var yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset times for comparison
    var dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    var todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (dateOnly.getTime() === todayOnly.getTime()) {
      return 'Today';
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
  }

  // Check if two dates are the same day
  function isSameDay(date1, date2) {
    var d1 = new Date(date1);
    var d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  // Reply state
  var replyingTo = null;

  // Create widget container
  function createWidget() {
    var container = document.createElement('div');
    container.id = 'whizchat-widget';
    container.innerHTML = getWidgetHTML();
    document.body.appendChild(container);

    // Add styles
    var style = document.createElement('style');
    style.textContent = getWidgetStyles();
    document.head.appendChild(style);

    // Add event listeners
    setupEventListeners();
  }

  // Widget HTML
  function getWidgetHTML() {
    return `
      <button id="wc-toggle" class="wc-button" aria-label="Open chat">
        <svg class="wc-icon-chat" xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <svg class="wc-icon-close" xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <div id="wc-window" class="wc-window wc-hidden">
        <div class="wc-header">
          <div class="wc-header-content">
            <div class="wc-header-avatar">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <div class="wc-header-info">
              <h3>WhizChat</h3>
              <div class="wc-header-status">
                <span id="wc-status-dot" class="wc-status-dot"></span>
                <span id="wc-status-text">Connecting...</span>
              </div>
            </div>
          </div>
          <button id="wc-close" class="wc-close-btn" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div id="wc-messages" class="wc-messages">
          <div id="wc-loading" class="wc-loading">
            <div class="wc-spinner"></div>
          </div>
        </div>

        <div id="wc-faq" class="wc-faq wc-hidden">
          <div class="wc-faq-title">Frequently Asked Questions:</div>
          <div id="wc-faq-list" class="wc-faq-list"></div>
        </div>

        <div id="wc-reply-bar" class="wc-reply-bar wc-hidden">
          <div class="wc-reply-content">
            <div class="wc-reply-indicator"></div>
            <div class="wc-reply-info">
              <span id="wc-reply-sender" class="wc-reply-sender"></span>
              <span id="wc-reply-text" class="wc-reply-text"></span>
            </div>
          </div>
          <button id="wc-reply-close" class="wc-reply-close" aria-label="Cancel reply">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="wc-input-area">
          <input id="wc-input" type="text" class="wc-input" placeholder="Type a message..." disabled>
          <button id="wc-send" class="wc-send" disabled aria-label="Send">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  // Widget Styles
  function getWidgetStyles() {
    return `
      #whizchat-widget {
        all: initial !important;
        --wc-primary: ${PRIMARY_COLOR};
        --wc-primary-hover: ${SECONDARY_COLOR};
        --wc-bg: #FFFFFF;
        --wc-bg-secondary: #F8F9FA;
        --wc-text: #1a1a2e;
        --wc-text-secondary: #6B7280;
        --wc-border: #E8EAED;

        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        position: fixed !important;
        bottom: 24px !important;
        right: 24px !important;
        left: auto !important;
        z-index: 999999 !important;
        direction: ltr !important;
        line-height: 1.5 !important;
        font-size: 14px !important;
        color: #1a1a2e !important;
      }

      #whizchat-widget .wc-hidden,
      #whizchat-widget .wc-window.wc-hidden,
      #whizchat-widget .wc-faq.wc-hidden {
        display: none !important;
      }

      #whizchat-widget *:not(svg):not(svg *),
      #whizchat-widget *:not(svg):not(svg *)::before,
      #whizchat-widget *:not(svg):not(svg *)::after {
        all: unset;
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 0 !important;
        font-family: inherit !important;
        line-height: inherit !important;
        direction: inherit !important;
      }

      #whizchat-widget svg {
        display: block !important;
        flex-shrink: 0 !important;
      }

      #whizchat-widget svg path,
      #whizchat-widget svg line,
      #whizchat-widget svg circle,
      #whizchat-widget svg rect,
      #whizchat-widget svg polyline {
        stroke: inherit !important;
        stroke-width: 2 !important;
        stroke-linecap: round !important;
        stroke-linejoin: round !important;
      }

      #whizchat-widget .wc-button {
        display: flex !important;
        width: 60px !important;
        height: 60px !important;
        border-radius: 50% !important;
        background: linear-gradient(135deg, var(--wc-primary), var(--wc-primary-hover)) !important;
        border: none !important;
        cursor: pointer !important;
        align-items: center !important;
        justify-content: center !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
        transition: transform 0.3s, box-shadow 0.3s !important;
      }

      #whizchat-widget .wc-button:hover {
        transform: scale(1.05) !important;
        box-shadow: 0 6px 25px rgba(0,0,0,0.2) !important;
      }

      #whizchat-widget .wc-button svg {
        display: block !important;
        width: 26px !important;
        height: 26px !important;
        color: white !important;
        stroke: white !important;
        fill: none !important;
        transition: opacity 0.2s !important;
      }

      #whizchat-widget .wc-button .wc-icon-close { display: none !important; }
      #whizchat-widget .wc-button.open .wc-icon-chat { display: none !important; }
      #whizchat-widget .wc-button.open .wc-icon-close { display: block !important; }

      #whizchat-widget .wc-window {
        display: flex !important;
        position: absolute !important;
        bottom: 72px !important;
        right: 0 !important;
        left: auto !important;
        width: 380px !important;
        height: 540px !important;
        background: var(--wc-bg) !important;
        border-radius: 16px !important;
        box-shadow: 0 10px 40px rgba(0,0,0,0.15) !important;
        flex-direction: column !important;
        overflow: hidden !important;
        animation: wc-slide-up 0.3s ease-out !important;
        border: 1px solid var(--wc-border) !important;
      }

      @keyframes wc-slide-up {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      #whizchat-widget .wc-header {
        display: flex !important;
        padding: 16px 20px !important;
        align-items: center !important;
        justify-content: space-between !important;
        border-bottom: 1px solid var(--wc-border) !important;
        background: var(--wc-bg) !important;
        flex-shrink: 0 !important;
      }

      #whizchat-widget .wc-header-content {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
      }

      #whizchat-widget .wc-header-avatar {
        display: flex !important;
        width: 40px !important;
        height: 40px !important;
        border-radius: 12px !important;
        background: linear-gradient(135deg, var(--wc-primary), var(--wc-primary-hover)) !important;
        align-items: center !important;
        justify-content: center !important;
        flex-shrink: 0 !important;
      }

      #whizchat-widget .wc-header-avatar svg {
        display: block !important;
        width: 20px !important;
        height: 20px !important;
        color: white !important;
        stroke: white !important;
        fill: none !important;
      }

      #whizchat-widget .wc-header-info {
        display: block !important;
      }

      #whizchat-widget .wc-header-info h3 {
        display: block !important;
        font-size: 15px !important;
        font-weight: 600 !important;
        color: var(--wc-text) !important;
        margin: 0 !important;
      }

      #whizchat-widget .wc-header-status {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        font-size: 13px !important;
        color: var(--wc-text-secondary) !important;
        margin-top: 2px !important;
      }

      #whizchat-widget .wc-status-dot {
        display: block !important;
        width: 8px !important;
        height: 8px !important;
        border-radius: 50% !important;
        background: #9CA3AF !important;
        flex-shrink: 0 !important;
      }

      #whizchat-widget .wc-status-dot.online {
        background: #10B981 !important;
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2) !important;
      }

      #whizchat-widget .wc-close-btn {
        display: flex !important;
        width: 32px !important;
        height: 32px !important;
        border-radius: 8px !important;
        background: transparent !important;
        border: none !important;
        cursor: pointer !important;
        align-items: center !important;
        justify-content: center !important;
        color: var(--wc-text-secondary) !important;
        transition: background 0.2s !important;
        flex-shrink: 0 !important;
      }

      #whizchat-widget .wc-close-btn:hover {
        background: var(--wc-bg-secondary) !important;
      }

      #whizchat-widget .wc-close-btn svg {
        display: block !important;
        width: 18px !important;
        height: 18px !important;
        stroke: currentColor !important;
        fill: none !important;
      }

      #whizchat-widget .wc-messages {
        display: flex !important;
        flex: 1 !important;
        overflow-y: auto !important;
        padding: 20px !important;
        flex-direction: column !important;
        gap: 12px !important;
        background: var(--wc-bg-secondary) !important;
      }

      #whizchat-widget .wc-message {
        display: flex !important;
        flex-direction: column !important;
        max-width: 85% !important;
        animation: wc-fade-in 0.2s ease-out !important;
      }

      @keyframes wc-fade-in {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }

      #whizchat-widget .wc-message-bubble {
        display: block !important;
        padding: 12px 16px !important;
        border-radius: 16px !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
        word-break: break-word !important;
      }

      #whizchat-widget .wc-message.customer {
        align-self: flex-end !important;
      }

      #whizchat-widget .wc-message.customer .wc-message-bubble {
        background: var(--wc-bg) !important;
        color: var(--wc-text) !important;
        border: 1px solid var(--wc-border) !important;
        border-bottom-left-radius: 4px !important;
      }

      #whizchat-widget .wc-message.agent .wc-message-bubble,
      #whizchat-widget .wc-message.bot .wc-message-bubble {
        background: linear-gradient(135deg, var(--wc-primary), var(--wc-primary-hover)) !important;
        color: white !important;
        border-bottom-right-radius: 4px !important;
      }

      #whizchat-widget .wc-message.system .wc-message-bubble {
        background: rgba(99, 102, 241, 0.1) !important;
        color: #4338CA !important;
        text-align: center !important;
        align-self: center !important;
        font-size: 13px !important;
      }

      #whizchat-widget .wc-message-time {
        display: block !important;
        font-size: 11px !important;
        color: var(--wc-text-secondary) !important;
        margin-top: 4px !important;
        padding: 0 4px !important;
      }

      #whizchat-widget .wc-message.customer .wc-message-time {
        text-align: left !important;
      }

      /* Date separator */
      #whizchat-widget .wc-date-separator {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 8px 0 !important;
        margin: 8px 0 !important;
      }

      #whizchat-widget .wc-date-separator span {
        display: inline-block !important;
        background: var(--wc-bg) !important;
        color: var(--wc-text-secondary) !important;
        font-size: 11px !important;
        font-weight: 500 !important;
        padding: 4px 12px !important;
        border-radius: 12px !important;
        border: 1px solid var(--wc-border) !important;
      }

      /* Reply bar */
      #whizchat-widget .wc-reply-bar {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 8px 16px !important;
        background: var(--wc-bg-secondary) !important;
        border-top: 1px solid var(--wc-border) !important;
      }

      #whizchat-widget .wc-reply-content {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        flex: 1 !important;
        min-width: 0 !important;
      }

      #whizchat-widget .wc-reply-indicator {
        width: 3px !important;
        height: 32px !important;
        background: var(--wc-primary) !important;
        border-radius: 2px !important;
        flex-shrink: 0 !important;
      }

      #whizchat-widget .wc-reply-info {
        display: flex !important;
        flex-direction: column !important;
        min-width: 0 !important;
      }

      #whizchat-widget .wc-reply-sender {
        font-size: 12px !important;
        font-weight: 600 !important;
        color: var(--wc-primary) !important;
      }

      #whizchat-widget .wc-reply-text {
        font-size: 12px !important;
        color: var(--wc-text-secondary) !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }

      #whizchat-widget .wc-reply-close {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 24px !important;
        height: 24px !important;
        border: none !important;
        background: transparent !important;
        color: var(--wc-text-secondary) !important;
        cursor: pointer !important;
        border-radius: 4px !important;
        flex-shrink: 0 !important;
      }

      #whizchat-widget .wc-reply-close:hover {
        background: var(--wc-border) !important;
      }

      /* Reply button on messages */
      #whizchat-widget .wc-message-actions {
        display: none !important;
        position: absolute !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        gap: 4px !important;
      }

      #whizchat-widget .wc-message.customer .wc-message-actions {
        left: -32px !important;
      }

      #whizchat-widget .wc-message.agent .wc-message-actions,
      #whizchat-widget .wc-message.bot .wc-message-actions {
        right: -32px !important;
      }

      #whizchat-widget .wc-message-wrapper:hover .wc-message-actions {
        display: flex !important;
      }

      #whizchat-widget .wc-reply-btn {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 28px !important;
        height: 28px !important;
        border: none !important;
        background: var(--wc-bg) !important;
        border-radius: 50% !important;
        cursor: pointer !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
        color: var(--wc-text-secondary) !important;
      }

      #whizchat-widget .wc-reply-btn:hover {
        background: var(--wc-bg-secondary) !important;
        color: var(--wc-primary) !important;
      }

      /* Reply preview in message */
      #whizchat-widget .wc-message-reply {
        display: flex !important;
        align-items: stretch !important;
        gap: 8px !important;
        padding: 8px !important;
        margin-bottom: 4px !important;
        background: rgba(0,0,0,0.05) !important;
        border-radius: 8px !important;
        font-size: 12px !important;
        cursor: pointer !important;
      }

      #whizchat-widget .wc-message.customer .wc-message-reply {
        background: rgba(0,0,0,0.05) !important;
      }

      #whizchat-widget .wc-message.agent .wc-message-reply,
      #whizchat-widget .wc-message.bot .wc-message-reply {
        background: rgba(255,255,255,0.15) !important;
      }

      #whizchat-widget .wc-message-reply-bar {
        width: 3px !important;
        background: var(--wc-primary) !important;
        border-radius: 2px !important;
        flex-shrink: 0 !important;
      }

      #whizchat-widget .wc-message.agent .wc-message-reply-bar,
      #whizchat-widget .wc-message.bot .wc-message-reply-bar {
        background: rgba(255,255,255,0.5) !important;
      }

      #whizchat-widget .wc-message-reply-content {
        display: flex !important;
        flex-direction: column !important;
        min-width: 0 !important;
      }

      #whizchat-widget .wc-message-reply-sender {
        font-weight: 600 !important;
        color: var(--wc-primary) !important;
        margin-bottom: 2px !important;
      }

      #whizchat-widget .wc-message.agent .wc-message-reply-sender,
      #whizchat-widget .wc-message.bot .wc-message-reply-sender {
        color: rgba(255,255,255,0.9) !important;
      }

      #whizchat-widget .wc-message-reply-text {
        color: var(--wc-text-secondary) !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }

      #whizchat-widget .wc-message.agent .wc-message-reply-text,
      #whizchat-widget .wc-message.bot .wc-message-reply-text {
        color: rgba(255,255,255,0.7) !important;
      }

      /* Message wrapper for reply button positioning */
      #whizchat-widget .wc-message-wrapper {
        display: flex !important;
        position: relative !important;
        max-width: 85% !important;
      }

      #whizchat-widget .wc-message-wrapper.customer {
        align-self: flex-end !important;
        flex-direction: row-reverse !important;
      }

      #whizchat-widget .wc-message-wrapper .wc-reply-btn {
        opacity: 0 !important;
        transition: opacity 0.2s !important;
        align-self: center !important;
        margin: 0 4px !important;
      }

      #whizchat-widget .wc-message-wrapper:hover .wc-reply-btn {
        opacity: 1 !important;
      }

      /* Message highlight animation when clicking on reply */
      #whizchat-widget .wc-message-highlight {
        animation: wc-highlight 1.5s ease-out !important;
      }

      @keyframes wc-highlight {
        0%, 50% { background: rgba(192, 38, 211, 0.2) !important; }
        100% { background: transparent !important; }
      }

      #whizchat-widget .wc-typing {
        display: flex !important;
        align-items: center !important;
        gap: 4px !important;
        padding: 12px 16px !important;
        background: var(--wc-bg) !important;
        border-radius: 16px !important;
        border-bottom-right-radius: 4px !important;
        align-self: flex-start !important;
        border: 1px solid var(--wc-border) !important;
      }

      #whizchat-widget .wc-typing-dot {
        display: block !important;
        width: 6px !important;
        height: 6px !important;
        border-radius: 50% !important;
        background: var(--wc-text-secondary) !important;
        animation: wc-typing 1.4s infinite ease-in-out !important;
      }

      #whizchat-widget .wc-typing-dot:nth-child(2) { animation-delay: 0.2s !important; }
      #whizchat-widget .wc-typing-dot:nth-child(3) { animation-delay: 0.4s !important; }

      @keyframes wc-typing {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-4px); opacity: 1; }
      }

      #whizchat-widget .wc-loading {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex: 1 !important;
      }

      #whizchat-widget .wc-spinner {
        display: block !important;
        width: 32px !important;
        height: 32px !important;
        border: 3px solid var(--wc-border) !important;
        border-top-color: var(--wc-primary) !important;
        border-radius: 50% !important;
        animation: wc-spin 0.8s linear infinite !important;
      }

      @keyframes wc-spin {
        to { transform: rotate(360deg); }
      }

      #whizchat-widget .wc-faq {
        display: block !important;
        padding: 12px 16px !important;
        border-top: 1px solid var(--wc-border) !important;
        background: var(--wc-bg) !important;
        flex-shrink: 0 !important;
      }

      #whizchat-widget .wc-faq-title {
        display: block !important;
        font-size: 12px !important;
        color: var(--wc-text-secondary) !important;
        margin-bottom: 10px !important;
        font-weight: 500 !important;
      }

      #whizchat-widget .wc-faq-list {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 8px !important;
      }

      #whizchat-widget .wc-faq-item {
        display: inline-block !important;
        background: var(--wc-bg) !important;
        border: 1px solid var(--wc-border) !important;
        border-radius: 20px !important;
        padding: 8px 14px !important;
        font-size: 13px !important;
        color: var(--wc-text) !important;
        cursor: pointer !important;
        transition: all 0.2s !important;
      }

      #whizchat-widget .wc-faq-item:hover {
        border-color: var(--wc-primary) !important;
        color: var(--wc-primary) !important;
      }

      #whizchat-widget .wc-input-area {
        display: flex !important;
        padding: 16px !important;
        border-top: 1px solid var(--wc-border) !important;
        background: var(--wc-bg) !important;
        align-items: center !important;
        gap: 10px !important;
        flex-shrink: 0 !important;
      }

      #whizchat-widget .wc-input {
        display: block !important;
        flex: 1 !important;
        padding: 12px 16px !important;
        border: 1px solid var(--wc-border) !important;
        border-radius: 24px !important;
        font-size: 14px !important;
        outline: none !important;
        background: var(--wc-bg-secondary) !important;
        color: var(--wc-text) !important;
        transition: border-color 0.2s, box-shadow 0.2s !important;
        min-width: 0 !important;
        -webkit-appearance: none !important;
        appearance: none !important;
      }

      #whizchat-widget .wc-input::placeholder {
        color: var(--wc-text-secondary) !important;
        opacity: 1 !important;
      }

      #whizchat-widget .wc-input:focus {
        border-color: var(--wc-primary) !important;
        box-shadow: 0 0 0 3px rgba(192, 38, 211, 0.1) !important;
        background: var(--wc-bg) !important;
      }

      #whizchat-widget .wc-input:disabled {
        opacity: 0.6 !important;
        cursor: not-allowed !important;
      }

      #whizchat-widget .wc-send {
        display: flex !important;
        width: 44px !important;
        height: 44px !important;
        border-radius: 50% !important;
        background: linear-gradient(135deg, var(--wc-primary), var(--wc-primary-hover)) !important;
        border: none !important;
        cursor: pointer !important;
        align-items: center !important;
        justify-content: center !important;
        color: white !important;
        transition: transform 0.2s, opacity 0.2s !important;
        flex-shrink: 0 !important;
      }

      #whizchat-widget .wc-send:hover:not(:disabled) {
        transform: scale(1.05) !important;
      }

      #whizchat-widget .wc-send:disabled {
        opacity: 0.4 !important;
        cursor: not-allowed !important;
      }

      #whizchat-widget .wc-send svg {
        display: block !important;
        width: 18px !important;
        height: 18px !important;
        fill: currentColor !important;
      }

      @media (max-width: 480px) {
        #whizchat-widget .wc-window {
          width: calc(100vw - 32px) !important;
          height: calc(100vh - 140px) !important;
          bottom: 80px !important;
          right: 16px !important;
          left: 16px !important;
        }
      }
    `;
  }

  // Setup event listeners
  function setupEventListeners() {
    document.getElementById('wc-toggle').addEventListener('click', toggleWidget);
    document.getElementById('wc-close').addEventListener('click', closeWidget);
    document.getElementById('wc-send').addEventListener('click', handleSend);
    document.getElementById('wc-input').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') handleSend();
    });
    document.getElementById('wc-input').addEventListener('input', handleTyping);
    document.getElementById('wc-reply-close').addEventListener('click', cancelReply);
  }

  // Toggle widget
  function toggleWidget() {
    isOpen = !isOpen;
    var toggle = document.getElementById('wc-toggle');
    var chatWindow = document.getElementById('wc-window');

    toggle.classList.toggle('open', isOpen);
    if (isOpen) {
      chatWindow.classList.remove('wc-hidden');
    } else {
      chatWindow.classList.add('wc-hidden');
    }

    // Check if WP user has changed (e.g., different user logged in)
    // Re-read config in case it was updated after page load
    var currentConfig = window.WhizChatConfig || {};
    var currentWpUserId = currentConfig.wpUserId || null;

    // If wpUserId changed, reset and reinitialize
    if (currentWpUserId !== lastWpUserId) {
      conversationId = null;
      messages = [];
      lastWpUserId = currentWpUserId;
      WP_USER_ID = currentWpUserId;
      WP_USER_EMAIL = currentConfig.wpUserEmail || null;
      WP_USER_NAME = currentConfig.wpUserName || null;
    }

    if (isOpen && !conversationId) {
      initChat();
    }

    if (isOpen) {
      startPolling();
      document.getElementById('wc-input').focus();
    } else {
      stopPolling();
    }
  }

  // Close widget
  function closeWidget() {
    isOpen = false;
    document.getElementById('wc-toggle').classList.remove('open');
    document.getElementById('wc-window').classList.add('wc-hidden');
    stopPolling();
  }

  // Initialize chat
  async function initChat() {
    isLoading = true;
    updateLoadingState();

    try {
      // Build request body - only include non-null values
      var requestBody = {};
      if (WP_USER_ID) {
        requestBody.wpUserId = WP_USER_ID;
        if (WP_USER_EMAIL) requestBody.wpUserEmail = WP_USER_EMAIL;
        if (WP_USER_NAME) requestBody.wpUserName = WP_USER_NAME;
      } else {
        requestBody.anonUserId = ANON_USER_ID;
      }

      // Debug log
      console.log('[WhizChat] Init with:', { WP_USER_ID: WP_USER_ID, requestBody: requestBody });

      var res = await fetch(API_URL + '/api/chat/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (res.ok) {
        var data = await res.json();
        conversationId = data.conversation.id;
        messages = data.messages || [];
        isOnline = data.settings.isOnline;
        welcomeMessage = data.settings.welcomeMessage;
        faqItems = data.settings.faqItems || [];

        updateStatus();
        renderMessages();
        renderFAQ();
        enableInput();

        // Mark as read
        await fetch(API_URL + '/api/chat/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: conversationId, readerType: 'customer' })
        });
      } else {
        var errorData = await res.json().catch(function() { return {}; });
        console.error('WhizChat init failed:', res.status, errorData);
        updateStatusError('שגיאה בהתחברות');
      }
    } catch (error) {
      console.error('WhizChat init error:', error);
      updateStatusError('שגיאה בהתחברות');
    } finally {
      isLoading = false;
      updateLoadingState();
    }
  }

  // Update loading state
  function updateLoadingState() {
    var loading = document.getElementById('wc-loading');
    if (loading) {
      loading.style.display = isLoading ? 'flex' : 'none';
    }
  }

  // Update status
  function updateStatus() {
    var dot = document.getElementById('wc-status-dot');
    var text = document.getElementById('wc-status-text');

    dot.className = 'wc-status-dot' + (isOnline ? ' online' : '');
    text.textContent = isOnline ? 'Online' : 'Offline';
  }

  // Update status with error
  function updateStatusError(errorMessage) {
    var dot = document.getElementById('wc-status-dot');
    var text = document.getElementById('wc-status-text');

    dot.className = 'wc-status-dot';
    dot.style.background = '#EF4444';
    text.textContent = 'Connection error';
  }

  // Render messages
  function renderMessages() {
    var container = document.getElementById('wc-messages');
    container.innerHTML = '';

    // Welcome message
    if (welcomeMessage && messages.length === 0) {
      container.innerHTML += createMessageHTML({
        senderType: 'bot',
        content: welcomeMessage,
        createdAt: new Date().toISOString()
      }, null);
    }

    // Messages with date separators
    var lastDate = null;
    messages.forEach(function(msg, index) {
      // Check if we need a date separator
      if (!lastDate || !isSameDay(lastDate, msg.createdAt)) {
        container.innerHTML += '<div class="wc-date-separator"><span>' + formatDateSeparator(msg.createdAt) + '</span></div>';
        lastDate = msg.createdAt;
      }
      container.innerHTML += createMessageHTML(msg, index);
    });

    // Typing indicator
    if (agentIsTyping) {
      container.innerHTML += '<div class="wc-typing"><span class="wc-typing-dot"></span><span class="wc-typing-dot"></span><span class="wc-typing-dot"></span></div>';
    }

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;

    // Add reply button event listeners
    container.querySelectorAll('.wc-reply-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var msgIndex = parseInt(btn.dataset.msgIndex, 10);
        var msg = messages[msgIndex];
        if (msg) {
          setReplyTo(msg);
        }
      });
    });

    // Add click on reply preview to scroll to original message
    container.querySelectorAll('.wc-message-reply').forEach(function(replyEl) {
      replyEl.addEventListener('click', function() {
        var replyToId = replyEl.dataset.replyToId;
        var targetMsg = container.querySelector('[data-msg-id="' + replyToId + '"]');
        if (targetMsg) {
          targetMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetMsg.classList.add('wc-message-highlight');
          setTimeout(function() {
            targetMsg.classList.remove('wc-message-highlight');
          }, 1500);
        }
      });
    });
  }

  // Set reply to a message
  function setReplyTo(msg) {
    replyingTo = msg;
    var replyBar = document.getElementById('wc-reply-bar');
    var replySender = document.getElementById('wc-reply-sender');
    var replyText = document.getElementById('wc-reply-text');

    replySender.textContent = msg.senderType === 'customer' ? 'You' : (msg.senderName || 'Agent');
    replyText.textContent = msg.content.length > 50 ? msg.content.substring(0, 50) + '...' : msg.content;
    replyBar.classList.remove('wc-hidden');

    // Focus input
    document.getElementById('wc-input').focus();
  }

  // Cancel reply
  function cancelReply() {
    replyingTo = null;
    document.getElementById('wc-reply-bar').classList.add('wc-hidden');
  }

  // Create message HTML
  function createMessageHTML(msg, index) {
    var replyPreviewHtml = '';
    if (msg.replyToId && msg.replyToContent) {
      replyPreviewHtml = '<div class="wc-message-reply" data-reply-to-id="' + escapeHtml(msg.replyToId) + '">' +
        '<div class="wc-message-reply-bar"></div>' +
        '<div class="wc-message-reply-content">' +
          '<span class="wc-message-reply-sender">' + escapeHtml(msg.replyToSender || 'Message') + '</span>' +
          '<span class="wc-message-reply-text">' + escapeHtml(msg.replyToContent.length > 50 ? msg.replyToContent.substring(0, 50) + '...' : msg.replyToContent) + '</span>' +
        '</div>' +
      '</div>';
    }

    var replyBtnHtml = index !== null ? '<button class="wc-reply-btn" data-msg-index="' + index + '" aria-label="Reply"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 17H4V12L12 4L20 12V17H15"/><path d="M9 17V21L15 17"/></svg></button>' : '';

    return '<div class="wc-message-wrapper ' + msg.senderType + '">' +
      '<div class="wc-message ' + msg.senderType + '" data-msg-id="' + (msg.id || '') + '">' +
        replyPreviewHtml +
        '<div class="wc-message-bubble">' + escapeHtml(msg.content) + '</div>' +
        '<div class="wc-message-time">' + formatTime(msg.createdAt) + '</div>' +
      '</div>' +
      replyBtnHtml +
    '</div>';
  }

  // Escape HTML
  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Render FAQ
  function renderFAQ() {
    var faqContainer = document.getElementById('wc-faq');
    var faqList = document.getElementById('wc-faq-list');

    if (faqItems.length > 0 && messages.length === 0) {
      faqContainer.classList.remove('wc-hidden');
      faqList.innerHTML = faqItems.slice(0, 4).map(function(item) {
        return '<button class="wc-faq-item" data-question="' + escapeHtml(item.question) + '" data-answer="' + escapeHtml(item.answer) + '">' + escapeHtml(item.question) + '</button>';
      }).join('');

      // Add click listeners
      faqList.querySelectorAll('.wc-faq-item').forEach(function(btn) {
        btn.addEventListener('click', function() {
          handleFAQClick(btn.dataset.question, btn.dataset.answer);
        });
      });
    } else {
      faqContainer.classList.add('wc-hidden');
    }
  }

  // Handle FAQ click
  async function handleFAQClick(question, answer) {
    await sendMessage(question);

    // Simulate bot response
    setTimeout(function() {
      messages.push({
        id: generateId(),
        content: answer,
        senderType: 'bot',
        createdAt: new Date().toISOString()
      });
      renderMessages();
      document.getElementById('wc-faq').classList.add('wc-hidden');
    }, 1000);
  }

  // Enable input
  function enableInput() {
    document.getElementById('wc-input').disabled = false;
    document.getElementById('wc-send').disabled = false;
  }

  // Handle send
  async function handleSend() {
    var input = document.getElementById('wc-input');
    var content = input.value.trim();

    if (!content || !conversationId || isSending) return;

    var clientMessageId = generateId();
    var tempMessage = {
      id: clientMessageId,
      content: content,
      senderType: 'customer',
      createdAt: new Date().toISOString(),
      replyToId: replyingTo ? replyingTo.id : null,
      replyToContent: replyingTo ? replyingTo.content : null,
      replyToSender: replyingTo ? (replyingTo.senderType === 'customer' ? 'You' : (replyingTo.senderName || 'Agent')) : null
    };

    // Save reply info before clearing
    var replyData = replyingTo ? {
      replyToId: replyingTo.id,
      replyToContent: replyingTo.content,
      replyToSender: replyingTo.senderType === 'customer' ? 'You' : (replyingTo.senderName || 'Agent')
    } : null;

    messages.push(tempMessage);
    input.value = '';
    cancelReply(); // Clear reply state
    renderMessages();
    document.getElementById('wc-faq').classList.add('wc-hidden');

    isSending = true;

    try {
      var requestBody = {
        conversationId: conversationId,
        content: content,
        clientMessageId: clientMessageId,
        senderType: 'customer'
      };

      // Add reply data if replying
      if (replyData) {
        requestBody.replyToId = replyData.replyToId;
        requestBody.replyToContent = replyData.replyToContent;
        requestBody.replyToSender = replyData.replyToSender;
      }

      var res = await fetch(API_URL + '/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (res.ok) {
        var data = await res.json();
        // Update temp message with real one
        var index = messages.findIndex(function(m) { return m.id === clientMessageId; });
        if (index !== -1) {
          messages[index] = data.message;
        }
      }
    } catch (error) {
      console.error('WhizChat send error:', error);
    } finally {
      isSending = false;
    }
  }

  // Handle typing
  var typingTimeout = null;
  function handleTyping() {
    if (!conversationId) return;

    if (typingTimeout) clearTimeout(typingTimeout);

    sendTypingStatus(true);

    typingTimeout = setTimeout(function() {
      sendTypingStatus(false);
    }, 2000);
  }

  // Send typing status
  async function sendTypingStatus(typing) {
    try {
      await fetch(API_URL + '/api/chat/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversationId,
          isTyping: typing,
          userType: 'customer',
          userId: 'widget-user'
        })
      });
    } catch (error) {}
  }

  // Start polling
  function startPolling() {
    if (pollInterval) return;

    pollInterval = setInterval(fetchNewMessages, 3000);
    typingInterval = setInterval(checkAgentTyping, 2000);
    presenceInterval = setInterval(sendPresence, 30000);

    sendPresence();
  }

  // Stop polling
  function stopPolling() {
    if (pollInterval) clearInterval(pollInterval);
    if (typingInterval) clearInterval(typingInterval);
    if (presenceInterval) clearInterval(presenceInterval);
    pollInterval = null;
    typingInterval = null;
    presenceInterval = null;
  }

  // Fetch new messages
  async function fetchNewMessages() {
    if (!conversationId || !isOpen) return;

    try {
      var res = await fetch(API_URL + '/api/chat/messages?conversationId=' + conversationId + '&viewerType=customer');

      if (res.ok) {
        var data = await res.json();
        if (data.messages && data.messages.length > messages.length) {
          messages = data.messages;
          renderMessages();

          // Mark as read
          await fetch(API_URL + '/api/chat/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: conversationId, readerType: 'customer' })
          });
        }
      }
    } catch (error) {}
  }

  // Check agent typing
  async function checkAgentTyping() {
    if (!conversationId || !isOpen) return;

    try {
      var res = await fetch(API_URL + '/api/chat/typing?conversationId=' + conversationId + '&userType=customer');

      if (res.ok) {
        var data = await res.json();
        if (data.isTyping !== agentIsTyping) {
          agentIsTyping = data.isTyping;
          renderMessages();
        }
      }
    } catch (error) {}
  }

  // Send presence
  async function sendPresence() {
    if (!conversationId || !isOpen) return;

    try {
      await fetch(API_URL + '/api/chat/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: conversationId })
      });
    } catch (error) {}
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }
})();
