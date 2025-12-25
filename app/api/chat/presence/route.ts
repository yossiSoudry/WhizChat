import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Customer heartbeat - call every 30 seconds when widget is open
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    // Update conversation with customer's last seen time
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastReadAtCustomer: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Customer presence update error:", error);
    return NextResponse.json(
      { error: "Failed to update presence" },
      { status: 500 }
    );
  }
}

// Check if customer is online (for agent dashboard)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { lastReadAtCustomer: true },
    });

    if (!conversation) {
      return NextResponse.json({ isOnline: false });
    }

    // Customer is considered online if last seen within 60 seconds
    const onlineThreshold = new Date(Date.now() - 60 * 1000);
    const isOnline = conversation.lastReadAtCustomer
      ? conversation.lastReadAtCustomer >= onlineThreshold
      : false;

    return NextResponse.json({ isOnline });
  } catch (error) {
    console.error("Customer presence check error:", error);
    return NextResponse.json(
      { error: "Failed to check presence" },
      { status: 500 }
    );
  }
}
