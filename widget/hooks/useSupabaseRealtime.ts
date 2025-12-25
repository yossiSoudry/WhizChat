"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createClient, SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import type { Message } from "../types";

interface UseSupabaseRealtimeProps {
  supabaseUrl: string;
  supabaseAnonKey: string;
  conversationId: string | null;
  onNewMessage: (message: Message) => void;
  onTypingChange?: (isTyping: boolean, userName: string) => void;
  onReadReceipt?: (timestamp: string) => void;
}

interface TypingUser {
  id: string;
  name: string;
  type: "customer" | "agent";
  is_typing: boolean;
}

export function useSupabaseRealtime({
  supabaseUrl,
  supabaseAnonKey,
  conversationId,
  onNewMessage,
  onTypingChange,
  onReadReceipt,
}: UseSupabaseRealtimeProps) {
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const messagesChannelRef = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [anonUserId, setAnonUserId] = useState<string | null>(null);

  // Initialize Supabase client
  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) return;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: "whizchat-auth",
      },
    });

    supabaseRef.current = supabase;

    // Initialize anonymous auth
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) {
            console.error("Failed to create anonymous session:", error);
            return;
          }
          setAnonUserId(data.user?.id || null);
        } else {
          setAnonUserId(session.user?.id || null);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };

    initAuth();

    return () => {
      // Cleanup on unmount
      if (messagesChannelRef.current) {
        supabase.removeChannel(messagesChannelRef.current);
      }
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
      }
    };
  }, [supabaseUrl, supabaseAnonKey]);

  // Subscribe to messages when conversation changes
  useEffect(() => {
    if (!supabaseRef.current || !conversationId) return;

    const supabase = supabaseRef.current;

    // Cleanup previous subscriptions
    if (messagesChannelRef.current) {
      supabase.removeChannel(messagesChannelRef.current);
    }

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = payload.new as Message & { conversation_id: string; sender_type: string; sender_name: string; created_at: string };
          // Transform to camelCase
          const transformedMessage: Message = {
            id: message.id,
            content: message.content,
            senderType: message.sender_type as Message["senderType"],
            senderName: message.sender_name,
            source: message.source as Message["source"],
            createdAt: message.created_at,
          };
          // Only show messages not sent by customer (to avoid duplicates)
          if (transformedMessage.senderType !== "customer") {
            onNewMessage(transformedMessage);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          const newData = payload.new as { last_read_at_agent?: string };
          if (newData.last_read_at_agent && onReadReceipt) {
            onReadReceipt(newData.last_read_at_agent);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    messagesChannelRef.current = messagesChannel;

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [conversationId, onNewMessage, onReadReceipt]);

  // Subscribe to typing presence
  useEffect(() => {
    if (!supabaseRef.current || !conversationId || !onTypingChange) return;

    const supabase = supabaseRef.current;

    // Cleanup previous presence subscription
    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
    }

    const presenceChannel = supabase.channel(`presence:${conversationId}`, {
      config: {
        presence: {
          key: "typing",
        },
      },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const allUsers = Object.values(state).flat() as unknown[];
        const typingAgents = allUsers.filter((u) => {
          const user = u as TypingUser;
          return user.type === "agent" && user.is_typing;
        }) as TypingUser[];

        if (typingAgents.length > 0) {
          onTypingChange(true, typingAgents[0].name);
        } else {
          onTypingChange(false, "");
        }
      })
      .subscribe();

    presenceChannelRef.current = presenceChannel;

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [conversationId, onTypingChange]);

  // Send typing indicator
  const setTyping = useCallback(
    async (isTyping: boolean) => {
      if (!presenceChannelRef.current || !anonUserId) return;

      try {
        await presenceChannelRef.current.track({
          id: anonUserId,
          type: "customer",
          is_typing: isTyping,
        });
      } catch (error) {
        // Silent fail for typing
      }
    },
    [anonUserId]
  );

  return {
    isConnected,
    anonUserId,
    setTyping,
    supabase: supabaseRef.current,
  };
}
