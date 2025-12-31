import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Find agent by auth user ID
    const agent = await prisma.agent.findUnique({
      where: { authUserId: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: "משתמש זה אינו נציג במערכת" },
        { status: 403 }
      );
    }

    if (!agent.isActive) {
      return NextResponse.json(
        { error: "חשבון הנציג אינו פעיל" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        role: agent.role,
      },
    });
  } catch (error) {
    console.error("Verify agent error:", error);
    return NextResponse.json(
      { error: "שגיאה בבדיקת הנציג" },
      { status: 500 }
    );
  }
}
