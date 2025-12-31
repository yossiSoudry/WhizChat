import prisma from "@/lib/prisma";
import { sendToWhatsApp } from "@/lib/greenapi/client";

const DASHBOARD_URL = "https://whiz-chat.vercel.app";

interface NotifyOptions {
  conversationId: string;
  customerName: string;
  messagePreview: string;
}

/**
 * Send WhatsApp notifications to all agents who have notifications enabled
 */
export async function notifyAgentsOnNewMessage(options: NotifyOptions): Promise<void> {
  const { conversationId, customerName, messagePreview } = options;

  try {
    // Get WhatsApp settings
    const whatsappSettings = await prisma.setting.findUnique({
      where: { key: "whatsapp" },
    });

    if (!whatsappSettings?.value) {
      console.log("WhatsApp settings not configured, skipping notifications");
      return;
    }

    const { instanceId, apiToken } = whatsappSettings.value as {
      instanceId: string;
      apiToken: string;
      businessPhone: string;
    };

    if (!instanceId || !apiToken) {
      console.log("WhatsApp API credentials not configured, skipping notifications");
      return;
    }

    // Get all agents who should receive notifications
    const agentsToNotify = await prisma.agent.findMany({
      where: {
        receiveWhatsappNotifications: true,
        phone: { not: null },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    });

    if (agentsToNotify.length === 0) {
      console.log("No agents configured to receive WhatsApp notifications");
      return;
    }

    // Prepare the notification message
    const chatUrl = `${DASHBOARD_URL}/chat/${conversationId}`;
    const truncatedPreview = messagePreview.length > 100
      ? messagePreview.slice(0, 100) + "..."
      : messagePreview;

    // Send notification to each agent
    const sendPromises = agentsToNotify.map(async (agent) => {
      if (!agent.phone) return;

      const message = `היי ${agent.name}! 👋

התקבלה הודעה חדשה ב-WhizChat

👤 מ: ${customerName}
💬 "${truncatedPreview}"

לצפייה והגבה:
${chatUrl}`;

      try {
        // Format phone number for WhatsApp (remove + and add @c.us)
        const cleanPhone = agent.phone.replace(/\D/g, "");
        const chatId = `${cleanPhone}@c.us`;

        const result = await sendToWhatsApp(instanceId, apiToken, chatId, message);

        if (result.success) {
          console.log(`Notification sent to agent ${agent.name}`);
        } else {
          console.error(`Failed to send notification to ${agent.name}:`, result.error);
        }
      } catch (error) {
        console.error(`Error sending notification to ${agent.name}:`, error);
      }
    });

    // Send all notifications in parallel
    await Promise.allSettled(sendPromises);
  } catch (error) {
    console.error("Error in notifyAgentsOnNewMessage:", error);
    // Don't throw - notifications should not block the main flow
  }
}
