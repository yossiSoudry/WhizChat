(function() {
  'use strict';

  // Configuration
  var WIDGET_VERSION = '1.0.0';
  var API_BASE_URL = window.WHIZCHAT_API_URL || '';

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
  };

  // Config from window object
  var config = window.WHIZCHAT_CONFIG || {};
  var position = config.position || 'right';
  var primaryColor = config.primaryColor || '#A31CAF';
  var secondaryColor = config.secondaryColor || '#39C3EF';
  var wpUserId = config.wpUserId;
  var wpUserEmail = config.wpUserEmail;
  var wpUserName = config.wpUserName;

  // Generate unique ID
  function generateId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  // Format time
  function formatTime(dateString) {
    var date = new Date(dateString);
    return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  }

  // Format file size
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // Create widget styles
  function createStyles() {
    var style = document.createElement('style');
    style.textContent = `
      .whizchat-widget {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        position: fixed;
        bottom: 20px;
        ${position}: 20px;
        z-index: 999999;
        direction: rtl;
        --widget-primary: ${primaryColor};
        --widget-secondary: ${secondaryColor};
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
        display: none;
        flex-direction: column;
        overflow: hidden;
        animation: whizchat-slideUp 0.3s ease-out;
      }

      .whizchat-window.open {
        display: flex;
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
        direction: rtl;
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
    `;
    document.head.appendChild(style);
  }

  // Create widget HTML
  function createWidget() {
    var container = document.createElement('div');
    container.className = 'whizchat-widget';
    container.id = 'whizchat-widget';

    container.innerHTML = `
      <button class="whizchat-button" id="whizchat-toggle">
        <svg id="whizchat-icon-chat" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
        </svg>
        <svg id="whizchat-icon-close" viewBox="0 0 24 24" style="display: none;">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </button>

      <div class="whizchat-window" id="whizchat-window">
        <div class="whizchat-header">
          <div>
            <div class="whizchat-header-title">WhizChat</div>
            <div class="whizchat-header-status">
              <span class="whizchat-status-dot" id="whizchat-status-dot"></span>
              <span id="whizchat-status-text">מחובר</span>
            </div>
          </div>
          <button class="whizchat-close" id="whizchat-close-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <div class="whizchat-messages" id="whizchat-messages"></div>

        <div class="whizchat-faq" id="whizchat-faq" style="display: none;">
          <div class="whizchat-faq-title">שאלות נפוצות:</div>
          <div class="whizchat-faq-list" id="whizchat-faq-list"></div>
        </div>

        <div class="whizchat-input-area">
          <input type="file" id="whizchat-file-input" style="display: none;" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" />
          <button class="whizchat-attach" id="whizchat-attach" title="צרף קובץ">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <input type="text" class="whizchat-input" id="whizchat-input" placeholder="הקלד הודעה..." />
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

      div.innerHTML = content + '<div class="whizchat-message-time">' + formatTime(msg.createdAt) + '</div>';
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
      text.textContent = 'מחובר';
    } else {
      dot.classList.add('offline');
      text.textContent = 'לא מחובר';
    }
  }

  // Escape HTML
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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
        wpUserName: wpUserName
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
  }

  // Initialize
  function init() {
    createStyles();
    createWidget();
    bindEvents();
    console.log('WhizChat widget v' + WIDGET_VERSION + ' initialized');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
