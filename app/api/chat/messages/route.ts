import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getMessagesSchema } from "@/lib/validations/chat";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const validatedData = getMessagesSchema.parse({
      conversationId: searchParams.get("conversationId"),
      after: searchParams.get("after") || undefined,
      limit: searchParams.get("limit") || 50,
    });

    const { conversationId, after, limit } = validatedData;

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

    // Build query
    const whereClause: {
      conversationId: string;
      createdAt?: { gt: Date };
    } = {
      conversationId,
    };

    // If "after" is provided, get messages after that message's timestamp
    if (after) {
      const afterMessage = await prisma.message.findUnique({
        where: { id: after },
      });

      if (afterMessage) {
        whereClause.createdAt = { gt: afterMessage.createdAt };
      }
    }

    // Get messages
    const messages = await prisma.message.findMany({
      where: whereClause,
      orderBy: { createdAt: "asc" },
      take: limit + 1, // Get one extra to check if there are more
    });

    const hasMore = messages.length > limit;
    const returnMessages = hasMore ? messages.slice(0, -1) : messages;

    return NextResponse.json({
      messages: returnMessages,
      hasMore,
    });
  } catch (error) {
    console.error("Get messages error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to get messages" },
      { status: 500 }
    );
  }
}
