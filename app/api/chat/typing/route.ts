import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { typingSchema } from "@/lib/validations/chat";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = typingSchema.parse(body);

    const { conversationId, isTyping } = validatedData;

    // Get user info from headers (set by Supabase auth)
    const userId = request.headers.get("x-user-id") || "anonymous";
    const userType = request.headers.get("x-user-type") as "customer" | "agent" || "customer";

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

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update typing status" },
      { status: 500 }
    );
  }
}
