import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendMessageSchema } from "@/lib/validations/chat";

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
      return NextResponse.json({
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
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (conversation.isArchived) {
      return NextResponse.json(
        { error: "Conversation is archived" },
        { status: 400 }
      );
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId,
        content,
        clientMessageId,
        senderType: "customer",
        senderId: conversation.wpUserId?.toString() || conversation.anonUserId || null,
        senderName: senderName || conversation.wpUserName || conversation.guestName || "Guest",
        source: "widget",
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

    // TODO: Send to WhatsApp Business via Green API
    let waSent = false;
    // if (process.env.GREEN_API_INSTANCE_ID && process.env.GREEN_API_TOKEN) {
    //   waSent = await sendToWhatsAppBusiness(conversation, message);
    // }

    return NextResponse.json({
      message,
      deduplicated: false,
      waSent,
    });
  } catch (error) {
    console.error("Send message error:", error);

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
