import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Agent, AgentRole } from "@prisma/client";

export type AuthenticatedAgent = {
  id: string;
  authUserId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: AgentRole;
  isActive: boolean;
  isOnline: boolean;
};

export type AuthResult =
  | { success: true; agent: AuthenticatedAgent }
  | { success: false; error: string; status: 401 | 403 };

/**
 * Get the authenticated agent from the current session.
 * Use this in API routes and server components to verify authentication.
 */
export async function getAuthenticatedAgent(): Promise<AuthResult> {
  try {
    const supabase = await createClient();

    // Get the current session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
        status: 401,
      };
    }

    // Find the agent in our database
    const agent = await prisma.agent.findUnique({
      where: { authUserId: user.id },
      select: {
        id: true,
        authUserId: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        isOnline: true,
      },
    });

    if (!agent) {
      return {
        success: false,
        error: "User is not an agent",
        status: 403,
      };
    }

    if (!agent.isActive) {
      return {
        success: false,
        error: "Agent account is deactivated",
        status: 403,
      };
    }

    return {
      success: true,
      agent,
    };
  } catch (error) {
    console.error("Auth error:", error);
    return {
      success: false,
      error: "Authentication failed",
      status: 401,
    };
  }
}

/**
 * Helper to check if agent has admin role
 */
export function isAdmin(agent: AuthenticatedAgent): boolean {
  return agent.role === "admin";
}

/**
 * Require authentication and return agent or throw response
 * Use in API routes for cleaner code
 */
export async function requireAgent(): Promise<AuthenticatedAgent> {
  const result = await getAuthenticatedAgent();

  if (!result.success) {
    throw new Response(JSON.stringify({ error: result.error }), {
      status: result.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return result.agent;
}

/**
 * Require admin role
 */
export async function requireAdmin(): Promise<AuthenticatedAgent> {
  const agent = await requireAgent();

  if (!isAdmin(agent)) {
    throw new Response(JSON.stringify({ error: "Admin access required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return agent;
}
