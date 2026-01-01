import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedAgent } from "@/lib/auth/get-agent";
import { MessageType } from "@prisma/client";

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

// POST - Upload file and create message (agent)
export async function POST(request: NextRequest) {
  try {
    // Get authenticated agent
    const authResult = await getAuthenticatedAgent();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const agent = authResult.agent;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const conversationId = formData.get("conversationId") as string | null;
    const caption = formData.get("caption") as string | null;

    // Validate required fields
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json(
        { error: `File type not allowed: ${file.type}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}` },
        { status: 400 }
      );
    }

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

    // Upload file to Supabase Storage
    const supabase = createServiceClient();

    // Generate unique filename
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
      return NextResponse.json(
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
    // Use caption if provided, otherwise use filename
    const messageContent = caption?.trim() || file.name;

    const message = await prisma.message.create({
      data: {
        conversationId,
        content: messageContent,
        messageType,
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        fileMimeType: file.type,
        senderType: "agent",
        senderId: agent.id,
        senderName: agent.name,
        source: "dashboard",
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

    // Update conversation
    let preview = messageType === "image"
      ? "📷 תמונה"
      : messageType === "audio"
      ? "🎵 הודעה קולית"
      : messageType === "video"
      ? "🎬 וידאו"
      : `📎 ${file.name}`;

    // If caption provided, add it to preview
    if (caption?.trim()) {
      preview = `${preview}: ${caption.trim()}`;
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: preview.slice(0, 100),
        status: "active",
        unreadCount: 0,
        lastReadAtAgent: new Date(),
      },
    });

    return NextResponse.json({
      message,
      waSent: false,
    });
  } catch (error) {
    console.error("Upload file error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
