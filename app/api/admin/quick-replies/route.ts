import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { quickReplySchema } from "@/lib/validations/admin";

// GET all quick replies
export async function GET() {
  try {
    const quickReplies = await prisma.quickReply.findMany({
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json({ quickReplies });
  } catch (error) {
    console.error("Get quick replies error:", error);
    return NextResponse.json(
      { error: "Failed to get quick replies" },
      { status: 500 }
    );
  }
}

// POST - Create new quick reply
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = quickReplySchema.parse(body);

    // Check if shortcut already exists
    if (validatedData.shortcut) {
      const existing = await prisma.quickReply.findFirst({
        where: { shortcut: validatedData.shortcut },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Shortcut already in use" },
          { status: 400 }
        );
      }
    }

    const quickReply = await prisma.quickReply.create({
      data: validatedData,
    });

    return NextResponse.json({ success: true, quickReply }, { status: 201 });
  } catch (error) {
    console.error("Create quick reply error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create quick reply" },
      { status: 500 }
    );
  }
}
