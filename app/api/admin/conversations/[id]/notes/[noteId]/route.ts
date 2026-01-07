import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedAgent } from "@/lib/auth/get-agent";
import { z } from "zod";

const updateNoteSchema = z.object({
  content: z.string().min(1, "Note content is required"),
});

// PUT /api/admin/conversations/[id]/notes/[noteId] - Update a note
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const authResult = await getAuthenticatedAgent();
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const agent = authResult.agent;

    const { id: conversationId, noteId } = await params;
    const body = await request.json();

    const validation = updateNoteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verify note exists and belongs to this conversation
    const existingNote = await prisma.customerNote.findFirst({
      where: { id: noteId, conversationId },
    });

    if (!existingNote) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const note = await prisma.customerNote.update({
      where: { id: noteId },
      data: {
        content: validation.data.content,
        agentId: agent.id,
        agentName: agent.name,
      },
    });

    return NextResponse.json({ note });
  } catch (error) {
    console.error("Error updating note:", error);
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/conversations/[id]/notes/[noteId] - Delete a note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const authResult = await getAuthenticatedAgent();
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id: conversationId, noteId } = await params;

    // Verify note exists and belongs to this conversation
    const existingNote = await prisma.customerNote.findFirst({
      where: { id: noteId, conversationId },
    });

    if (!existingNote) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    await prisma.customerNote.delete({
      where: { id: noteId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
}
