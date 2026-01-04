import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedAgent } from "@/lib/auth/get-agent";
import { z } from "zod";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

// POST - Subscribe to push notifications
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedAgent();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const validation = subscriptionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "נתוני הרשמה לא תקינים" },
        { status: 400 }
      );
    }

    const { endpoint, keys } = validation.data;
    const userAgent = request.headers.get("user-agent") || undefined;

    // Upsert subscription (update if exists, create if not)
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        agentId: authResult.agent.id,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent,
      },
      create: {
        agentId: authResult.agent.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent,
      },
    });

    return NextResponse.json({
      success: true,
      id: subscription.id
    });
  } catch (error) {
    console.error("Push subscribe error:", error);
    return NextResponse.json(
      { error: "שגיאה בהרשמה להתראות" },
      { status: 500 }
    );
  }
}

// DELETE - Unsubscribe from push notifications
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedAgent();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: "חסר endpoint" },
        { status: 400 }
      );
    }

    // Delete subscription
    await prisma.pushSubscription.deleteMany({
      where: {
        endpoint,
        agentId: authResult.agent.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push unsubscribe error:", error);
    return NextResponse.json(
      { error: "שגיאה בביטול הרשמה להתראות" },
      { status: 500 }
    );
  }
}
