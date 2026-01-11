import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedAgent } from "@/lib/auth/get-agent";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // Find the message
    const message = await prisma.message.findUnique({
      where: { id },
      include: { conversation: true },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    // Only allow editing own messages (agent messages)
    if (message.senderType !== "agent" || message.senderId !== agent.id) {
      return NextResponse.json(
        { error: "You can only edit your own messages" },
        { status: 403 }
      );
    }

    // Only allow editing text messages
    if (message.messageType !== "text") {
      return NextResponse.json(
        { error: "Only text messages can be edited" },
        { status: 400 }
      );
    }

    // Update the message - reset status to "sent" so read receipts work again
    const updatedMessage = await prisma.message.update({
      where: { id },
      data: {
        content: content.trim(),
        isEdited: true,
        editedAt: new Date(),
        status: "sent", // Reset status so checkmarks update properly
      },
      select: {
        id: true,
        content: true,
        senderType: true,
        senderId: true,
        senderName: true,
        senderAvatar: true,
        source: true,
        createdAt: true,
        status: true,
        isEdited: true,
        editedAt: true,
        messageType: true,
        replyToId: true,
        replyToContent: true,
        replyToSender: true,
        replyToMessageType: true,
        replyToFileUrl: true,
      },
    });

    // Update conversation preview if this was the last message
    const lastMessage = await prisma.message.findFirst({
      where: { conversationId: message.conversationId },
      orderBy: { createdAt: "desc" },
    });

    if (lastMessage && lastMessage.id === id) {
      await prisma.conversation.update({
        where: { id: message.conversationId },
        data: {
          lastMessagePreview: content.trim().slice(0, 100),
        },
      });
    }

    return NextResponse.json({ message: updatedMessage });
  } catch (error) {
    console.error("Edit message error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to edit message";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
