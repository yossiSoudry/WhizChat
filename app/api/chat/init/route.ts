import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { chatInitSchema } from "@/lib/validations/chat";
import { isWithinBusinessHours } from "@/lib/business-hours";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = chatInitSchema.parse(body);

    const { wpUserId, wpUserEmail, wpUserName, anonUserId } = validatedData;

    // Find or create conversation
    let conversation = null;

    // First, try to find existing conversation
    if (wpUserId) {
      conversation = await prisma.conversation.findFirst({
        where: { wpUserId, isArchived: false },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 50,
            select: {
              id: true,
              content: true,
              senderType: true,
              senderName: true,
              source: true,
              createdAt: true,
              status: true,
            },
          },
        },
      });
    } else if (anonUserId) {
      conversation = await prisma.conversation.findFirst({
        where: { anonUserId, isArchived: false },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 50,
            select: {
              id: true,
              content: true,
              senderType: true,
              senderName: true,
              source: true,
              createdAt: true,
              status: true,
            },
          },
        },
      });
    }

    // Create new conversation if not found
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          wpUserId: wpUserId || null,
          wpUserEmail: wpUserEmail || null,
          wpUserName: wpUserName || null,
          anonUserId: anonUserId || null,
          status: "active",
        },
        include: {
          messages: true,
        },
      });
    }

    // Get settings
    const [messagesSettings, widgetSettings] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "messages" } }),
      prisma.setting.findUnique({ where: { key: "widget" } }),
    ]);

    // Get FAQ items
    const faqItems = await prisma.fAQItem.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });

    // Check if any agent is online (connected in the last 60 seconds)
    const onlineThreshold = new Date(Date.now() - 60 * 1000);
    const onlineAgent = await prisma.agent.findFirst({
      where: {
        isActive: true,
        isOnline: true,
        lastSeenAt: {
          gte: onlineThreshold,
        },
      },
      select: { id: true },
    });

    // Check business hours
    const businessHoursSettings = await prisma.setting.findUnique({
      where: { key: "business_hours" }
    });

    let withinBusinessHours = true; // Default to true if no settings
    if (businessHoursSettings?.value) {
      const bhSettings = businessHoursSettings.value as { timezone: string; schedule: Record<string, { start: string; end: string } | null> };
      withinBusinessHours = isWithinBusinessHours(bhSettings);
      console.log("Business hours check:", {
        timezone: bhSettings.timezone,
        withinBusinessHours,
        currentTime: new Date().toISOString(),
      });
    }

    console.log("Online status:", {
      hasOnlineAgent: !!onlineAgent,
      withinBusinessHours,
      finalIsOnline: !!onlineAgent && withinBusinessHours,
    });

    const isOnline = !!onlineAgent && withinBusinessHours;

    const messages = messagesSettings?.value as {
      welcome: string;
      offline: string;
    } | null;

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        status: conversation.status,
        createdAt: conversation.createdAt,
        lastMessageAt: conversation.lastMessageAt,
        unreadCount: conversation.unreadCount,
        contactType: conversation.contactType,
        guestName: conversation.guestName,
        guestContact: conversation.guestContact,
      },
      messages: conversation.messages,
      settings: {
        isOnline,
        welcomeMessage: isOnline
          ? messages?.welcome || "Hello! How may I assist you today?"
          : messages?.offline ||
            "We are currently unavailable. Please leave a message and we will respond as soon as possible.",
        faqItems: faqItems.map((f) => ({
          id: f.id,
          question: f.question,
          answer: f.answer,
        })),
        widget: widgetSettings?.value || {
          position: "right",
          primaryColor: "#C026D3",
        },
      },
    });
  } catch (error) {
    console.error("Chat init error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to initialize chat" },
      { status: 500 }
    );
  }
}
