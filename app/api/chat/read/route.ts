import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { markReadSchema } from "@/lib/validations/chat";
import { corsResponse, handleOptions } from "@/lib/cors";

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = markReadSchema.parse(body);

    const { conversationId, readerType } = validatedData;

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

    const now = new Date();

    if (readerType === "customer") {
      // Mark all agent messages as "read" by customer
      await prisma.message.updateMany({
        where: {
          conversationId,
          senderType: "agent",
          status: { in: ["sent", "delivered"] },
        },
        data: {
          status: "read",
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastReadAtCustomer: now },
      });
    } else {
      // Mark all customer messages as "read" by agent
      await prisma.message.updateMany({
        where: {
          conversationId,
          senderType: "customer",
          status: { in: ["sent", "delivered"] },
        },
        data: {
          status: "read",
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastReadAtAgent: now,
          unreadCount: 0,
        },
      });
    }

    return corsResponse({ success: true });
  } catch (error) {
    console.error("Mark read error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return corsResponse(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    return corsResponse(
      { error: "Failed to mark as read" },
      { status: 500 }
    );
  }
}
