import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Check if other party is typing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");
    const userType = searchParams.get("userType") || "customer";

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    // Find typing indicator from the OTHER party
    const otherUserType = userType === "customer" ? "agent" : "customer";

    const typingIndicator = await prisma.typingIndicator.findFirst({
      where: {
        conversationId,
        userType: otherUserType,
        isTyping: true,
        // Only consider recent typing (within last 5 seconds)
        updatedAt: {
          gte: new Date(Date.now() - 5000),
        },
      },
    });

    return NextResponse.json({
      isTyping: !!typingIndicator,
    });
  } catch (error) {
    console.error("Get typing status error:", error);
    return NextResponse.json(
      { error: "Failed to get typing status" },
      { status: 500 }
    );
  }
}

// POST - Update typing status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, isTyping, userType = "customer", userId = "anonymous" } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    // Verify conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Upsert typing indicator
    await prisma.typingIndicator.upsert({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      update: {
        isTyping,
        updatedAt: new Date(),
      },
      create: {
        conversationId,
        userId,
        userType,
        isTyping,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Typing indicator error:", error);
    return NextResponse.json(
      { error: "Failed to update typing status" },
      { status: 500 }
    );
  }
}
