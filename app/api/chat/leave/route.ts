import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { corsResponse, handleOptions } from "@/lib/cors";

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request: NextRequest) {
  try {
    // Handle both JSON and text/plain (sendBeacon sends as text/plain by default)
    let body;
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const text = await request.text();
      body = JSON.parse(text);
    }
    const { conversationId } = body;

    if (!conversationId) {
      return corsResponse(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

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

    // Get customer name
    const customerName = conversation.wpUserName || conversation.guestName || "לקוח";

    // Create system message about customer leaving
    await prisma.message.create({
      data: {
        conversationId,
        content: `${customerName} עזב/ה את הצ'אט`,
        senderType: "system",
        source: "widget",
        status: "sent",
      },
    });

    // Update conversation last message
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: `${customerName} עזב/ה את הצ'אט`,
      },
    });

    return corsResponse({ success: true });
  } catch (error) {
    console.error("Leave notification error:", error);
    return corsResponse(
      { error: "Failed to send leave notification" },
      { status: 500 }
    );
  }
}
