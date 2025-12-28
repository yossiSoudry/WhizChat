import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getMessagesSchema } from "@/lib/validations/chat";
import { corsResponse, handleOptions } from "@/lib/cors";

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const validatedData = getMessagesSchema.parse({
      conversationId: searchParams.get("conversationId"),
      after: searchParams.get("after") || undefined,
      limit: searchParams.get("limit") || 50,
    });

    const { conversationId, after, limit } = validatedData;

    // Check if request is from customer (widget) - if so, mark agent messages as delivered
    const viewerType = searchParams.get("viewerType"); // "customer" or "agent"

    // Verify conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return corsResponse(
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

    // Get messages with explicit field selection
    const messages = await prisma.message.findMany({
      where: whereClause,
      orderBy: { createdAt: "asc" },
      take: limit + 1, // Get one extra to check if there are more
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

    const hasMore = messages.length > limit;
    const returnMessages = hasMore ? messages.slice(0, -1) : messages;

    // Update message status (non-blocking - don't fail if this errors)
    try {
      if (viewerType === "customer") {
        // Mark agent messages as "delivered" when customer views
        await prisma.message.updateMany({
          where: {
            conversationId,
            senderType: "agent",
            status: "sent",
          },
          data: {
            status: "delivered",
          },
        });
      } else if (viewerType === "agent") {
        // Mark customer messages as "delivered" when agent views
        await prisma.message.updateMany({
          where: {
            conversationId,
            senderType: "customer",
            status: "sent",
          },
          data: {
            status: "delivered",
          },
        });
      }
    } catch (statusError) {
      // Log but don't fail the request - message retrieval is more important
      console.error("Failed to update message status:", statusError);
    }

    return corsResponse({
      messages: returnMessages,
      hasMore,
    });
  } catch (error) {
    console.error("Get messages error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return corsResponse(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    return corsResponse(
      { error: "Failed to get messages" },
      { status: 500 }
    );
  }
}
