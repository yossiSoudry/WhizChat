"use client";

import { useCallback, useEffect, useState } from "react";

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission | "default";
  isEnabled: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
  showNotification: (title: string, options?: NotificationOptions & { url?: string }) => void;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

const STORAGE_KEY = "whizchat-push-notifications";
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "default">("default");
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check subscription status
  const checkSubscription = useCallback(async () => {
    if (!("serviceWorker" in navigator)) {
      setIsLoading(false);
      return;
    }

    try {
      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Error checking subscription:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check support and load preferences on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initPushSupport = async () => {
      // Check basic support
      const hasNotification = "Notification" in window;
      const hasServiceWorker = "serviceWorker" in navigator;

      if (!hasNotification || !hasServiceWorker) {
        setIsSupported(false);
        setIsLoading(false);
        return;
      }

      // Register service worker first
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch (err) {
        console.error("Service Worker registration failed:", err);
      }

      // Wait for SW to be ready, then check PushManager
      try {
        const registration = await navigator.serviceWorker.ready;
        const hasPushManager = "pushManager" in registration;
        setIsSupported(hasPushManager);

        if (hasPushManager) {
          setPermission(Notification.permission);

          // Load enabled state from localStorage
          try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
              const prefs = JSON.parse(stored);
              setIsEnabled(prefs.enabled && Notification.permission === "granted");
            } else if (Notification.permission === "granted") {
              setIsEnabled(true);
            }
          } catch {
            // Ignore localStorage errors
          }

          // Check if already subscribed
          await checkSubscription();
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error initializing push support:", error);
        setIsSupported(false);
        setIsLoading(false);
      }
    };

    initPushSupport();
  }, [checkSubscription]);

  // Save enabled state to localStorage
  useEffect(() => {
    if (!isSupported) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: isEnabled }));
    } catch {
      // Ignore localStorage errors
    }
  }, [isEnabled, isSupported]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        setIsEnabled(true);
        return true;
      }

      setIsEnabled(false);
      return false;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, []);

  // Subscribe to push notifications (server-side)
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!VAPID_PUBLIC_KEY) {
      console.error("VAPID key missing");
      return false;
    }

    setIsLoading(true);

    try {
      // Ensure permission is granted
      if (Notification.permission !== "granted") {
        const granted = await requestPermission();
        if (!granted) {
          setIsLoading(false);
          return false;
        }
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();

      // If not subscribed, create new subscription
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      // Send subscription to server
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!response.ok) {
        throw new Error("Failed to save subscription to server");
      }

      setIsSubscribed(true);
      setIsEnabled(true);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error subscribing to push:", error);
      setIsLoading(false);
      return false;
    }
  }, [requestPermission]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();

        // Remove from server
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }

      setIsSubscribed(false);
      setIsEnabled(false);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error unsubscribing from push:", error);
      setIsLoading(false);
      return false;
    }
  }, []);

  const showNotification = useCallback(
    (title: string, options?: NotificationOptions & { url?: string }) => {
      if (!isSupported || !isEnabled || permission !== "granted") return;

      // Check if the page is visible - only show notification if tab is not active
      if (document.visibilityState === "visible") return;

      try {
        // Try to use service worker for better notification handling
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(title, {
              body: options?.body,
              icon: options?.icon || "/icons/icon-192x192.png",
              badge: options?.badge || "/icons/icon-192x192.png",
              tag: options?.tag || "whizchat-message",
              renotify: true,
              data: {
                url: options?.url || "/",
              },
            } as NotificationOptions);
          });
        } else {
          // Fallback to regular Notification API
          new Notification(title, {
            body: options?.body,
            icon: options?.icon || "/icons/icon-192x192.png",
            tag: options?.tag || "whizchat-message",
            ...options,
          });
        }
      } catch (error) {
        console.error("Error showing notification:", error);
      }
    },
    [isSupported, isEnabled, permission]
  );

  return {
    isSupported,
    permission,
    isEnabled,
    isSubscribed,
    isLoading,
    requestPermission,
    showNotification,
    subscribe,
    unsubscribe,
  };
}
