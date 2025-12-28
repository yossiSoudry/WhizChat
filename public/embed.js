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

  // Generate unique ID
  function generateId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  // Format time
  function formatTime(dateString) {
    var date = new Date(dateString);
    return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  }

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
      });
    }

    // Messages
    messages.forEach(function(msg) {
      container.innerHTML += createMessageHTML(msg);
    });

    // Typing indicator
    if (agentIsTyping) {
      container.innerHTML += '<div class="wc-typing"><span class="wc-typing-dot"></span><span class="wc-typing-dot"></span><span class="wc-typing-dot"></span></div>';
    }

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  // Create message HTML
  function createMessageHTML(msg) {
    return `
      <div class="wc-message ${msg.senderType}">
        <div class="wc-message-bubble">${escapeHtml(msg.content)}</div>
        <div class="wc-message-time">${formatTime(msg.createdAt)}</div>
      </div>
    `;
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
      createdAt: new Date().toISOString()
    };

    messages.push(tempMessage);
    input.value = '';
    renderMessages();
    document.getElementById('wc-faq').classList.add('wc-hidden');

    isSending = true;

    try {
      var res = await fetch(API_URL + '/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversationId,
          content: content,
          clientMessageId: clientMessageId,
          senderType: 'customer'
        })
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
