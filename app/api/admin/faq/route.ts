import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { faqItemSchema } from "@/lib/validations/admin";

// GET all FAQ items
export async function GET() {
  try {
    const faqItems = await prisma.fAQItem.findMany({
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json({ faqItems });
  } catch (error) {
    console.error("Get FAQ items error:", error);
    return NextResponse.json(
      { error: "Failed to get FAQ items" },
      { status: 500 }
    );
  }
}

// POST - Create new FAQ item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = faqItemSchema.parse(body);

    const faqItem = await prisma.fAQItem.create({
      data: validatedData,
    });

    return NextResponse.json({ success: true, faqItem }, { status: 201 });
  } catch (error) {
    console.error("Create FAQ item error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create FAQ item" },
      { status: 500 }
    );
  }
}
