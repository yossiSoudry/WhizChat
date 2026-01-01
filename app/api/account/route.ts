import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedAgent } from "@/lib/auth/get-agent";
import { z } from "zod";

const phoneRegex = /^\+?[0-9]{9,15}$/;

const updateProfileSchema = z.object({
  name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  phone: z.string().regex(phoneRegex, "מספר טלפון לא תקין").optional().or(z.literal("")),
  receiveWhatsappNotifications: z.boolean().optional(),
});

// GET - Get current agent's profile
export async function GET() {
  try {
    const authResult = await getAuthenticatedAgent();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const agent = await prisma.agent.findUnique({
      where: { id: authResult.agent.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatarUrl: true,
        receiveWhatsappNotifications: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "הנציג לא נמצא" }, { status: 404 });
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת הפרופיל" },
      { status: 500 }
    );
  }
}

// PUT - Update current agent's profile
export async function PUT(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedAgent();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const validation = updateProfileSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, phone, receiveWhatsappNotifications } = validation.data;

    // If trying to enable notifications but no phone number
    if (receiveWhatsappNotifications && !phone) {
      return NextResponse.json(
        { error: "יש להזין מספר טלפון כדי לקבל התראות WhatsApp" },
        { status: 400 }
      );
    }

    const updatedAgent = await prisma.agent.update({
      where: { id: authResult.agent.id },
      data: {
        name,
        phone: phone || null,
        receiveWhatsappNotifications: receiveWhatsappNotifications ?? false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatarUrl: true,
        receiveWhatsappNotifications: true,
      },
    });

    return NextResponse.json(updatedAgent);
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "שגיאה בעדכון הפרופיל" },
      { status: 500 }
    );
  }
}
