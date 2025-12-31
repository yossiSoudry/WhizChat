import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createAgentSchema } from "@/lib/validations/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedAgent, isAdmin } from "@/lib/auth/get-agent";

// GET all agents
export async function GET() {
  try {
    // Check authentication
    const authResult = await getAuthenticatedAgent();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const agents = await prisma.agent.findMany({
      orderBy: { createdAt: "desc" },
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

    return NextResponse.json({ agents });
  } catch (error) {
    console.error("Get agents error:", error);
    return NextResponse.json(
      { error: "Failed to get agents" },
      { status: 500 }
    );
  }
}

// POST - Create new agent
export async function POST(request: NextRequest) {
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
        { error: "רק מנהל יכול להוסיף נציגים" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createAgentSchema.parse(body);

    // Create user in Supabase Auth
    const supabase = createServiceClient();
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: validatedData.email,
        password: validatedData.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: validatedData.name,
          role: validatedData.role,
        },
      });

    if (authError) {
      console.error("Supabase auth error:", authError);

      if (authError.message.includes("already been registered")) {
        return NextResponse.json(
          { error: "כתובת האימייל כבר קיימת במערכת" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "שגיאה ביצירת משתמש: " + authError.message },
        { status: 500 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "שגיאה ביצירת משתמש" },
        { status: 500 }
      );
    }

    // Create agent in our database
    const agent = await prisma.agent.create({
      data: {
        authUserId: authData.user.id,
        email: validatedData.email,
        name: validatedData.name,
        role: validatedData.role,
        phone: validatedData.phone || null,
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
      },
    });

    return NextResponse.json({ success: true, agent }, { status: 201 });
  } catch (error) {
    console.error("Create agent error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
    }

    // Check for unique constraint violation
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "נציג עם אימייל זה כבר קיים" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "שגיאה ביצירת נציג" }, { status: 500 });
  }
}
