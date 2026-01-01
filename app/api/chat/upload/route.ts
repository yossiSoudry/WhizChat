import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createServiceClient } from "@/lib/supabase/server";
import { corsResponse, handleOptions } from "@/lib/cors";
import { notifyAgentsOnNewMessage } from "@/lib/notifications/whatsapp-notifications";
import { MessageType } from "@prisma/client";

// CORS preflight
export async function OPTIONS() {
  return handleOptions();
}

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types with their message types
const ALLOWED_TYPES: Record<string, MessageType> = {
  // Images
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "image/svg+xml": "image",
  // Documents
  "application/pdf": "file",
  "application/msword": "file",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "file",
  "application/vnd.ms-excel": "file",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "file",
  "application/vnd.ms-powerpoint": "file",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "file",
  "text/plain": "file",
  "text/csv": "file",
  "application/json": "file",
  "application/zip": "file",
  "application/x-rar-compressed": "file",
  // Audio
  "audio/mpeg": "audio",
  "audio/wav": "audio",
  "audio/ogg": "audio",
  "audio/webm": "audio",
  // Video
  "video/mp4": "video",
  "video/webm": "video",
  "video/quicktime": "video",
};

function getMessageType(mimeType: string): MessageType {
  return ALLOWED_TYPES[mimeType] || "file";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// POST - Upload file and create message
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const conversationId = formData.get("conversationId") as string | null;
    const clientMessageId = formData.get("clientMessageId") as string | null;
    const senderType = (formData.get("senderType") as string) || "customer";
    const senderName = formData.get("senderName") as string | null;

    // Validate required fields
    if (!file) {
      return corsResponse({ error: "No file provided" }, { status: 400 });
    }

    if (!conversationId) {
      return corsResponse({ error: "Conversation ID is required" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES[file.type]) {
      return corsResponse(
        { error: `File type not allowed: ${file.type}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return corsResponse(
        { error: `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}` },
        { status: 400 }
      );
    }

    // Check for duplicate message (idempotency)
    if (clientMessageId) {
      const existingMessage = await prisma.message.findFirst({
        where: {
          conversationId,
          clientMessageId,
        },
      });

      if (existingMessage) {
        return corsResponse({
          message: existingMessage,
          deduplicated: true,
        });
      }
    }

    // Verify conversation exists and is not archived
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return corsResponse({ error: "Conversation not found" }, { status: 404 });
    }

    // If conversation is archived, unarchive it when customer sends a new message
    if (conversation.isArchived) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          isArchived: false,
          status: "active",
        },
      });
    }

    // Upload file to Supabase Storage
    const supabase = createServiceClient();

    // Generate unique filename: conversationId/timestamp-originalName
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `${conversationId}/${timestamp}-${safeFileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("chat-files")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return corsResponse(
        { error: "Failed to upload file: " + uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("chat-files")
      .getPublicUrl(uploadData.path);

    const fileUrl = urlData.publicUrl;
    const messageType = getMessageType(file.type);

    // Create message with file info
    const message = await prisma.message.create({
      data: {
        conversationId,
        clientMessageId: clientMessageId || undefined,
        content: file.name, // Use filename as content for display
        messageType,
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        fileMimeType: file.type,
        senderType: senderType as "customer" | "agent" | "system" | "bot",
        senderId: conversation.wpUserId?.toString() || conversation.anonUserId || null,
        senderName: senderName || conversation.wpUserName || conversation.guestName || "Guest",
        source: "widget",
        status: "sent",
      },
      select: {
        id: true,
        content: true,
        messageType: true,
        fileUrl: true,
        fileName: true,
        fileSize: true,
        fileMimeType: true,
        senderType: true,
        senderName: true,
        source: true,
        createdAt: true,
        status: true,
      },
    });

    // Update conversation metadata
    const preview = messageType === "image"
      ? "📷 תמונה"
      : messageType === "audio"
      ? "🎵 הודעה קולית"
      : messageType === "video"
      ? "🎬 וידאו"
      : `📎 ${file.name}`;

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: preview.slice(0, 100),
        unreadCount: { increment: 1 },
        status: "active",
      },
    });

    // Send WhatsApp notifications to agents (non-blocking)
    if (senderType === "customer") {
      const customerName = senderName || conversation.wpUserName || conversation.guestName || "לקוח";
      notifyAgentsOnNewMessage({
        conversationId,
        customerName,
        messagePreview: preview,
      }).catch((error) => {
        console.error("Failed to send agent notifications:", error);
      });
    }

    return corsResponse({
      message,
      deduplicated: false,
    });
  } catch (error) {
    console.error("Upload file error:", error);
    return corsResponse(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
