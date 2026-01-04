(function() {
  'use strict';

  // Configuration
  var WIDGET_VERSION = '1.3.1';
  var API_BASE_URL = window.WHIZCHAT_API_URL || '';
  var STORAGE_SOUND_KEY = 'whizchat-widget-sound';
  var STORAGE_PUSH_KEY = 'whizchat-widget-push';

  // State
  var state = {
    isOpen: false,
    conversationId: null,
    messages: [],
    faqItems: [],
    isOnline: true,
    welcomeMessage: '',
    isLoading: false,
    isSending: false,
    isUploading: false,
    soundEnabled: true,
    pushEnabled: false,
    pushPermission: 'default',
    showSettings: false,
    unreadCount: 0,
    lastMessageId: null,
  };

  // Config from window object (can be overridden by WordPress config)
  var config = window.WHIZCHAT_CONFIG || {};
  var wpUserId = config.wpUserId;
  var wpUserEmail = config.wpUserEmail;
  var wpUserName = config.wpUserName;
  var wpUserAvatar = config.wpUserAvatar;

  // Widget appearance - will be updated from API settings
  var widgetConfig = {
    position: config.position || 'right',
    primaryColor: config.primaryColor || '#C026D3',
    secondaryColor: config.secondaryColor || '#A21CAF'
  };

  // Load settings from localStorage
  try {
    var soundStored = localStorage.getItem(STORAGE_SOUND_KEY);
    if (soundStored !== null) state.soundEnabled = JSON.parse(soundStored);
    var pushStored = localStorage.getItem(STORAGE_PUSH_KEY);
    if (pushStored !== null) state.pushEnabled = JSON.parse(pushStored);
    if ('Notification' in window) {
      state.pushPermission = Notification.permission;
    }
  } catch (e) {}

  // Play notification sound using Web Audio API
  function playNotificationSound() {
    if (!state.soundEnabled) return;
    try {
      var AudioContext = window.AudioContext || window.webkitAudioContext;
      var audioContext = new AudioContext();
      var now = audioContext.currentTime;
      var frequencies = [880, 1318.5];

      frequencies.forEach(function(freq, index) {
        var oscillator = audioContext.createOscillator();
        var gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, now);
        var startTime = now + index * 0.12;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.5);
      });
    } catch (e) {
      console.error('Error playing notification sound:', e);
    }
  }

  // Show push notification
  function showPushNotification(title, body) {
    if (!state.pushEnabled || state.pushPermission !== 'granted') return;
    if (document.visibilityState === 'visible' && state.isOpen) return;
    try {
      new Notification(title, {
        body: body,
        icon: '/icons/icon-192x192.png',
        tag: 'whizchat-widget'
      });
    } catch (e) {
      console.error('Error showing notification:', e);
    }
  }

  // Request push notification permission
  function requestPushPermission() {
    if (!('Notification' in window)) return;
    Notification.requestPermission().then(function(result) {
      state.pushPermission = result;
      if (result === 'granted') {
        state.pushEnabled = true;
        try { localStorage.setItem(STORAGE_PUSH_KEY, 'true'); } catch (e) {}
      }
      renderSettings();
    });
  }

  // Generate unique ID
  function generateId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  // Format time
  function formatTime(dateString) {
    var date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  // Format file size
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // Update widget colors dynamically
  function updateWidgetColors() {
    var widget = document.querySelector('.whizchat-widget');
    if (widget) {
      widget.style.setProperty('--widget-primary', widgetConfig.primaryColor);
      widget.style.setProperty('--widget-secondary', widgetConfig.secondaryColor);
    }
  }

  // Create widget styles
  function createStyles() {
    var style = document.createElement('style');
    style.id = 'whizchat-styles';
    style.textContent = `
      .whizchat-widget {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        position: fixed;
        bottom: 20px;
        right: 20px;
        left: auto;
        z-index: 999999;
        direction: ltr;
        --widget-primary: ${widgetConfig.primaryColor};
        --widget-secondary: ${widgetConfig.secondaryColor};
      }

      .whizchat-widget.position-left {
        left: 20px;
        right: auto;
      }

      .whizchat-widget.position-right {
        right: 20px;
        left: auto;
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
        right: 0;
        width: 380px;
        height: 500px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        display: none;
        flex-direction: column;
        overflow: hidden;
        animation: whizchat-slideUp 0.3s ease-out;
      }

      .whizchat-window.open {
        display: flex;
      }

      .position-left .whizchat-window {
        right: auto;
        left: 0;
      }

      .position-right .whizchat-window {
        left: auto;
        right: 0;
      }

      @keyframes whizchat-slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
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
        animation: whizchat-fadeIn 0.2s ease-out;
      }

      @keyframes whizchat-fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .whizchat-message.customer {
        background: linear-gradient(135deg, var(--widget-primary), var(--widget-secondary));
        color: white;
        align-self: flex-end;
        border-bottom-right-radius: 4px;
      }

      .whizchat-message.agent,
      .whizchat-message.bot {
        background: #f3f4f6;
        color: #1f2937;
        align-self: flex-start;
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
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .whizchat-message.customer .whizchat-message-time {
        justify-content: flex-end;
      }

      .whizchat-message-status {
        display: inline-flex;
        align-items: center;
      }

      .whizchat-message-status svg {
        width: 14px;
        height: 14px;
      }

      .whizchat-message-status.sent svg {
        fill: rgba(255,255,255,0.6);
      }

      .whizchat-message-status.delivered svg {
        fill: rgba(255,255,255,0.8);
      }

      .whizchat-message-status.read svg {
        fill: #34d399;
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
        direction: ltr;
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
        animation: whizchat-spin 0.8s linear infinite;
      }

      @keyframes whizchat-spin {
        to { transform: rotate(360deg); }
      }

      @media (max-width: 480px) {
        .whizchat-window {
          width: calc(100vw - 40px);
          height: calc(100vh - 120px);
          bottom: 80px;
        }
      }

      .whizchat-attach {
        background: none;
        border: none;
        cursor: pointer;
        padding: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6b7280;
        transition: color 0.2s;
      }

      .whizchat-attach:hover:not(:disabled) {
        color: var(--widget-primary);
      }

      .whizchat-attach:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .whizchat-attach svg {
        width: 20px;
        height: 20px;
      }

      .whizchat-file-message {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px;
        background: rgba(0,0,0,0.05);
        border-radius: 8px;
        text-decoration: none;
        color: inherit;
      }

      .whizchat-message.customer .whizchat-file-message {
        background: rgba(255,255,255,0.2);
      }

      .whizchat-file-icon {
        width: 36px;
        height: 36px;
        background: var(--widget-primary);
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .whizchat-file-icon svg {
        width: 18px;
        height: 18px;
        fill: white;
      }

      .whizchat-file-info {
        flex: 1;
        min-width: 0;
      }

      .whizchat-file-name {
        font-size: 13px;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .whizchat-file-size {
        font-size: 11px;
        opacity: 0.7;
      }

      .whizchat-image-message {
        max-width: 200px;
        border-radius: 8px;
        overflow: hidden;
      }

      .whizchat-image-message img {
        width: 100%;
        height: auto;
        display: block;
      }

      .whizchat-header-actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .whizchat-settings-btn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: rgba(255,255,255,0.1);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        transition: background 0.2s;
      }

      .whizchat-settings-btn:hover {
        background: rgba(255,255,255,0.2);
      }

      .whizchat-settings-btn.active {
        background: rgba(255,255,255,0.3);
      }

      .whizchat-settings-btn svg {
        width: 16px;
        height: 16px;
      }

      .whizchat-settings-panel {
        padding: 16px;
        border-bottom: 1px solid #e5e7eb;
        background: #f9fafb;
        animation: whizchat-fadeIn 0.2s ease-out;
      }

      .whizchat-settings-title {
        font-size: 13px;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 12px;
      }

      .whizchat-setting-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 0;
        border-top: 1px solid #e5e7eb;
      }

      .whizchat-setting-item:first-of-type {
        border-top: none;
      }

      .whizchat-setting-label {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        color: #1f2937;
      }

      .whizchat-setting-label svg {
        width: 18px;
        height: 18px;
        color: #6b7280;
      }

      .whizchat-toggle {
        position: relative;
        width: 44px;
        height: 24px;
        background: #e5e7eb;
        border-radius: 12px;
        border: none;
        cursor: pointer;
        transition: background 0.2s ease;
      }

      .whizchat-toggle.on {
        background: var(--widget-primary);
      }

      .whizchat-toggle::after {
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

      .whizchat-toggle.on::after {
        transform: translateX(20px);
      }

      .whizchat-enable-btn {
        padding: 6px 12px;
        background: var(--widget-primary);
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
      }

      .whizchat-enable-btn:hover {
        opacity: 0.9;
      }

      .whizchat-setting-note {
        font-size: 11px;
        color: #9ca3af;
        margin-top: 2px;
      }

      .whizchat-unread-badge {
        position: absolute;
        top: -6px;
        right: -6px;
        min-width: 20px;
        height: 20px;
        padding: 0 6px;
        border-radius: 10px;
        background: #ef4444;
        color: white;
        font-size: 11px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        animation: whizchat-pulse 2s infinite;
      }

      @keyframes whizchat-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
    `;
    document.head.appendChild(style);
  }

  // Create widget HTML
  function createWidget() {
    var container = document.createElement('div');
    container.className = 'whizchat-widget position-' + widgetConfig.position;
    container.id = 'whizchat-widget';

    container.innerHTML = `
      <button class="whizchat-button" id="whizchat-toggle">
        <svg id="whizchat-icon-chat" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
        </svg>
        <svg id="whizchat-icon-close" viewBox="0 0 24 24" style="display: none;">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
        <span id="whizchat-unread-badge" class="whizchat-unread-badge" style="display: none;"></span>
      </button>

      <div class="whizchat-window" id="whizchat-window">
        <div class="whizchat-header">
          <div>
            <div class="whizchat-header-title">WhizChat</div>
            <div class="whizchat-header-status">
              <span class="whizchat-status-dot" id="whizchat-status-dot"></span>
              <span id="whizchat-status-text">Online</span>
            </div>
          </div>
          <div class="whizchat-header-actions">
            <button class="whizchat-settings-btn" id="whizchat-settings-btn" title="Settings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            <button class="whizchat-close" id="whizchat-close-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        </div>

        <div id="whizchat-settings-panel" class="whizchat-settings-panel" style="display: none;"></div>
        <div class="whizchat-messages" id="whizchat-messages"></div>

        <div class="whizchat-faq" id="whizchat-faq" style="display: none;">
          <div class="whizchat-faq-title">Frequently Asked:</div>
          <div class="whizchat-faq-list" id="whizchat-faq-list"></div>
        </div>

        <div class="whizchat-input-area">
          <input type="file" id="whizchat-file-input" style="display: none;" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" />
          <button class="whizchat-attach" id="whizchat-attach" title="Attach file">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <input type="text" class="whizchat-input" id="whizchat-input" placeholder="Type a message..." />
          <button class="whizchat-send" id="whizchat-send">
            <svg viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(container);
  }

  // Render messages
  function renderMessages() {
    var container = document.getElementById('whizchat-messages');
    container.innerHTML = '';

    if (state.isLoading) {
      container.innerHTML = '<div class="whizchat-loading"><div class="whizchat-spinner"></div></div>';
      return;
    }

    // Welcome message
    if (state.welcomeMessage && state.messages.length === 0) {
      var welcome = document.createElement('div');
      welcome.className = 'whizchat-message bot';
      welcome.textContent = state.welcomeMessage;
      container.appendChild(welcome);
    }

    // Messages
    state.messages.forEach(function(msg) {
      var div = document.createElement('div');
      div.className = 'whizchat-message ' + msg.senderType;

      var content = '';
      // Check if message has file
      if (msg.messageType === 'image' && msg.fileUrl) {
        content = '<a href="' + msg.fileUrl + '" target="_blank" class="whizchat-image-message"><img src="' + msg.fileUrl + '" alt="' + escapeHtml(msg.fileName || 'Image') + '" /></a>';
      } else if (msg.messageType && msg.messageType !== 'text' && msg.fileUrl) {
        content = '<a href="' + msg.fileUrl + '" target="_blank" download class="whizchat-file-message">' +
          '<div class="whizchat-file-icon"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>' +
          '<div class="whizchat-file-info"><div class="whizchat-file-name">' + escapeHtml(msg.fileName || 'File') + '</div><div class="whizchat-file-size">' + formatFileSize(msg.fileSize || 0) + '</div></div>' +
          '</a>';
      } else {
        content = '<div>' + escapeHtml(msg.content) + '</div>';
      }

      // Add status icon for customer messages
      var statusHtml = '';
      if (msg.senderType === 'customer' && msg.status) {
        statusHtml = getStatusIcon(msg.status);
      }

      div.innerHTML = content + '<div class="whizchat-message-time">' + formatTime(msg.createdAt) + statusHtml + '</div>';
      container.appendChild(div);
    });

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  // Render FAQ
  function renderFAQ() {
    var container = document.getElementById('whizchat-faq');
    var list = document.getElementById('whizchat-faq-list');

    if (state.faqItems.length === 0 || state.messages.length > 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    list.innerHTML = '';

    state.faqItems.slice(0, 4).forEach(function(item) {
      var btn = document.createElement('button');
      btn.className = 'whizchat-faq-item';
      btn.textContent = item.question;
      btn.onclick = function() { handleFAQClick(item); };
      list.appendChild(btn);
    });
  }

  // Update status
  function updateStatus() {
    var dot = document.getElementById('whizchat-status-dot');
    var text = document.getElementById('whizchat-status-text');

    if (state.isOnline) {
      dot.classList.remove('offline');
      text.textContent = 'Online';
    } else {
      dot.classList.add('offline');
      text.textContent = 'Offline';
    }
  }

  // Render settings panel
  function renderSettings() {
    var panel = document.getElementById('whizchat-settings-panel');
    var btn = document.getElementById('whizchat-settings-btn');

    if (!state.showSettings) {
      panel.style.display = 'none';
      btn.classList.remove('active');
      return;
    }

    btn.classList.add('active');
    panel.style.display = 'block';

    var pushControl = '';
    if (state.pushPermission === 'granted') {
      pushControl = '<button class="whizchat-toggle ' + (state.pushEnabled ? 'on' : '') + '" id="whizchat-push-toggle"></button>';
    } else if (state.pushPermission !== 'denied') {
      pushControl = '<button class="whizchat-enable-btn" id="whizchat-push-enable">Enable</button>';
    } else {
      pushControl = '<span class="whizchat-setting-note">Notifications blocked</span>';
    }

    panel.innerHTML =
      '<div class="whizchat-settings-title">Notification Settings</div>' +
      '<div class="whizchat-setting-item">' +
        '<div class="whizchat-setting-label">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />' +
            '<path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />' +
          '</svg>' +
          'Sounds' +
        '</div>' +
        '<button class="whizchat-toggle ' + (state.soundEnabled ? 'on' : '') + '" id="whizchat-sound-toggle"></button>' +
      '</div>' +
      '<div class="whizchat-setting-item">' +
        '<div class="whizchat-setting-label">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />' +
            '<path d="M13.73 21a2 2 0 0 1-3.46 0" />' +
          '</svg>' +
          'Notifications' +
        '</div>' +
        pushControl +
      '</div>';

    // Bind settings events
    var soundToggle = document.getElementById('whizchat-sound-toggle');
    if (soundToggle) {
      soundToggle.onclick = function() {
        state.soundEnabled = !state.soundEnabled;
        try { localStorage.setItem(STORAGE_SOUND_KEY, JSON.stringify(state.soundEnabled)); } catch (e) {}
        renderSettings();
      };
    }

    var pushToggle = document.getElementById('whizchat-push-toggle');
    if (pushToggle) {
      pushToggle.onclick = function() {
        state.pushEnabled = !state.pushEnabled;
        try { localStorage.setItem(STORAGE_PUSH_KEY, JSON.stringify(state.pushEnabled)); } catch (e) {}
        renderSettings();
      };
    }

    var pushEnable = document.getElementById('whizchat-push-enable');
    if (pushEnable) {
      pushEnable.onclick = requestPushPermission;
    }
  }

  // Update unread badge
  function updateUnreadBadge() {
    var badge = document.getElementById('whizchat-unread-badge');
    if (!badge) return;

    if (state.unreadCount > 0 && !state.isOpen) {
      badge.style.display = 'flex';
      badge.textContent = state.unreadCount > 99 ? '99+' : state.unreadCount;
    } else {
      badge.style.display = 'none';
    }
  }

  // Escape HTML
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Get status icon SVG
  function getStatusIcon(status) {
    if (status === 'read') {
      // Double check - blue/green
      return '<span class="whizchat-message-status read"><svg viewBox="0 0 16 15"><path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/></svg></span>';
    } else if (status === 'delivered') {
      // Double check - gray
      return '<span class="whizchat-message-status delivered"><svg viewBox="0 0 16 15"><path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/></svg></span>';
    } else {
      // Single check - sent
      return '<span class="whizchat-message-status sent"><svg viewBox="0 0 16 15"><path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/></svg></span>';
    }
  }

  // Init chat
  function initChat() {
    state.isLoading = true;
    renderMessages();

    fetch(API_BASE_URL + '/api/chat/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wpUserId: wpUserId,
        wpUserEmail: wpUserEmail,
        wpUserName: wpUserName,
        wpUserAvatar: wpUserAvatar
      })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      state.conversationId = data.conversation.id;
      state.messages = data.messages || [];
      state.isOnline = data.settings.isOnline;
      state.welcomeMessage = data.settings.welcomeMessage;
      state.faqItems = data.settings.faqItems || [];
      state.isLoading = false;

      // Apply widget settings from API (if not overridden by WordPress config)
      if (data.settings.widget) {
        var apiWidget = data.settings.widget;
        // Only use API settings if WordPress config didn't provide them
        if (!config.primaryColor && apiWidget.primaryColor) {
          widgetConfig.primaryColor = apiWidget.primaryColor;
        }
        if (!config.secondaryColor && apiWidget.secondaryColor) {
          widgetConfig.secondaryColor = apiWidget.secondaryColor;
        }
        if (!config.position && apiWidget.position) {
          widgetConfig.position = apiWidget.position;
          // Update position class
          var widget = document.getElementById('whizchat-widget');
          if (widget) {
            widget.className = 'whizchat-widget position-' + widgetConfig.position;
          }
        }
        // Update colors
        updateWidgetColors();
      }

      renderMessages();
      renderFAQ();
      updateStatus();
    })
    .catch(function(error) {
      console.error('WhizChat init error:', error);
      state.isLoading = false;
      renderMessages();
    });
  }

  // Send message
  function sendMessage(content) {
    if (!content.trim() || !state.conversationId || state.isSending) return;

    var clientMessageId = generateId();
    var tempMessage = {
      id: clientMessageId,
      content: content,
      senderType: 'customer',
      senderName: null,
      source: 'widget',
      createdAt: new Date().toISOString()
    };

    state.messages.push(tempMessage);
    state.isSending = true;
    document.getElementById('whizchat-input').value = '';
    renderMessages();
    renderFAQ();

    fetch(API_BASE_URL + '/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: state.conversationId,
        content: content,
        clientMessageId: clientMessageId,
        senderType: 'customer'
      })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      // Replace temp message
      state.messages = state.messages.map(function(m) {
        return m.id === clientMessageId ? data.message : m;
      });
      state.isSending = false;
      renderMessages();
    })
    .catch(function(error) {
      console.error('WhizChat send error:', error);
      state.isSending = false;
    });
  }

  // Handle FAQ click
  function handleFAQClick(item) {
    sendMessage(item.question);

    setTimeout(function() {
      var botMessage = {
        id: generateId(),
        content: item.answer,
        senderType: 'bot',
        senderName: 'WhizBot',
        source: 'widget',
        createdAt: new Date().toISOString()
      };
      state.messages.push(botMessage);
      renderMessages();
      renderFAQ();
    }, 500);
  }

  // Upload file
  function uploadFile(file) {
    if (!file || !state.conversationId || state.isUploading) return;

    var clientMessageId = generateId();
    var isImage = file.type.startsWith('image/');
    var tempMessage = {
      id: clientMessageId,
      content: file.name,
      senderType: 'customer',
      senderName: null,
      source: 'widget',
      createdAt: new Date().toISOString(),
      messageType: isImage ? 'image' : 'file',
      fileName: file.name,
      fileSize: file.size,
      fileMimeType: file.type,
    };

    state.messages.push(tempMessage);
    state.isUploading = true;
    renderMessages();

    var formData = new FormData();
    formData.append('file', file);
    formData.append('conversationId', state.conversationId);
    formData.append('clientMessageId', clientMessageId);
    formData.append('senderType', 'customer');

    fetch(API_BASE_URL + '/api/chat/upload', {
      method: 'POST',
      body: formData
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.message) {
        state.messages = state.messages.map(function(m) {
          return m.id === clientMessageId ? data.message : m;
        });
      } else {
        // Remove failed message
        state.messages = state.messages.filter(function(m) { return m.id !== clientMessageId; });
      }
      state.isUploading = false;
      renderMessages();
    })
    .catch(function(error) {
      console.error('WhizChat upload error:', error);
      state.messages = state.messages.filter(function(m) { return m.id !== clientMessageId; });
      state.isUploading = false;
      renderMessages();
    });

    // Reset file input
    document.getElementById('whizchat-file-input').value = '';
  }

  // Toggle window
  function toggleWindow() {
    state.isOpen = !state.isOpen;

    var window = document.getElementById('whizchat-window');
    var iconChat = document.getElementById('whizchat-icon-chat');
    var iconClose = document.getElementById('whizchat-icon-close');

    if (state.isOpen) {
      window.classList.add('open');
      iconChat.style.display = 'none';
      iconClose.style.display = 'block';
      state.unreadCount = 0;
      state.showSettings = false;
      updateUnreadBadge();
      renderSettings();

      if (!state.conversationId) {
        initChat();
      }
    } else {
      window.classList.remove('open');
      iconChat.style.display = 'block';
      iconClose.style.display = 'none';
    }
  }

  // Bind events
  function bindEvents() {
    document.getElementById('whizchat-toggle').onclick = toggleWindow;
    document.getElementById('whizchat-close-btn').onclick = toggleWindow;

    document.getElementById('whizchat-send').onclick = function() {
      var input = document.getElementById('whizchat-input');
      sendMessage(input.value);
    };

    document.getElementById('whizchat-input').onkeypress = function(e) {
      if (e.key === 'Enter') {
        sendMessage(this.value);
      }
    };

    // File upload events
    document.getElementById('whizchat-attach').onclick = function() {
      if (!state.isUploading) {
        document.getElementById('whizchat-file-input').click();
      }
    };

    document.getElementById('whizchat-file-input').onchange = function(e) {
      var file = e.target.files && e.target.files[0];
      if (file) {
        uploadFile(file);
      }
    };

    // Settings button
    document.getElementById('whizchat-settings-btn').onclick = function() {
      state.showSettings = !state.showSettings;
      renderSettings();
    };
  }

  // Poll for new messages (with notifications)
  function pollMessages() {
    if (!state.conversationId) return;

    var lastMessage = state.messages[state.messages.length - 1];
    var afterParam = lastMessage ? '&after=' + lastMessage.id : '';

    fetch(API_BASE_URL + '/api/chat/messages?conversationId=' + state.conversationId + afterParam + '&viewerType=customer')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.messages && data.messages.length > 0) {
          var newAgentMessages = data.messages.filter(function(m) {
            return m.senderType === 'agent' && m.id !== state.lastMessageId;
          });

          // Trigger notifications for new agent messages
          if (newAgentMessages.length > 0) {
            var latestMsg = newAgentMessages[newAgentMessages.length - 1];
            state.lastMessageId = latestMsg.id;

            // Play sound
            playNotificationSound();

            // Show push notification if widget is closed
            if (!state.isOpen || document.visibilityState !== 'visible') {
              showPushNotification('New Message', latestMsg.content.substring(0, 100));
              if (!state.isOpen) {
                state.unreadCount += newAgentMessages.length;
                updateUnreadBadge();
              }
            }
          }

          // Add new messages
          var existingIds = {};
          state.messages.forEach(function(m) { existingIds[m.id] = true; });
          data.messages.forEach(function(m) {
            if (!existingIds[m.id]) {
              state.messages.push(m);
            }
          });

          if (state.isOpen) {
            renderMessages();
          }
        }
      })
      .catch(function(error) {
        // Silent fail
      });
  }

  // Start polling
  function startPolling() {
    setInterval(function() {
      if (state.conversationId) {
        pollMessages();
      }
    }, state.isOpen ? 3000 : 10000);
  }

  // Initialize
  function init() {
    createStyles();
    createWidget();
    bindEvents();
    startPolling();
    console.log('WhizChat widget v' + WIDGET_VERSION + ' initialized');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
