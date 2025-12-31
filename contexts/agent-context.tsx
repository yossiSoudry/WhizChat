"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { AgentRole } from "@prisma/client";

export interface Agent {
  id: string;
  authUserId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: AgentRole;
  isActive: boolean;
  isOnline: boolean;
}

interface AgentContextType {
  agent: Agent | null;
  isLoading: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
  refreshAgent: () => Promise<void>;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

interface AgentProviderProps {
  children: ReactNode;
  initialAgent: Agent | null;
}

export function AgentProvider({ children, initialAgent }: AgentProviderProps) {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(initialAgent);
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const isAdmin = agent?.role === "admin";

  const refreshAgent = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        setAgent(data.agent);
      } else {
        setAgent(null);
      }
    } catch (error) {
      console.error("Failed to refresh agent:", error);
      setAgent(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setAgent(null);
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, [supabase, router]);

  // Listen for auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setAgent(null);
        router.push("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  return (
    <AgentContext.Provider
      value={{
        agent,
        isLoading,
        isAdmin,
        logout,
        refreshAgent,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error("useAgent must be used within an AgentProvider");
  }
  return context;
}
