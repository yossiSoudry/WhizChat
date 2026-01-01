import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendMessageSchema } from "@/lib/validations/chat";
import { corsResponse, handleOptions } from "@/lib/cors";
import { notifyAgentsOnNewMessage } from "@/lib/notifications/whatsapp-notifications";

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = sendMessageSchema.parse(body);

    const { conversationId, content, clientMessageId, senderName } = validatedData;

    // Check for duplicate message (idempotency)
    const existingMessage = await prisma.message.findFirst({
      where: {
        conversationId,
        clientMessageId,
      },
    });

    if (existingMessage) {
      return corsResponse({
        message: existingMessage,
        deduplicated: true,
        waSent: false,
      });
    }

    // Verify conversation exists and is not archived
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return corsResponse(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // If conversation is archived, unarchive it when customer sends a new message
    if (conversation.isArchived) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          isArchived: false,
          status: "active",
        },
      });
    }

    // Create message with explicit status
    const message = await prisma.message.create({
      data: {
        conversationId,
        content,
        clientMessageId,
        senderType: "customer",
        senderId: conversation.wpUserId?.toString() || conversation.anonUserId || null,
        senderName: senderName || conversation.wpUserName || conversation.guestName || "Guest",
        source: "widget",
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

    // Update conversation metadata
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: content.slice(0, 100),
        unreadCount: { increment: 1 },
        status: "active",
      },
    });

    // Send WhatsApp notifications to agents (non-blocking)
    const customerName = senderName || conversation.wpUserName || conversation.guestName || "לקוח";
    notifyAgentsOnNewMessage({
      conversationId,
      customerName,
      messagePreview: content,
    }).catch((error) => {
      console.error("Failed to send agent notifications:", error);
    });

    return corsResponse({
      message,
      deduplicated: false,
      waSent: false,
    });
  } catch (error) {
    console.error("Send message error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return corsResponse(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    return corsResponse(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
