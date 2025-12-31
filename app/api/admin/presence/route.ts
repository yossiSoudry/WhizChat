import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedAgent } from "@/lib/auth/get-agent";

// Agent heartbeat - call every 30 seconds to maintain online status
export async function POST() {
  try {
    const authResult = await getAuthenticatedAgent();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    await prisma.agent.update({
      where: { id: authResult.agent.id },
      data: {
        isOnline: true,
        lastSeenAt: new Date(),
      },
    });

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
export async function DELETE() {
  try {
    const authResult = await getAuthenticatedAgent();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    await prisma.agent.update({
      where: { id: authResult.agent.id },
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
