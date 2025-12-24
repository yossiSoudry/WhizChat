import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateSettingsSchema } from "@/lib/validations/admin";
import type { Prisma } from "@prisma/client";

// GET all settings
export async function GET() {
  try {
    const settings = await prisma.setting.findMany();

    // Convert to object
    const settingsObject = settings.reduce(
      (acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      },
      {} as Record<string, unknown>
    );

    return NextResponse.json({ settings: settingsObject });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json(
      { error: "Failed to get settings" },
      { status: 500 }
    );
  }
}

// PUT - Update a setting
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = updateSettingsSchema.parse(body);

    const { key, value } = validatedData;

    // Validate key is allowed
    const allowedKeys = [
      "business_hours",
      "messages",
      "widget",
      "whatsapp",
      "archive",
    ];

    if (!allowedKeys.includes(key)) {
      return NextResponse.json(
        { error: "Invalid settings key" },
        { status: 400 }
      );
    }

    const jsonValue = value as Prisma.InputJsonValue;

    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value: jsonValue },
      create: { key, value: jsonValue },
    });

    return NextResponse.json({ success: true, setting });
  } catch (error) {
    console.error("Update settings error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
