import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createServiceClient } from "@/lib/supabase/server";
import { updateConversationStatusSchema } from "@/lib/validations/admin";

// GET single conversation with all messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            content: true,
            senderType: true,
            senderName: true,
            source: true,
            createdAt: true,
            status: true,
            waStatus: true,
            waMessageId: true,
            messageType: true,
            fileUrl: true,
            fileName: true,
            fileSize: true,
            fileMimeType: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        customerName: conversation.wpUserName || conversation.guestName || "Anonymous",
        customerEmail: conversation.wpUserEmail || conversation.guestContact || null,
        customerType: conversation.wpUserId ? "wordpress" : "guest",
        contactType: conversation.contactType,
        status: conversation.status,
        isArchived: conversation.isArchived,
        unreadCount: conversation.unreadCount,
        lastReadAtCustomer: conversation.lastReadAtCustomer,
        lastReadAtAgent: conversation.lastReadAtAgent,
        movedToWhatsapp: conversation.movedToWhatsapp,
        waPhone: conversation.waPhone,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
      messages: conversation.messages,
    });
  } catch (error) {
    console.error("Get conversation error:", error);
    return NextResponse.json(
      { error: "Failed to get conversation" },
      { status: 500 }
    );
  }
}

// PATCH - Update conversation status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateConversationStatusSchema.parse(body);

    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: {
        status: validatedData.status,
      },
    });

    // If closing, add system message
    if (validatedData.status === "closed") {
      await prisma.message.create({
        data: {
          conversationId: id,
          content: "Conversation closed",
          senderType: "system",
          source: "dashboard",
        },
      });
    }

    return NextResponse.json({ success: true, conversation: updated });
  } catch (error) {
    console.error("Update conversation error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 }
    );
  }
}

// DELETE - Archive conversation and delete files from storage
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          where: {
            fileUrl: { not: null },
          },
          select: {
            id: true,
            fileUrl: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Delete files from Supabase Storage
    const filesWithUrls = conversation.messages.filter((m) => m.fileUrl);

    if (filesWithUrls.length > 0) {
      const supabase = createServiceClient();

      // Extract storage paths from URLs
      // URL format: https://xxx.supabase.co/storage/v1/object/public/chat-files/conversationId/timestamp-filename
      const storagePaths = filesWithUrls
        .map((m) => {
          if (!m.fileUrl) return null;
          const match = m.fileUrl.match(/\/chat-files\/(.+)$/);
          return match ? match[1] : null;
        })
        .filter((path): path is string => path !== null);

      if (storagePaths.length > 0) {
        const { error: deleteError } = await supabase.storage
          .from("chat-files")
          .remove(storagePaths);

        if (deleteError) {
          console.error("Failed to delete files from storage:", deleteError);
          // Continue anyway - mark as archived even if file deletion fails
        } else {
          console.log(`Deleted ${storagePaths.length} files from storage for conversation ${id}`);
        }
      }
    }

    // Clear file URLs from messages (set to null)
    await prisma.message.updateMany({
      where: {
        conversationId: id,
        fileUrl: { not: null },
      },
      data: {
        fileUrl: null,
      },
    });

    // Archive conversation
    await prisma.conversation.update({
      where: { id },
      data: {
        isArchived: true,
        status: "closed",
      },
    });

    return NextResponse.json({
      success: true,
      deletedFiles: filesWithUrls.length,
    });
  } catch (error) {
    console.error("Archive conversation error:", error);
    return NextResponse.json(
      { error: "Failed to archive conversation" },
      { status: 500 }
    );
  }
}
