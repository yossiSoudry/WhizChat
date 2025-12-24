import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get archive settings
    const archiveSettings = await prisma.setting.findUnique({
      where: { key: "archive" },
    });

    const settings = archiveSettings?.value as {
      daysUntilArchive: number;
      autoArchiveEnabled: boolean;
    } | null;

    if (!settings?.autoArchiveEnabled) {
      return NextResponse.json({ message: "Auto-archive disabled" });
    }

    const daysThreshold = settings.daysUntilArchive || 30;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    // Archive old closed conversations
    const result = await prisma.conversation.updateMany({
      where: {
        status: "closed",
        isArchived: false,
        updatedAt: { lt: thresholdDate },
      },
      data: {
        isArchived: true,
      },
    });

    return NextResponse.json({
      success: true,
      archivedCount: result.count,
    });
  } catch (error) {
    console.error("Archive cron error:", error);
    return NextResponse.json(
      { error: "Archive process failed" },
      { status: 500 }
    );
  }
}
