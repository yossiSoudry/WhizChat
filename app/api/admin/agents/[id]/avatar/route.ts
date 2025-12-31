import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedAgent, isAdmin } from "@/lib/auth/get-agent";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Upload avatar
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const authResult = await getAuthenticatedAgent();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { id } = await params;

    // Only admin can update other agents, but agent can update their own
    if (id !== authResult.agent.id && !isAdmin(authResult.agent)) {
      return NextResponse.json(
        { error: "אין הרשאה לעדכן נציג זה" },
        { status: 403 }
      );
    }

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { id },
      select: { id: true, avatarUrl: true },
    });

    if (!agent) {
      return NextResponse.json({ error: "הנציג לא נמצא" }, { status: 404 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "לא נבחר קובץ" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "סוג קובץ לא נתמך. נא להעלות תמונה (JPEG, PNG, WebP, GIF)" },
        { status: 400 }
      );
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "גודל הקובץ חייב להיות עד 2MB" },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createServiceClient();

    // Delete old avatar if exists
    if (agent.avatarUrl) {
      const oldPath = agent.avatarUrl.split("/").slice(-2).join("/");
      await supabase.storage.from("avatars").remove([oldPath]);
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${id}/${Date.now()}.${ext}`;

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filename, file, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "שגיאה בהעלאת התמונה: " + uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(data.path);

    const avatarUrl = urlData.publicUrl;

    // Update agent in database
    const updatedAgent = await prisma.agent.update({
      where: { id },
      data: { avatarUrl },
      select: {
        id: true,
        avatarUrl: true,
      },
    });

    return NextResponse.json({
      success: true,
      avatarUrl: updatedAgent.avatarUrl,
    });
  } catch (error) {
    console.error("Upload avatar error:", error);
    return NextResponse.json(
      { error: "שגיאה בהעלאת התמונה" },
      { status: 500 }
    );
  }
}

// DELETE - Remove avatar
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const authResult = await getAuthenticatedAgent();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { id } = await params;

    // Only admin can update other agents, but agent can update their own
    if (id !== authResult.agent.id && !isAdmin(authResult.agent)) {
      return NextResponse.json(
        { error: "אין הרשאה לעדכן נציג זה" },
        { status: 403 }
      );
    }

    // Get agent
    const agent = await prisma.agent.findUnique({
      where: { id },
      select: { id: true, avatarUrl: true },
    });

    if (!agent) {
      return NextResponse.json({ error: "הנציג לא נמצא" }, { status: 404 });
    }

    if (!agent.avatarUrl) {
      return NextResponse.json({ success: true });
    }

    // Delete from Supabase Storage
    const supabase = createServiceClient();
    const path = agent.avatarUrl.split("/").slice(-2).join("/");
    await supabase.storage.from("avatars").remove([path]);

    // Update agent in database
    await prisma.agent.update({
      where: { id },
      data: { avatarUrl: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete avatar error:", error);
    return NextResponse.json(
      { error: "שגיאה במחיקת התמונה" },
      { status: 500 }
    );
  }
}
