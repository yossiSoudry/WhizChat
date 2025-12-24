import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { markReadSchema } from "@/lib/validations/chat";

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
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Update read timestamp
    const updateData: {
      lastReadAtCustomer?: Date;
      lastReadAtAgent?: Date;
      unreadCount?: number;
    } = {};

    if (readerType === "customer") {
      updateData.lastReadAtCustomer = new Date();
    } else {
      updateData.lastReadAtAgent = new Date();
      updateData.unreadCount = 0; // Reset unread count when agent reads
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark read error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to mark as read" },
      { status: 500 }
    );
  }
}
