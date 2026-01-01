"use client";

import { useRef, useCallback, useEffect, useState } from "react";

interface UseNotificationSoundOptions {
  enabled?: boolean;
  volume?: number;
}

interface UseNotificationSoundReturn {
  play: () => void;
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
  volume: number;
  setVolume: (volume: number) => void;
  testSound: () => void;
}

const STORAGE_KEY = "whizchat-notification-sound";

// Create a pleasant notification sound using Web Audio API
function createNotificationSound(audioContext: AudioContext, volume: number): void {
  const now = audioContext.currentTime;

  // Create a pleasant two-tone notification (like iMessage)
  const frequencies = [880, 1318.5]; // A5 and E6 - pleasant fifth interval

  frequencies.forEach((freq, index) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(freq, now);

    // Volume envelope - quick attack, medium decay
    const startTime = now + index * 0.12;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume * 0.4, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

    oscillator.start(startTime);
    oscillator.stop(startTime + 0.5);
  });
}

export function useNotificationSound(
  options: UseNotificationSoundOptions = {}
): UseNotificationSoundReturn {
  const { enabled: initialEnabled = true, volume: initialVolume = 0.5 } = options;

  const audioContextRef = useRef<AudioContext | null>(null);
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [volume, setVolume] = useState(initialVolume);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const prefs = JSON.parse(stored);
        if (typeof prefs.enabled === "boolean") {
          setIsEnabled(prefs.enabled);
        }
        if (typeof prefs.volume === "number") {
          setVolume(prefs.volume);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: isEnabled, volume }));
    } catch {
      // Ignore localStorage errors
    }
  }, [isEnabled, volume]);

  // Initialize AudioContext lazily (needs user interaction in most browsers)
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current && typeof window !== "undefined") {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  const play = useCallback(() => {
    console.log("[Sound] play called, isEnabled:", isEnabled);
    if (!isEnabled) return;

    try {
      const audioContext = getAudioContext();
      console.log("[Sound] audioContext:", audioContext?.state);
      if (!audioContext) return;

      // Resume AudioContext if it's suspended (browsers require user interaction)
      if (audioContext.state === "suspended") {
        console.log("[Sound] Resuming suspended AudioContext...");
        audioContext.resume().then(() => {
          console.log("[Sound] AudioContext resumed, playing sound");
          createNotificationSound(audioContext, volume);
        });
      } else {
        console.log("[Sound] Playing sound directly");
        createNotificationSound(audioContext, volume);
      }
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  }, [isEnabled, volume, getAudioContext]);

  // Test sound (always plays, ignores isEnabled - for testing the button)
  const testSound = useCallback(() => {
    try {
      const audioContext = getAudioContext();
      if (!audioContext) return;

      if (audioContext.state === "suspended") {
        audioContext.resume().then(() => {
          createNotificationSound(audioContext, volume);
        });
      } else {
        createNotificationSound(audioContext, volume);
      }
    } catch (error) {
      console.error("Error playing test sound:", error);
    }
  }, [volume, getAudioContext]);

  const handleSetEnabled = useCallback((value: boolean) => {
    setIsEnabled(value);
  }, []);

  const handleSetVolume = useCallback((value: number) => {
    setVolume(Math.max(0, Math.min(1, value)));
  }, []);

  return {
    play,
    isEnabled,
    setEnabled: handleSetEnabled,
    volume,
    setVolume: handleSetVolume,
    testSound,
  };
}
