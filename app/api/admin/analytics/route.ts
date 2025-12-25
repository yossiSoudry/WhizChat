import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get conversations stats
    const [
      totalConversations,
      activeConversations,
      todayConversations,
      weekConversations,
      closedConversations,
    ] = await Promise.all([
      prisma.conversation.count(),
      prisma.conversation.count({ where: { status: "active" } }),
      prisma.conversation.count({
        where: { createdAt: { gte: today } },
      }),
      prisma.conversation.count({
        where: { createdAt: { gte: weekAgo } },
      }),
      prisma.conversation.count({ where: { status: "closed" } }),
    ]);

    // Get messages stats
    const [
      totalMessages,
      todayMessages,
      weekMessages,
      customerMessages,
      agentMessages,
    ] = await Promise.all([
      prisma.message.count(),
      prisma.message.count({
        where: { createdAt: { gte: today } },
      }),
      prisma.message.count({
        where: { createdAt: { gte: weekAgo } },
      }),
      prisma.message.count({ where: { senderType: "customer" } }),
      prisma.message.count({ where: { senderType: "agent" } }),
    ]);

    // Get agents stats
    const [totalAgents, onlineAgents, activeAgents] = await Promise.all([
      prisma.agent.count(),
      prisma.agent.count({ where: { isOnline: true } }),
      prisma.agent.count({ where: { isActive: true } }),
    ]);

    // Get FAQ stats
    const faqItems = await prisma.fAQItem.findMany({
      select: {
        question: true,
        clickCount: true,
      },
      orderBy: { clickCount: "desc" },
      take: 5,
    });

    const totalFAQClicks = await prisma.fAQItem.aggregate({
      _sum: { clickCount: true },
    });

    // Get conversations per day for the last 7 days
    const dailyConversations = await Promise.all(
      Array.from({ length: 7 }, async (_, i) => {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

        const count = await prisma.conversation.count({
          where: {
            createdAt: {
              gte: date,
              lt: nextDate,
            },
          },
        });

        return {
          date: date.toISOString().split("T")[0],
          count,
        };
      })
    );

    // Get messages per day for the last 7 days
    const dailyMessages = await Promise.all(
      Array.from({ length: 7 }, async (_, i) => {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

        const count = await prisma.message.count({
          where: {
            createdAt: {
              gte: date,
              lt: nextDate,
            },
          },
        });

        return {
          date: date.toISOString().split("T")[0],
          count,
        };
      })
    );

    // Calculate average response time (simplified - counts messages per conversation)
    const avgMessagesPerConversation = totalConversations > 0
      ? Math.round(totalMessages / totalConversations)
      : 0;

    // Get source breakdown
    const [widgetMessages, whatsappMessages] = await Promise.all([
      prisma.message.count({ where: { source: "widget" } }),
      prisma.message.count({ where: { source: "whatsapp" } }),
    ]);

    return NextResponse.json({
      overview: {
        totalConversations,
        activeConversations,
        closedConversations,
        todayConversations,
        weekConversations,
        totalMessages,
        todayMessages,
        weekMessages,
        customerMessages,
        agentMessages,
        avgMessagesPerConversation,
      },
      agents: {
        total: totalAgents,
        online: onlineAgents,
        active: activeAgents,
      },
      faq: {
        totalClicks: totalFAQClicks._sum.clickCount || 0,
        topItems: faqItems,
      },
      charts: {
        dailyConversations: dailyConversations.reverse(),
        dailyMessages: dailyMessages.reverse(),
      },
      sources: {
        widget: widgetMessages,
        whatsapp: whatsappMessages,
        dashboard: totalMessages - widgetMessages - whatsappMessages,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to get analytics" },
      { status: 500 }
    );
  }
}
