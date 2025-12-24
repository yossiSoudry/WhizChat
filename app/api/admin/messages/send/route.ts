import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendAgentMessageSchema } from "@/lib/validations/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = sendAgentMessageSchema.parse(body);

    const { conversationId, content, agentId } = validatedData;

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

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || !agent.isActive) {
      return NextResponse.json(
        { error: "Agent not found or inactive" },
        { status: 404 }
      );
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId,
        content,
        senderType: "agent",
        senderId: agentId,
        senderName: agent.name,
        source: "dashboard",
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

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
