"use client";

import { useCallback, useEffect, useState } from "react";

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission | "default";
  isEnabled: boolean;
  requestPermission: () => Promise<boolean>;
  showNotification: (title: string, options?: NotificationOptions & { url?: string }) => void;
}

const STORAGE_KEY = "whizchat-push-notifications";

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "default">("default");
  const [isEnabled, setIsEnabled] = useState(false);

  // Check support and load preferences on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if notifications are supported
    const supported = "Notification" in window && "serviceWorker" in navigator;
    setIsSupported(supported);

    if (supported) {
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
    }
  }, []);

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
    if (!isSupported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        setIsEnabled(true);

        // Register service worker if not already registered
        if ("serviceWorker" in navigator) {
          try {
            await navigator.serviceWorker.register("/sw.js");
          } catch (err) {
            console.error("Service Worker registration failed:", err);
          }
        }

        return true;
      }

      setIsEnabled(false);
      return false;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [isSupported]);

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
    requestPermission,
    showNotification,
  };
}
