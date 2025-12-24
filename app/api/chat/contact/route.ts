import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { setContactSchema } from "@/lib/validations/chat";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = setContactSchema.parse(body);

    const { conversationId, contactType, contactValue, name } = validatedData;

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

    // Update conversation with contact info
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        contactType,
        guestContact: contactValue,
        guestName: name || conversation.guestName,
        // If WhatsApp, store phone for future routing
        waPhone: contactType === "whatsapp" ? contactValue : conversation.waPhone,
      },
    });

    // Create system message
    await prisma.message.create({
      data: {
        conversationId,
        content: `Contact info saved: ${contactType === "email" ? "📧" : "📱"} ${contactValue}`,
        senderType: "system",
        source: "widget",
      },
    });

    return NextResponse.json({
      success: true,
      conversation: {
        id: updatedConversation.id,
        contactType: updatedConversation.contactType,
        guestContact: updatedConversation.guestContact,
        guestName: updatedConversation.guestName,
      },
    });
  } catch (error) {
    console.error("Set contact error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to set contact info" },
      { status: 500 }
    );
  }
}
