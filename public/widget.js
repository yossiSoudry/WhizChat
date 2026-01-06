(function() {
  'use strict';

  // Configuration
  var WIDGET_VERSION = '1.6.1';
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
  // Re-read on init to handle async script loading in Next.js
  function getConfig() {
    return window.WHIZCHAT_CONFIG || {};
  }

  var config = getConfig();
  var wpUserId = config.wpUserId;
  var wpUserEmail = config.wpUserEmail;
  var wpUserName = config.wpUserName;
  var wpUserAvatar = config.wpUserAvatar;

  // Widget appearance - will be updated from API settings
  var widgetConfig = {
    position: config.position || 'right',
    primaryColor: config.primaryColor || '#C026D3',
    secondaryColor: config.secondaryColor || '#A21CAF',
    language: config.language || 'en',
    theme: config.theme || 'light',
    chatBackground: config.chatBackground || 'none'
  };

  // Re-apply config (handles async loading scenarios)
  function reloadConfig() {
    var freshConfig = getConfig();
    console.log('WhizChat reloading config:', JSON.stringify(freshConfig));

    // Update user info
    wpUserId = freshConfig.wpUserId;
    wpUserEmail = freshConfig.wpUserEmail;
    wpUserName = freshConfig.wpUserName;
    wpUserAvatar = freshConfig.wpUserAvatar;

    // Update widget config - use fresh values if they exist (check explicitly for undefined)
    if (freshConfig.position !== undefined) widgetConfig.position = freshConfig.position;
    if (freshConfig.primaryColor !== undefined) widgetConfig.primaryColor = freshConfig.primaryColor;
    if (freshConfig.secondaryColor !== undefined) widgetConfig.secondaryColor = freshConfig.secondaryColor;
    if (freshConfig.language !== undefined) widgetConfig.language = freshConfig.language;
    if (freshConfig.theme !== undefined) widgetConfig.theme = freshConfig.theme;
    if (freshConfig.chatBackground !== undefined) widgetConfig.chatBackground = freshConfig.chatBackground;

    console.log('WhizChat config after reload:', JSON.stringify(widgetConfig));
  }

  // Translations
  var translations = {
    en: {
      title: 'WhizChat',
      online: 'Online',
      offline: 'Offline',
      placeholder: 'Message',
      faqTitle: 'Frequently Asked:',
      settingsTitle: 'Notification Settings',
      sounds: 'Sounds',
      notifications: 'Notifications',
      notificationsBlocked: 'Notifications blocked',
      enable: 'Enable',
      today: 'Today',
      yesterday: 'Yesterday',
      you: 'You',
      agent: 'Agent',
      replyToMessage: 'Reply'
    },
    he: {
      title: 'צ\'אט תמיכה',
      online: 'מחובר',
      offline: 'לא מחובר',
      placeholder: 'הודעה',
      faqTitle: 'שאלות נפוצות:',
      settingsTitle: 'הגדרות התראות',
      sounds: 'צלילים',
      notifications: 'התראות',
      notificationsBlocked: 'התראות חסומות',
      enable: 'הפעל',
      today: 'היום',
      yesterday: 'אתמול',
      you: 'את/ה',
      agent: 'נציג',
      replyToMessage: 'הגב להודעה'
    }
  };

  // Get current translation
  function t(key) {
    return translations[widgetConfig.language][key] || translations.en[key] || key;
  }

  // Check if RTL language
  function isRTL() {
    return widgetConfig.language === 'he';
  }

  // Get current theme (resolves 'auto' to actual theme)
  function getCurrentTheme() {
    if (widgetConfig.theme === 'auto') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return widgetConfig.theme;
  }

  // Chat background patterns (CSS)
  var chatBackgrounds = {
    none: '',
    dots: 'background-image: radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px); background-size: 16px 16px;',
    grid: 'background-image: linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px); background-size: 20px 20px;',
    waves: 'background: linear-gradient(135deg, #f0f4ff 0%, #fdf2f8 50%, #f0fdfa 100%);',
    bubbles: 'background: linear-gradient(135deg, #fdf2f8 0%, #ffffff 50%, #ecfeff 100%);',
    doodles: 'background-color: #fafafa; background-image: url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.08\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");',
    geometric: 'background-color: #fafafa; background-image: url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.06\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 40L40 0H20L0 20M40 40V20L20 40\'/%3E%3C/g%3E%3C/svg%3E");',
    confetti: 'background-color: #fafafa; background-image: url("data:image/svg+xml,%3Csvg width=\'52\' height=\'26\' viewBox=\'0 0 52 26\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23c026d3\' fill-opacity=\'0.06\'%3E%3Cpath d=\'M10 10c0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6h2c0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4v2c-3.314 0-6-2.686-6-6 0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6zm25.464-1.95l8.486 8.486-1.414 1.414-8.486-8.486 1.414-1.414z\' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E");'
  };

  // Dark mode chat backgrounds
  var chatBackgroundsDark = {
    none: '',
    dots: 'background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px); background-size: 16px 16px;',
    grid: 'background-image: linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px); background-size: 20px 20px;',
    waves: 'background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e3a5f 100%);',
    bubbles: 'background: linear-gradient(135deg, #312e81 0%, #1f2937 50%, #134e4a 100%);',
    doodles: 'background-color: #1f2937; background-image: url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.12\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");',
    geometric: 'background-color: #1f2937; background-image: url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.08\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 40L40 0H20L0 20M40 40V20L20 40\'/%3E%3C/g%3E%3C/svg%3E");',
    confetti: 'background-color: #1f2937; background-image: url("data:image/svg+xml,%3Csvg width=\'52\' height=\'26\' viewBox=\'0 0 52 26\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23c026d3\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M10 10c0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6h2c0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4v2c-3.314 0-6-2.686-6-6 0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6zm25.464-1.95l8.486 8.486-1.414 1.414-8.486-8.486 1.414-1.414z\' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E");'
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
    var locale = isRTL() ? 'he-IL' : 'en-US';
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: !isRTL() });
  }

  // Format file size
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
      return t('today');
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return t('yesterday');
    } else {
      var locale = isRTL() ? 'he-IL' : 'en-US';
      return date.toLocaleDateString(locale, { weekday: 'long', month: 'short', day: 'numeric' });
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

  // Update widget colors dynamically
  function updateWidgetColors() {
    var widget = document.querySelector('.whizchat-widget');
    if (widget) {
      widget.style.setProperty('--widget-primary', widgetConfig.primaryColor);
      widget.style.setProperty('--widget-secondary', widgetConfig.secondaryColor);
    }
  }

  // Apply theme and language settings
  function applyThemeAndLanguage() {
    var widget = document.querySelector('.whizchat-widget');
    if (!widget) return;

    var isDark = getCurrentTheme() === 'dark';
    var rtl = isRTL();

    // Apply theme class
    widget.classList.remove('theme-light', 'theme-dark');
    widget.classList.add(isDark ? 'theme-dark' : 'theme-light');

    // Apply RTL class
    widget.classList.remove('lang-ltr', 'lang-rtl');
    widget.classList.add(rtl ? 'lang-rtl' : 'lang-ltr');

    // Apply chat background
    var messagesContainer = document.getElementById('whizchat-messages');
    if (messagesContainer) {
      var bgKey = widgetConfig.chatBackground || 'none';
      var bgStyle = isDark ? (chatBackgroundsDark[bgKey] || '') : (chatBackgrounds[bgKey] || '');
      messagesContainer.style.cssText = bgStyle;
    }

    // Update text content based on language
    var titleEl = document.querySelector('.whizchat-header-title');
    if (titleEl) titleEl.textContent = t('title');

    var statusText = document.getElementById('whizchat-status-text');
    if (statusText) statusText.textContent = state.isOnline ? t('online') : t('offline');

    var inputEl = document.getElementById('whizchat-input');
    if (inputEl) inputEl.placeholder = t('placeholder');

    var faqTitle = document.querySelector('.whizchat-faq-title');
    if (faqTitle) faqTitle.textContent = t('faqTitle');
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
        padding: 10px 14px;
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.4;
      }

      @keyframes whizchat-fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .whizchat-message.customer {
        background: linear-gradient(135deg, var(--widget-primary), var(--widget-secondary));
        color: white;
        border-bottom-right-radius: 4px;
      }

      .whizchat-message.agent,
      .whizchat-message.bot {
        background: #f3f4f6;
        color: #1f2937;
        border-bottom-left-radius: 4px;
      }

      .whizchat-message.system {
        background: #fef3c7;
        color: #92400e;
        text-align: center;
        font-size: 13px;
      }

      .whizchat-message-wrapper {
        display: flex;
        flex-direction: column;
        max-width: 80%;
        animation: whizchat-fadeIn 0.2s ease-out;
      }

      .whizchat-message-wrapper.customer {
        align-self: flex-end;
        align-items: flex-end;
      }

      .whizchat-message-wrapper.agent,
      .whizchat-message-wrapper.bot {
        align-self: flex-start;
        align-items: flex-start;
      }

      .whizchat-message-wrapper.system {
        align-self: center;
        align-items: center;
      }

      /* Agent info (avatar + name) above message */
      .whizchat-agent-info {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 4px;
        padding-left: 4px;
      }

      .whizchat-agent-avatar {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        object-fit: cover;
        background: linear-gradient(135deg, var(--widget-primary), var(--widget-secondary));
      }

      .whizchat-agent-avatar-fallback {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--widget-primary), var(--widget-secondary));
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 600;
        color: white;
      }

      .whizchat-agent-name {
        font-size: 12px;
        font-weight: 500;
        color: #6b7280;
      }

      .whizchat-message-meta {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 2px;
        padding: 0 4px;
      }

      .whizchat-message-wrapper.customer .whizchat-message-meta {
        justify-content: flex-end;
      }

      .whizchat-message-time {
        font-size: 11px;
        color: #9ca3af;
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
        fill: #9ca3af;
      }

      .whizchat-message-status.delivered svg {
        fill: #6b7280;
      }

      .whizchat-message-status.read svg {
        fill: #3b82f6;
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

      /* Floating input bar - no background */
      .whizchat-input-area {
        padding: 8px 12px 12px;
        background: transparent;
        display: flex;
        gap: 8px;
        align-items: center;
        position: relative;
      }

      /* Floating input container */
      .whizchat-input-container {
        flex: 1;
        display: flex;
        align-items: center;
        background: white;
        border-radius: 24px;
        padding: 4px 12px 4px 4px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
        min-height: 48px;
        border: 1px solid rgba(0, 0, 0, 0.06);
      }

      /* Action buttons inside unified container */
      .whizchat-action-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #54656f;
        transition: all 0.15s ease;
        flex-shrink: 0;
      }

      .whizchat-action-btn:hover {
        background: #f0f2f5;
        color: var(--widget-primary);
      }

      .whizchat-action-btn:active {
        transform: scale(0.92);
      }

      .whizchat-action-btn svg {
        width: 22px;
        height: 22px;
      }

      /* Emoji Picker */
      .whizchat-emoji-picker {
        position: absolute;
        bottom: 68px;
        left: 12px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 20px rgba(0, 0, 0, 0.18);
        padding: 10px;
        display: none;
        z-index: 10;
        width: 280px;
      }

      .whizchat-emoji-picker.open {
        display: block;
        animation: whizchat-slideUp 0.18s ease-out;
      }

      @keyframes whizchat-slideUp {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .whizchat-emoji-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 2px;
      }

      .whizchat-emoji-item {
        width: 36px;
        height: 36px;
        border: none;
        background: transparent;
        cursor: pointer;
        border-radius: 8px;
        font-size: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.1s;
      }

      .whizchat-emoji-item:hover {
        background: #f0f2f5;
      }

      /* Input field - seamless inside container */
      .whizchat-input {
        flex: 1;
        border: none !important;
        background: transparent !important;
        padding: 10px 8px;
        font-size: 15px;
        outline: none !important;
        min-width: 0;
        direction: ltr;
        line-height: 1.35;
        color: #1f2937 !important;
        -webkit-text-fill-color: #1f2937 !important;
      }

      .whizchat-input::placeholder {
        color: #8696a0 !important;
        -webkit-text-fill-color: #8696a0 !important;
      }

      /* Send button - outside the container like WhatsApp */
      .whizchat-send-outer {
        background: linear-gradient(135deg, var(--widget-primary), var(--widget-secondary));
        border: none;
        border-radius: 50%;
        width: 48px;
        height: 48px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
        flex-shrink: 0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }

      .whizchat-send-outer:hover:not(:disabled) {
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }

      .whizchat-send-outer:active:not(:disabled) {
        transform: scale(0.95);
      }

      .whizchat-send-outer:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .whizchat-send-outer svg {
        width: 22px;
        height: 22px;
        fill: white;
        margin-left: 2px;
      }

      .whizchat-send-outer:focus {
        outline: none;
      }

      /* Hide old send classes */
      .whizchat-send,
      .whizchat-send-inner {
        display: none;
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

      /* Legacy attach styles removed - using .whizchat-action-btn instead */

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

      /* Date separator */
      .whizchat-date-separator {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px 0;
        margin: 8px 0;
      }

      .whizchat-date-separator span {
        display: inline-block;
        background: #f3f4f6;
        color: #6b7280;
        font-size: 11px;
        font-weight: 500;
        padding: 4px 12px;
        border-radius: 12px;
        border: 1px solid #e5e7eb;
      }

      /* Reply bar above input */
      .whizchat-reply-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 16px;
        background: #f9fafb;
        border-top: 1px solid #e5e7eb;
      }

      .whizchat-reply-content {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        min-width: 0;
      }

      .whizchat-reply-indicator {
        width: 3px;
        height: 32px;
        background: var(--widget-primary);
        border-radius: 2px;
        flex-shrink: 0;
      }

      .whizchat-reply-info {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .whizchat-reply-sender {
        font-size: 12px;
        font-weight: 600;
        color: var(--widget-primary);
      }

      .whizchat-reply-text {
        font-size: 12px;
        color: #6b7280;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .whizchat-reply-close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border: none;
        background: transparent;
        color: #6b7280;
        cursor: pointer;
        border-radius: 4px;
        flex-shrink: 0;
      }

      .whizchat-reply-close:hover {
        background: #e5e7eb;
      }

      /* Reply button on messages */
      .whizchat-message-row {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        width: 100%;
      }

      .whizchat-message-row.customer {
        justify-content: flex-end;
      }

      .whizchat-message-row.agent,
      .whizchat-message-row.bot {
        justify-content: flex-start;
      }

      .whizchat-reply-btn {
        position: relative;
        opacity: 0;
        width: 28px;
        height: 28px;
        min-width: 28px;
        border: none;
        background: transparent;
        border-radius: 6px;
        cursor: pointer;
        color: #6b7280;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.2s ease, background 0.2s ease, color 0.2s ease;
        flex-shrink: 0;
        margin-bottom: 18px;
      }

      .whizchat-message-row:hover .whizchat-reply-btn {
        opacity: 1;
      }

      .whizchat-reply-btn:hover {
        background: #f3f4f6;
        color: #374151;
      }

      .whizchat-reply-btn svg {
        width: 16px;
        height: 16px;
        pointer-events: none;
      }

      /* Tooltip for reply button */
      .whizchat-reply-btn::after {
        content: attr(data-tooltip);
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        padding: 4px 8px;
        background: #1f2937;
        color: white;
        font-size: 12px;
        border-radius: 4px;
        white-space: nowrap;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.15s ease, visibility 0.15s ease;
        margin-bottom: 4px;
        pointer-events: none;
        z-index: 10;
      }

      .whizchat-reply-btn:hover::after {
        opacity: 1;
        visibility: visible;
      }

      /* RTL support for reply button */
      .whizchat-widget.lang-rtl .whizchat-message-row.customer {
        justify-content: flex-start;
      }

      .whizchat-widget.lang-rtl .whizchat-message-row.agent,
      .whizchat-widget.lang-rtl .whizchat-message-row.bot {
        justify-content: flex-end;
      }

      /* Reply preview in message bubble */
      .whizchat-message-reply-preview {
        display: flex;
        align-items: stretch;
        gap: 8px;
        padding: 8px;
        margin-bottom: 4px;
        background: rgba(0,0,0,0.05);
        border-radius: 8px;
        font-size: 12px;
        cursor: pointer;
      }

      .whizchat-message.customer .whizchat-message-reply-preview {
        background: rgba(255,255,255,0.2);
      }

      .whizchat-message-reply-bar {
        width: 3px;
        background: var(--widget-primary);
        border-radius: 2px;
        flex-shrink: 0;
      }

      .whizchat-message.customer .whizchat-message-reply-bar {
        background: rgba(255,255,255,0.5);
      }

      .whizchat-message-reply-content {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .whizchat-message-reply-sender {
        font-weight: 600;
        color: var(--widget-primary);
        margin-bottom: 2px;
      }

      .whizchat-message.customer .whizchat-message-reply-sender {
        color: rgba(255,255,255,0.9);
      }

      .whizchat-message-reply-text {
        color: #6b7280;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .whizchat-message.customer .whizchat-message-reply-text {
        color: rgba(255,255,255,0.7);
      }

      /* Message highlight animation */
      .whizchat-message-highlight {
        animation: whizchat-highlight 1.5s ease-out;
      }

      @keyframes whizchat-highlight {
        0%, 50% { background: rgba(192, 38, 211, 0.2); }
        100% { background: transparent; }
      }

      /* ==================== RTL STYLES ==================== */
      .whizchat-widget.lang-rtl {
        direction: rtl;
      }

      .whizchat-widget.lang-rtl .whizchat-window {
        direction: rtl;
      }

      .whizchat-widget.lang-rtl .whizchat-message.customer {
        border-bottom-right-radius: 16px;
        border-bottom-left-radius: 4px;
      }

      .whizchat-widget.lang-rtl .whizchat-message.agent,
      .whizchat-widget.lang-rtl .whizchat-message.bot {
        border-bottom-left-radius: 16px;
        border-bottom-right-radius: 4px;
      }

      .whizchat-widget.lang-rtl .whizchat-message-wrapper.customer {
        align-self: flex-start;
        align-items: flex-start;
      }

      .whizchat-widget.lang-rtl .whizchat-message-wrapper.agent,
      .whizchat-widget.lang-rtl .whizchat-message-wrapper.bot {
        align-self: flex-end;
        align-items: flex-end;
      }

      .whizchat-widget.lang-rtl .whizchat-input {
        direction: rtl;
        text-align: right;
      }

      .whizchat-widget.lang-rtl .whizchat-send-outer svg {
        margin-left: 0;
        margin-right: 2px;
        transform: scaleX(-1);
      }

      /* ==================== DARK MODE STYLES ==================== */
      .whizchat-widget.theme-dark .whizchat-window {
        background: #1f2937;
        border: 1px solid #374151;
      }

      .whizchat-widget.theme-dark .whizchat-messages {
        background: #111827;
      }

      .whizchat-widget.theme-dark .whizchat-message.agent,
      .whizchat-widget.theme-dark .whizchat-message.bot {
        background: #374151;
        color: #f3f4f6;
      }

      .whizchat-widget.theme-dark .whizchat-message.system {
        background: #422006;
        color: #fbbf24;
      }

      .whizchat-widget.theme-dark .whizchat-message-time {
        color: #6b7280;
      }

      .whizchat-widget.theme-dark .whizchat-agent-name {
        color: #9ca3af;
      }

      .whizchat-widget.theme-dark .whizchat-faq {
        background: #1f2937;
        border-color: #374151;
      }

      .whizchat-widget.theme-dark .whizchat-faq-title {
        color: #9ca3af;
      }

      .whizchat-widget.theme-dark .whizchat-faq-item {
        background: #374151;
        border-color: #4b5563;
        color: #f3f4f6;
      }

      .whizchat-widget.theme-dark .whizchat-faq-item:hover {
        background: var(--widget-primary);
        color: white;
        border-color: var(--widget-primary);
      }

      .whizchat-widget.theme-dark .whizchat-input-container {
        background: #374151;
        border-color: #4b5563;
      }

      .whizchat-widget.theme-dark .whizchat-input {
        color: #f3f4f6 !important;
        -webkit-text-fill-color: #f3f4f6 !important;
      }

      .whizchat-widget.theme-dark .whizchat-input::placeholder {
        color: #6b7280 !important;
        -webkit-text-fill-color: #6b7280 !important;
      }

      .whizchat-widget.theme-dark .whizchat-action-btn {
        color: #9ca3af;
      }

      .whizchat-widget.theme-dark .whizchat-action-btn:hover {
        background: #4b5563;
        color: var(--widget-primary);
      }

      .whizchat-widget.theme-dark .whizchat-settings-panel {
        background: #1f2937;
        border-color: #374151;
      }

      .whizchat-widget.theme-dark .whizchat-settings-title {
        color: #f3f4f6;
      }

      .whizchat-widget.theme-dark .whizchat-setting-item {
        border-color: #374151;
      }

      .whizchat-widget.theme-dark .whizchat-setting-label {
        color: #f3f4f6;
      }

      .whizchat-widget.theme-dark .whizchat-setting-label svg {
        color: #9ca3af;
      }

      .whizchat-widget.theme-dark .whizchat-toggle {
        background: #4b5563;
      }

      .whizchat-widget.theme-dark .whizchat-reply-bar {
        background: #374151;
        border-color: #4b5563;
      }

      .whizchat-widget.theme-dark .whizchat-reply-text {
        color: #9ca3af;
      }

      .whizchat-widget.theme-dark .whizchat-reply-close {
        color: #9ca3af;
      }

      .whizchat-widget.theme-dark .whizchat-reply-close:hover {
        background: #4b5563;
      }

      .whizchat-widget.theme-dark .whizchat-date-separator span {
        background: #374151;
        color: #9ca3af;
        border-color: #4b5563;
      }

      .whizchat-widget.theme-dark .whizchat-emoji-picker {
        background: #1f2937;
        border: 1px solid #374151;
      }

      .whizchat-widget.theme-dark .whizchat-emoji-item:hover {
        background: #374151;
      }

      .whizchat-widget.theme-dark .whizchat-message-reply-preview {
        background: rgba(255,255,255,0.08);
      }

      .whizchat-widget.theme-dark .whizchat-message-reply-text {
        color: #9ca3af;
      }

      .whizchat-widget.theme-dark .whizchat-reply-btn {
        background: transparent;
        color: #9ca3af;
      }

      .whizchat-widget.theme-dark .whizchat-reply-btn:hover {
        background: #4b5563;
        color: #e5e7eb;
      }

      .whizchat-widget.theme-dark .whizchat-reply-btn::after {
        background: #374151;
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

        <div class="whizchat-reply-bar" id="whizchat-reply-bar" style="display: none;">
          <div class="whizchat-reply-content">
            <div class="whizchat-reply-indicator"></div>
            <div class="whizchat-reply-info">
              <span id="whizchat-reply-sender" class="whizchat-reply-sender"></span>
              <span id="whizchat-reply-text" class="whizchat-reply-text"></span>
            </div>
          </div>
          <button id="whizchat-reply-close" class="whizchat-reply-close" aria-label="Cancel reply">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="whizchat-input-area">
          <input type="file" id="whizchat-file-input" style="display: none;" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" />

          <!-- Emoji picker popup -->
          <div class="whizchat-emoji-picker" id="whizchat-emoji-picker">
            <div class="whizchat-emoji-grid" id="whizchat-emoji-grid"></div>
          </div>

          <!-- Floating input bubble with emoji on left, media on right -->
          <div class="whizchat-input-container">
            <button class="whizchat-action-btn" id="whizchat-emoji-btn" title="Add emoji">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
            </button>
            <input type="text" class="whizchat-input" id="whizchat-input" placeholder="Message" />
            <button class="whizchat-action-btn" id="whizchat-attach" title="Attach media">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>
          </div>

          <!-- Send button outside the container -->
          <button class="whizchat-send-outer" id="whizchat-send">
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
      var welcomeWrapper = document.createElement('div');
      welcomeWrapper.className = 'whizchat-message-wrapper bot';

      var welcome = document.createElement('div');
      welcome.className = 'whizchat-message bot';
      welcome.textContent = state.welcomeMessage;
      welcomeWrapper.appendChild(welcome);

      container.appendChild(welcomeWrapper);
    }

    // Messages with date separators
    var lastDate = null;
    state.messages.forEach(function(msg, index) {
      // Check if we need a date separator
      if (!lastDate || !isSameDay(lastDate, msg.createdAt)) {
        var separator = document.createElement('div');
        separator.className = 'whizchat-date-separator';
        separator.innerHTML = '<span>' + formatDateSeparator(msg.createdAt) + '</span>';
        container.appendChild(separator);
        lastDate = msg.createdAt;
      }

      // Create outer row for message + reply button
      var row = document.createElement('div');
      row.className = 'whizchat-message-row ' + msg.senderType;

      // Create reply button (placed before or after wrapper based on sender)
      var replyBtn = document.createElement('button');
      replyBtn.className = 'whizchat-reply-btn';
      replyBtn.setAttribute('data-msg-index', index);
      replyBtn.setAttribute('data-tooltip', t('replyToMessage'));
      // Reply icon matching dashboard style
      replyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>';

      // Create wrapper div
      var wrapper = document.createElement('div');
      wrapper.className = 'whizchat-message-wrapper ' + msg.senderType;
      wrapper.setAttribute('data-msg-index', index);

      // Add agent info (avatar + name) for agent/bot messages
      if (msg.senderType === 'agent' || msg.senderType === 'bot') {
        var agentInfo = document.createElement('div');
        agentInfo.className = 'whizchat-agent-info';

        // Avatar
        if (msg.senderAvatar) {
          var avatar = document.createElement('img');
          avatar.className = 'whizchat-agent-avatar';
          avatar.src = msg.senderAvatar;
          avatar.alt = msg.senderName || t('agent');
          avatar.onerror = function() {
            // If image fails to load, replace with fallback
            var fallback = document.createElement('div');
            fallback.className = 'whizchat-agent-avatar-fallback';
            fallback.textContent = (msg.senderName || t('agent')).charAt(0).toUpperCase();
            this.parentNode.replaceChild(fallback, this);
          };
          agentInfo.appendChild(avatar);
        } else {
          // Fallback avatar with initial
          var avatarFallback = document.createElement('div');
          avatarFallback.className = 'whizchat-agent-avatar-fallback';
          avatarFallback.textContent = (msg.senderName || t('agent')).charAt(0).toUpperCase();
          agentInfo.appendChild(avatarFallback);
        }

        // Name
        var agentName = document.createElement('span');
        agentName.className = 'whizchat-agent-name';
        agentName.textContent = msg.senderName || t('agent');
        agentInfo.appendChild(agentName);

        wrapper.appendChild(agentInfo);
      }

      // Create message bubble
      var bubble = document.createElement('div');
      bubble.className = 'whizchat-message ' + msg.senderType;
      if (msg.id) {
        bubble.setAttribute('data-msg-id', msg.id);
      }

      var content = '';

      // Add reply preview if this message is a reply
      if (msg.replyToId && msg.replyToContent) {
        content += '<div class="whizchat-message-reply-preview" data-reply-to-id="' + escapeHtml(msg.replyToId) + '">' +
          '<div class="whizchat-message-reply-bar"></div>' +
          '<div class="whizchat-message-reply-content">' +
            '<span class="whizchat-message-reply-sender">' + escapeHtml(msg.replyToSender || 'Message') + '</span>' +
            '<span class="whizchat-message-reply-text">' + escapeHtml(msg.replyToContent.length > 50 ? msg.replyToContent.substring(0, 50) + '...' : msg.replyToContent) + '</span>' +
          '</div>' +
        '</div>';
      }

      // Check if message has file
      if (msg.messageType === 'image' && msg.fileUrl) {
        content += '<a href="' + msg.fileUrl + '" target="_blank" class="whizchat-image-message"><img src="' + msg.fileUrl + '" alt="' + escapeHtml(msg.fileName || 'Image') + '" /></a>';
      } else if (msg.messageType && msg.messageType !== 'text' && msg.fileUrl) {
        content += '<a href="' + msg.fileUrl + '" target="_blank" download class="whizchat-file-message">' +
          '<div class="whizchat-file-icon"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>' +
          '<div class="whizchat-file-info"><div class="whizchat-file-name">' + escapeHtml(msg.fileName || 'File') + '</div><div class="whizchat-file-size">' + formatFileSize(msg.fileSize || 0) + '</div></div>' +
          '</a>';
      } else {
        content += '<div class="whizchat-message-text">' + escapeHtml(msg.content) + '</div>';
      }

      bubble.innerHTML = content;
      wrapper.appendChild(bubble);

      // Create meta line (time + status) - outside the bubble
      var meta = document.createElement('div');
      meta.className = 'whizchat-message-meta';

      var metaContent = '<span class="whizchat-message-time">' + formatTime(msg.createdAt) + '</span>';

      // Add status icon for customer messages
      if (msg.senderType === 'customer' && msg.status) {
        metaContent += getStatusIcon(msg.status);
      }

      meta.innerHTML = metaContent;
      wrapper.appendChild(meta);

      // For customer messages: button on left, wrapper on right
      // For agent/bot messages: wrapper on left, button on right
      if (msg.senderType === 'customer') {
        row.appendChild(replyBtn);
        row.appendChild(wrapper);
      } else if (msg.senderType !== 'system') {
        row.appendChild(wrapper);
        row.appendChild(replyBtn);
      } else {
        row.appendChild(wrapper);
      }

      container.appendChild(row);
    });

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;

    // Bind reply button events
    bindReplyEvents();
  }

  // Set reply to a message
  function setReplyTo(msg) {
    replyingTo = msg;
    var replyBar = document.getElementById('whizchat-reply-bar');
    var replySender = document.getElementById('whizchat-reply-sender');
    var replyText = document.getElementById('whizchat-reply-text');

    replySender.textContent = msg.senderType === 'customer' ? t('you') : (msg.senderName || t('agent'));
    replyText.textContent = msg.content && msg.content.length > 50 ? msg.content.substring(0, 50) + '...' : (msg.content || '');
    replyBar.style.display = 'flex';

    // Focus input
    document.getElementById('whizchat-input').focus();
  }

  // Cancel reply
  function cancelReply() {
    replyingTo = null;
    document.getElementById('whizchat-reply-bar').style.display = 'none';
  }

  // Bind reply button events
  function bindReplyEvents() {
    // Reply buttons
    var replyBtns = document.querySelectorAll('.whizchat-reply-btn');
    replyBtns.forEach(function(btn) {
      btn.onclick = function(e) {
        e.stopPropagation();
        var msgIndex = parseInt(btn.getAttribute('data-msg-index'), 10);
        var msg = state.messages[msgIndex];
        if (msg) {
          setReplyTo(msg);
        }
      };
    });

    // Reply previews (click to scroll to original)
    var replyPreviews = document.querySelectorAll('.whizchat-message-reply-preview');
    replyPreviews.forEach(function(preview) {
      preview.onclick = function() {
        var replyToId = preview.getAttribute('data-reply-to-id');
        var targetMsg = document.querySelector('[data-msg-id="' + replyToId + '"]');
        if (targetMsg) {
          targetMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetMsg.classList.add('whizchat-message-highlight');
          setTimeout(function() {
            targetMsg.classList.remove('whizchat-message-highlight');
          }, 1500);
        }
      };
    });
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
      text.textContent = t('online');
    } else {
      dot.classList.add('offline');
      text.textContent = t('offline');
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
      pushControl = '<button class="whizchat-enable-btn" id="whizchat-push-enable">' + t('enable') + '</button>';
    } else {
      pushControl = '<span class="whizchat-setting-note">' + t('notificationsBlocked') + '</span>';
    }

    panel.innerHTML =
      '<div class="whizchat-settings-title">' + t('settingsTitle') + '</div>' +
      '<div class="whizchat-setting-item">' +
        '<div class="whizchat-setting-label">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />' +
            '<path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />' +
          '</svg>' +
          t('sounds') +
        '</div>' +
        '<button class="whizchat-toggle ' + (state.soundEnabled ? 'on' : '') + '" id="whizchat-sound-toggle"></button>' +
      '</div>' +
      '<div class="whizchat-setting-item">' +
        '<div class="whizchat-setting-label">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />' +
            '<path d="M13.73 21a2 2 0 0 1-3.46 0" />' +
          '</svg>' +
          t('notifications') +
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
        }
        if (!config.language && apiWidget.language) {
          widgetConfig.language = apiWidget.language;
        }
        if (!config.theme && apiWidget.theme) {
          widgetConfig.theme = apiWidget.theme;
        }
        if (!config.chatBackground && apiWidget.chatBackground) {
          widgetConfig.chatBackground = apiWidget.chatBackground;
        }
        // Update position class
        var widget = document.getElementById('whizchat-widget');
        if (widget) {
          widget.className = 'whizchat-widget position-' + widgetConfig.position;
        }
        // Update colors and apply theme/language
        updateWidgetColors();
        applyThemeAndLanguage();
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
      createdAt: new Date().toISOString(),
      replyToId: replyingTo ? replyingTo.id : null,
      replyToContent: replyingTo ? replyingTo.content : null,
      replyToSender: replyingTo ? (replyingTo.senderType === 'customer' ? t('you') : (replyingTo.senderName || t('agent'))) : null
    };

    // Save reply info before clearing
    var replyData = replyingTo ? {
      replyToId: replyingTo.id,
      replyToContent: replyingTo.content,
      replyToSender: replyingTo.senderType === 'customer' ? t('you') : (replyingTo.senderName || t('agent'))
    } : null;

    state.messages.push(tempMessage);
    state.isSending = true;
    document.getElementById('whizchat-input').value = '';
    cancelReply(); // Clear reply state
    renderMessages();
    renderFAQ();

    var requestBody = {
      conversationId: state.conversationId,
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

    fetch(API_BASE_URL + '/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
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

    // Reply close button
    document.getElementById('whizchat-reply-close').onclick = cancelReply;

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

    // Emoji picker
    var emojiPickerOpen = false;
    var commonEmojis = [
      '😊', '😂', '❤️', '👍', '🙏', '😍', '🎉', '🔥',
      '😢', '😮', '🤔', '👋', '✨', '💪', '😎', '🙌',
      '😁', '🥰', '😘', '🤗', '😉', '👏', '💯', '🌟',
      '😄', '🤣', '💕', '✅', '⭐', '🎊', '💖', '🙂'
    ];

    // Populate emoji grid
    var emojiGrid = document.getElementById('whizchat-emoji-grid');
    commonEmojis.forEach(function(emoji) {
      var btn = document.createElement('button');
      btn.className = 'whizchat-emoji-item';
      btn.textContent = emoji;
      btn.onclick = function(e) {
        e.stopPropagation();
        var input = document.getElementById('whizchat-input');
        var start = input.selectionStart || input.value.length;
        var end = input.selectionEnd || input.value.length;
        input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
        input.focus();
        input.setSelectionRange(start + emoji.length, start + emoji.length);
        // Close picker
        document.getElementById('whizchat-emoji-picker').classList.remove('open');
        emojiPickerOpen = false;
      };
      emojiGrid.appendChild(btn);
    });

    document.getElementById('whizchat-emoji-btn').onclick = function(e) {
      e.stopPropagation();
      var picker = document.getElementById('whizchat-emoji-picker');
      emojiPickerOpen = !emojiPickerOpen;
      if (emojiPickerOpen) {
        picker.classList.add('open');
      } else {
        picker.classList.remove('open');
      }
    };

    // Close emoji picker when clicking outside
    document.addEventListener('click', function(e) {
      var picker = document.getElementById('whizchat-emoji-picker');
      var btn = document.getElementById('whizchat-emoji-btn');
      if (picker && btn && !picker.contains(e.target) && e.target !== btn) {
        picker.classList.remove('open');
        emojiPickerOpen = false;
      }
    });
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
    // Re-read config in case script loaded before config was set (Next.js async loading)
    reloadConfig();

    createStyles();
    createWidget();

    // Update position class based on reloaded config
    var widget = document.getElementById('whizchat-widget');
    if (widget) {
      widget.className = 'whizchat-widget position-' + widgetConfig.position;
    }

    updateWidgetColors();
    applyThemeAndLanguage();
    bindEvents();
    startPolling();

    // Listen for system theme changes (for 'auto' mode)
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
        if (widgetConfig.theme === 'auto') {
          applyThemeAndLanguage();
        }
      });
    }

    console.log('WhizChat widget v' + WIDGET_VERSION + ' initialized (lang: ' + widgetConfig.language + ', theme: ' + widgetConfig.theme + ', bg: ' + widgetConfig.chatBackground + ')');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
