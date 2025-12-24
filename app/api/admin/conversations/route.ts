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

    // Build where clause
    const whereClause: Prisma.ConversationWhereInput = {
      isArchived: archived,
    };

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { wpUserName: { contains: search, mode: "insensitive" } },
        { wpUserEmail: { contains: search, mode: "insensitive" } },
        { guestName: { contains: search, mode: "insensitive" } },
        { guestContact: { contains: search, mode: "insensitive" } },
        { lastMessagePreview: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get conversations with pagination
    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where: whereClause,
        orderBy: { lastMessageAt: "desc" },
        skip,
        take: limit,
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.conversation.count({ where: whereClause }),
    ]);

    // Format response
    const formattedConversations = conversations.map((conv) => ({
      id: conv.id,
      customerName:
        conv.wpUserName || conv.guestName || "Anonymous",
      customerEmail: conv.wpUserEmail || conv.guestContact || null,
      customerType: conv.wpUserId ? "wordpress" : "guest",
      status: conv.status,
      contactType: conv.contactType,
      unreadCount: conv.unreadCount,
      lastMessageAt: conv.lastMessageAt,
      lastMessagePreview: conv.lastMessagePreview,
      lastReadAtAgent: conv.lastReadAtAgent,
      movedToWhatsapp: conv.movedToWhatsapp,
      createdAt: conv.createdAt,
    }));

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
