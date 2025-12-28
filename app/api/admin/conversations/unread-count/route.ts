import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const onlineThreshold = new Date(Date.now() - 60 * 1000);

    // Get all non-archived conversations with messages for counting
    const conversations = await prisma.conversation.findMany({
      where: {
        isArchived: false,
        lastMessagePreview: { not: null },
      },
      select: {
        id: true,
        unreadCount: true,
        lastReadAtCustomer: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { senderType: true },
        },
      },
    });

    // Count unread (agent hasn't viewed - unreadCount > 0)
    const unreadCount = conversations.filter((c) => c.unreadCount > 0).length;

    // Count active (customer online in last 60 seconds)
    const activeCount = conversations.filter(
      (c) => c.lastReadAtCustomer && c.lastReadAtCustomer >= onlineThreshold
    ).length;

    // Count unanswered (last message is from customer AND agent has read it - unreadCount === 0)
    // This excludes unread messages to avoid overlap
    const unansweredCount = conversations.filter((c) => {
      const lastMessage = c.messages[0];
      return lastMessage && lastMessage.senderType === "customer" && c.unreadCount === 0;
    }).length;

    return NextResponse.json({
      unreadCount,
      activeCount,
      unansweredCount,
    });
  } catch (error) {
    console.error("Get counts error:", error);
    return NextResponse.json(
      { error: "Failed to get counts" },
      { status: 500 }
    );
  }
}
