import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { corsResponse, handleOptions } from "@/lib/cors";

export async function OPTIONS() {
  return handleOptions();
}

const introSchema = z.object({
  conversationId: z.string().uuid(),
  guestName: z.string().optional(),
  guestEmail: z.string().email().optional().or(z.literal("")),
  guestPhone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = introSchema.parse(body);

    const { conversationId, guestName, guestEmail, guestPhone } = validatedData;

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

    // Update conversation with guest info
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        ...(guestName && { guestName }),
        ...(guestEmail && { guestEmail }),
        ...(guestPhone && { guestPhone }),
      },
    });

    // Create system message if name was provided
    if (guestName) {
      await prisma.message.create({
        data: {
          conversationId,
          content: `Guest introduced as: ${guestName}${guestEmail ? ` (${guestEmail})` : ""}${guestPhone ? ` - ${guestPhone}` : ""}`,
          senderType: "system",
          source: "widget",
        },
      });
    }

    return corsResponse({
      success: true,
      conversation: {
        id: updatedConversation.id,
        guestName: updatedConversation.guestName,
        guestEmail: updatedConversation.guestEmail,
        guestPhone: updatedConversation.guestPhone,
      },
    });
  } catch (error) {
    console.error("Intro submit error:", error);

    if (error instanceof z.ZodError) {
      return corsResponse(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return corsResponse(
      { error: "Failed to save intro info" },
      { status: 500 }
    );
  }
}
