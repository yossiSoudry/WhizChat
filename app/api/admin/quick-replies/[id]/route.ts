import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { quickReplySchema } from "@/lib/validations/admin";

// PUT - Update quick reply
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = quickReplySchema.parse(body);

    const existingItem = await prisma.quickReply.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "Quick reply not found" },
        { status: 404 }
      );
    }

    // Check if shortcut already exists (excluding current item)
    if (validatedData.shortcut) {
      const duplicate = await prisma.quickReply.findFirst({
        where: {
          shortcut: validatedData.shortcut,
          id: { not: id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "Shortcut already in use" },
          { status: 400 }
        );
      }
    }

    const quickReply = await prisma.quickReply.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json({ success: true, quickReply });
  } catch (error) {
    console.error("Update quick reply error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update quick reply" },
      { status: 500 }
    );
  }
}

// DELETE - Remove quick reply
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existingItem = await prisma.quickReply.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "Quick reply not found" },
        { status: 404 }
      );
    }

    await prisma.quickReply.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete quick reply error:", error);
    return NextResponse.json(
      { error: "Failed to delete quick reply" },
      { status: 500 }
    );
  }
}
