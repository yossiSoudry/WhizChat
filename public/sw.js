const CACHE_NAME = 'whizchat-v2';
const urlsToCache = [
  '/',
  '/manifest.json',
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response
        const responseClone = response.clone();
        caches.open(CACHE_NAME)
          .then((cache) => {
            // Only cache GET requests
            if (event.request.method === 'GET') {
              cache.put(event.request, responseClone);
            }
          });
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Push received:', event);

  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch (e) {
    data = {
      title: 'WhizChat',
      body: event.data?.text() || 'הודעה חדשה',
    };
  }

  const title = data.title || 'WhizChat';
  const options = {
    body: data.body || 'הודעה חדשה',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'whizchat-message',
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/',
      conversationId: data.conversationId,
    },
    actions: [
      {
        action: 'open',
        title: 'פתח שיחה',
      },
      {
        action: 'close',
        title: 'סגור',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Open or focus the app
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if app is already open
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin)) {
            // Focus existing window and navigate
            client.focus();
            client.navigate(urlToOpen);
            return;
          }
        }
        // Open new window
        return clients.openWindow(urlToOpen);
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
});
