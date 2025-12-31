import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedAgent } from "@/lib/auth/get-agent";

export async function POST(request: NextRequest) {
  try {
    // Get authenticated agent
    const authResult = await getAuthenticatedAgent();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const agent = authResult.agent;

    const body = await request.json();
    const { conversationId, content } = body;

    if (!conversationId || !content) {
      return NextResponse.json(
        { error: "conversationId and content are required" },
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

    // Create message with explicit status
    const message = await prisma.message.create({
      data: {
        conversationId,
        content,
        senderType: "agent",
        senderId: agent.id,
        senderName: agent.name,
        source: "dashboard",
        status: "sent",
      },
      select: {
        id: true,
        content: true,
        senderType: true,
        senderName: true,
        source: true,
        createdAt: true,
        status: true,
      },
    });

    // Update conversation
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: content.slice(0, 100),
        status: "active",
        // Reset unread count since agent is responding
        unreadCount: 0,
        lastReadAtAgent: new Date(),
      },
    });

    // TODO: Send to WhatsApp if conversation moved to WhatsApp
    let waSent = false;

    return NextResponse.json({
      message,
      waSent,
    });
  } catch (error) {
    console.error("Send agent message error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
