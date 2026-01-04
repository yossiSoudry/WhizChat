import webpush from "web-push";
import prisma from "@/lib/prisma";

// Configure web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:support@whizchat.co.il",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  conversationId?: string;
}

/**
 * Send push notification to a specific agent
 */
export async function sendPushToAgent(
  agentId: string,
  payload: PushPayload
): Promise<{ success: number; failed: number }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("VAPID keys not configured, skipping push notification");
    return { success: 0, failed: 0 };
  }

  // Check if agent wants to receive push notifications
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { receivePushNotifications: true },
  });

  if (!agent?.receivePushNotifications) {
    return { success: 0, failed: 0 };
  }

  // Get all subscriptions for this agent
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { agentId },
  });

  console.log("[Push] Agent", agentId, "has subscriptions:", subscriptions.length);

  if (subscriptions.length === 0) {
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  // Send to all subscriptions
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify(payload)
        );
        success++;
      } catch (error: unknown) {
        failed++;
        const statusCode = (error as { statusCode?: number }).statusCode;

        // If subscription is invalid (expired or unsubscribed), delete it
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({
            where: { id: sub.id },
          }).catch(() => {
            // Ignore if already deleted
          });
        }
        console.error(`Push to ${sub.endpoint} failed:`, error);
      }
    })
  );

  return { success, failed };
}

/**
 * Send push notification to all active agents
 */
export async function sendPushToAllAgents(
  payload: PushPayload,
  excludeAgentId?: string
): Promise<{ success: number; failed: number }> {
  console.log("[Push] sendPushToAllAgents - VAPID configured:", !!VAPID_PUBLIC_KEY && !!VAPID_PRIVATE_KEY);

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("[Push] VAPID keys not configured, skipping push notification");
    return { success: 0, failed: 0 };
  }

  // Get all active agents who want push notifications
  const agents = await prisma.agent.findMany({
    where: {
      isActive: true,
      receivePushNotifications: true,
      ...(excludeAgentId && { id: { not: excludeAgentId } }),
    },
    select: { id: true },
  });

  console.log("[Push] Found agents with push enabled:", agents.length);

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const agent of agents) {
    const result = await sendPushToAgent(agent.id, payload);
    totalSuccess += result.success;
    totalFailed += result.failed;
  }

  return { success: totalSuccess, failed: totalFailed };
}

/**
 * Send push notification for new customer message
 */
export async function notifyAgentsOfNewMessage(
  customerName: string,
  messagePreview: string,
  conversationId: string
): Promise<void> {
  console.log("[Push] notifyAgentsOfNewMessage called:", { customerName, conversationId });

  const payload: PushPayload = {
    title: `הודעה חדשה מ-${customerName}`,
    body: messagePreview.length > 100
      ? messagePreview.substring(0, 100) + "..."
      : messagePreview,
    url: `/?conversation=${conversationId}`,
    tag: `conversation-${conversationId}`,
    conversationId,
  };

  const result = await sendPushToAllAgents(payload);
  console.log("[Push] Result:", result);
}
