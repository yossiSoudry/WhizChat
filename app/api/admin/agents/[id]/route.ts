import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateAgentSchema } from "@/lib/validations/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedAgent, isAdmin } from "@/lib/auth/get-agent";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET single agent
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const agent = await prisma.agent.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        phone: true,
        role: true,
        isActive: true,
        isOnline: true,
        lastSeenAt: true,
        receiveWhatsappNotifications: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({ agent });
  } catch (error) {
    console.error("Get agent error:", error);
    return NextResponse.json(
      { error: "Failed to get agent" },
      { status: 500 }
    );
  }
}

// PUT - Update agent
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication and admin role
    const authResult = await getAuthenticatedAgent();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    if (!isAdmin(authResult.agent)) {
      return NextResponse.json(
        { error: "רק מנהל יכול לערוך נציגים" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateAgentSchema.parse(body);

    // If password reset requested, update in Supabase Auth
    if (validatedData.newPassword) {
      const agentToUpdate = await prisma.agent.findUnique({
        where: { id },
        select: { authUserId: true },
      });

      if (!agentToUpdate) {
        return NextResponse.json({ error: "הנציג לא נמצא" }, { status: 404 });
      }

      const supabase = createServiceClient();
      const { error: authError } = await supabase.auth.admin.updateUserById(
        agentToUpdate.authUserId,
        { password: validatedData.newPassword }
      );

      if (authError) {
        console.error("Password reset error:", authError);
        return NextResponse.json(
          { error: "שגיאה באיפוס הסיסמה: " + authError.message },
          { status: 500 }
        );
      }
    }

    // Update agent in database (excluding password)
    const { newPassword, phone, ...updateData } = validatedData;

    const agent = await prisma.agent.update({
      where: { id },
      data: {
        ...updateData,
        // Handle phone: empty string becomes null
        ...(phone !== undefined && { phone: phone || null }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        phone: true,
        role: true,
        isActive: true,
        isOnline: true,
        lastSeenAt: true,
        receiveWhatsappNotifications: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      agent,
      passwordReset: !!validatedData.newPassword,
    });
  } catch (error) {
    console.error("Update agent error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
    }

    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return NextResponse.json({ error: "הנציג לא נמצא" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "שגיאה בעדכון הנציג" },
      { status: 500 }
    );
  }
}

// DELETE agent
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication and admin role
    const authResult = await getAuthenticatedAgent();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    if (!isAdmin(authResult.agent)) {
      return NextResponse.json(
        { error: "רק מנהל יכול למחוק נציגים" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Get agent's auth user ID before deleting
    const agentToDelete = await prisma.agent.findUnique({
      where: { id },
      select: { authUserId: true },
    });

    if (!agentToDelete) {
      return NextResponse.json({ error: "הנציג לא נמצא" }, { status: 404 });
    }

    // Prevent self-deletion
    if (agentToDelete.authUserId === authResult.agent.authUserId) {
      return NextResponse.json(
        { error: "לא ניתן למחוק את עצמך" },
        { status: 400 }
      );
    }

    // Delete from our database first
    await prisma.agent.delete({
      where: { id },
    });

    // Delete from Supabase Auth
    const supabase = createServiceClient();
    const { error: authError } = await supabase.auth.admin.deleteUser(
      agentToDelete.authUserId
    );

    if (authError) {
      console.error("Failed to delete auth user:", authError);
      // Agent already deleted from DB, log but don't fail
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete agent error:", error);

    if (
      error instanceof Error &&
      error.message.includes("Record to delete does not exist")
    ) {
      return NextResponse.json({ error: "הנציג לא נמצא" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "שגיאה במחיקת הנציג" },
      { status: 500 }
    );
  }
}
