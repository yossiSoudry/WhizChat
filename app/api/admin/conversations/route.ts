import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getConversationsSchema } from "@/lib/validations/admin";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    // TODO: Add auth check for agent

    const { searchParams } = new URL(request.url);

    const validatedData = getConversationsSchema.parse({
      status: searchParams.get("status") || undefined,
      archived: searchParams.get("archived") || false,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
    });

    const { status, archived, search, page, limit } = validatedData;
    const skip = (page - 1) * limit;

    // Get filter type from query
    const filter = searchParams.get("filter"); // "all" | "active" | "unanswered" | "unread"

    // Build where clause
    const whereClause: Prisma.ConversationWhereInput = {
      isArchived: archived,
      // Only show conversations that have at least one message
      lastMessagePreview: { not: null },
    };

    if (status) {
      whereClause.status = status;
    }

    // Apply basic filters (not unanswered - that needs post-processing)
    if (filter === "active") {
      // Active = customer is online (seen in last 60 seconds)
      const onlineThreshold = new Date(Date.now() - 60 * 1000);
      whereClause.lastReadAtCustomer = { gte: onlineThreshold };
    } else if (filter === "unread") {
      // Unread = agent hasn't viewed yet (unreadCount > 0)
      whereClause.unreadCount = { gt: 0 };
    }
    // Note: "unanswered" filter is applied after fetching since we need to check last message

    if (search) {
      whereClause.OR = [
        { wpUserName: { contains: search, mode: "insensitive" } },
        { wpUserEmail: { contains: search, mode: "insensitive" } },
        { guestName: { contains: search, mode: "insensitive" } },
        { guestContact: { contains: search, mode: "insensitive" } },
        { lastMessagePreview: { contains: search, mode: "insensitive" } },
        // Search in all messages content
        {
          messages: {
            some: {
              content: { contains: search, mode: "insensitive" },
            },
          },
        },
      ];
    }

    // For unanswered filter, we need to get all and filter
    const fetchLimit = filter === "unanswered" ? 200 : limit;
    const fetchSkip = filter === "unanswered" ? 0 : skip;

    // Get conversations with pagination
    let [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where: whereClause,
        orderBy: { lastMessageAt: "desc" },
        skip: fetchSkip,
        take: fetchLimit,
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              senderType: true,
              status: true,
            },
          },
        },
      }),
      prisma.conversation.count({ where: whereClause }),
    ]);

    // Apply unanswered filter (last message is from customer AND agent has read it)
    // This excludes unread messages to avoid overlap with "unread" filter
    if (filter === "unanswered") {
      conversations = conversations.filter((conv) => {
        const lastMessage = conv.messages[0];
        return lastMessage && lastMessage.senderType === "customer" && conv.unreadCount === 0;
      });
      total = conversations.length;
      // Apply pagination after filtering
      conversations = conversations.slice(skip, skip + limit);
    }

    // Calculate online threshold (60 seconds)
    const onlineThreshold = new Date(Date.now() - 60 * 1000);

    // Format response
    const formattedConversations = conversations.map((conv) => {
      const lastMessage = conv.messages[0];
      return {
        id: conv.id,
        customerName:
          conv.wpUserName || conv.guestName || "Anonymous",
        customerEmail: conv.wpUserEmail || conv.guestContact || null,
        customerAvatar: conv.wpUserAvatar || null,
        customerType: conv.wpUserId ? "wordpress" : "guest",
        status: conv.status,
        contactType: conv.contactType,
        unreadCount: conv.unreadCount,
        lastMessageAt: conv.lastMessageAt,
        lastMessagePreview: conv.lastMessagePreview,
        lastMessageSenderType: lastMessage?.senderType || null,
        lastMessageStatus: lastMessage?.status || null,
        lastReadAtAgent: conv.lastReadAtAgent,
        movedToWhatsapp: conv.movedToWhatsapp,
        createdAt: conv.createdAt,
        isCustomerOnline: conv.lastReadAtCustomer ? conv.lastReadAtCustomer >= onlineThreshold : false,
      };
    });

    return NextResponse.json({
      conversations: formattedConversations,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get conversations error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to get conversations" },
      { status: 500 }
    );
  }
}
