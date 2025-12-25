import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { createAgentSchema } from "@/lib/validations/admin";

// GET all agents
export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        isOnline: true,
        lastSeenAt: true,
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
    const body = await request.json();
    const validatedData = createAgentSchema.parse(body);

    // In a real app, you would create the user in Supabase Auth first
    // and get the auth_user_id. For now, we'll use a placeholder.
    const authUserId = randomUUID();

    const agent = await prisma.agent.create({
      data: {
        authUserId,
        email: validatedData.email,
        name: validatedData.name,
        role: validatedData.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        isOnline: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, agent }, { status: 201 });
  } catch (error) {
    console.error("Create agent error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "An agent with this email already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    );
  }
}
