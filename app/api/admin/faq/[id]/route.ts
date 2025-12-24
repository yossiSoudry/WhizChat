import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { faqItemSchema } from "@/lib/validations/admin";

// GET single FAQ item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const faqItem = await prisma.fAQItem.findUnique({
      where: { id },
    });

    if (!faqItem) {
      return NextResponse.json(
        { error: "FAQ item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ faqItem });
  } catch (error) {
    console.error("Get FAQ item error:", error);
    return NextResponse.json(
      { error: "Failed to get FAQ item" },
      { status: 500 }
    );
  }
}

// PUT - Update FAQ item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = faqItemSchema.parse(body);

    const existingItem = await prisma.fAQItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "FAQ item not found" },
        { status: 404 }
      );
    }

    const faqItem = await prisma.fAQItem.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json({ success: true, faqItem });
  } catch (error) {
    console.error("Update FAQ item error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update FAQ item" },
      { status: 500 }
    );
  }
}

// DELETE - Remove FAQ item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existingItem = await prisma.fAQItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "FAQ item not found" },
        { status: 404 }
      );
    }

    await prisma.fAQItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete FAQ item error:", error);
    return NextResponse.json(
      { error: "Failed to delete FAQ item" },
      { status: 500 }
    );
  }
}

// PATCH - Track FAQ click
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.fAQItem.update({
      where: { id },
      data: {
        clickCount: { increment: 1 },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Track FAQ click error:", error);
    return NextResponse.json(
      { error: "Failed to track click" },
      { status: 500 }
    );
  }
}
