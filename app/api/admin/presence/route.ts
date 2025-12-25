import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Agent heartbeat - call every 30 seconds to maintain online status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      );
    }

    // Try to update existing agent, or create a temporary one for dev
    const existingAgent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (existingAgent) {
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          isOnline: true,
          lastSeenAt: new Date(),
        },
      });
    } else if (agentId === "temp-agent-id") {
      // Create a dev agent if it doesn't exist
      await prisma.agent.upsert({
        where: { id: agentId },
        update: {
          isOnline: true,
          lastSeenAt: new Date(),
        },
        create: {
          id: agentId,
          authUserId: "dev-auth-user",
          email: "dev@whizchat.local",
          name: "נציג WhizChat",
          isOnline: true,
          lastSeenAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Presence update error:", error);
    return NextResponse.json(
      { error: "Failed to update presence" },
      { status: 500 }
    );
  }
}

// Check if any agent is online
export async function GET() {
  try {
    // Consider agent online if last seen within 60 seconds
    const onlineThreshold = new Date(Date.now() - 60 * 1000);

    const onlineAgent = await prisma.agent.findFirst({
      where: {
        isActive: true,
        isOnline: true,
        lastSeenAt: {
          gte: onlineThreshold,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    return NextResponse.json({
      isOnline: !!onlineAgent,
      agentName: onlineAgent?.name || null,
    });
  } catch (error) {
    console.error("Presence check error:", error);
    return NextResponse.json(
      { error: "Failed to check presence" },
      { status: 500 }
    );
  }
}

// Mark agent as offline (call on logout/page unload)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");

    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      );
    }

    await prisma.agent.update({
      where: { id: agentId },
      data: {
        isOnline: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Presence offline error:", error);
    return NextResponse.json(
      { error: "Failed to update presence" },
      { status: 500 }
    );
  }
}
