const GREEN_API_URL = "https://api.green-api.com";

interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendToWhatsApp(
  instanceId: string,
  apiToken: string,
  chatId: string,
  message: string
): Promise<SendMessageResponse> {
  try {
    const response = await fetch(
      `${GREEN_API_URL}/waInstance${instanceId}/sendMessage/${apiToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          message,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Failed to send message",
      };
    }

    return {
      success: true,
      messageId: data.idMessage,
    };
  } catch (error) {
    console.error("Green API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendToBusinessWhatsApp(
  instanceId: string,
  apiToken: string,
  businessPhone: string,
  conversationId: string,
  customerName: string,
  message: string
): Promise<SendMessageResponse> {
  const formattedMessage = `
📩 New message from chat

👤 Customer: ${customerName}
🔗 Session: ${conversationId.slice(0, 8)}

💬 Message:
${message}
`.trim();

  return sendToWhatsApp(
    instanceId,
    apiToken,
    `${businessPhone}@c.us`,
    formattedMessage
  );
}

export function generateWhatsAppLink(
  businessPhone: string,
  conversationId: string,
  recentMessages: { senderType: string; content: string }[]
): string {
  // Create summary of last 3 messages
  const summary = recentMessages
    .slice(-3)
    .map((m) => `${m.senderType === "customer" ? "Me" : "Support"}: ${m.content.slice(0, 50)}`)
    .join("\n");

  const prefilledText = encodeURIComponent(
    `Continuing conversation from website (${conversationId.slice(0, 8)})\n\n` +
      `Previous messages:\n${summary}\n\n` +
      `My question: `
  );

  // Remove + and any non-digit characters from phone
  const cleanPhone = businessPhone.replace(/\D/g, "");

  return `https://wa.me/${cleanPhone}?text=${prefilledText}`;
}

export function extractSessionFromMessage(messageText: string): string | null {
  const sessionMatch = messageText.match(/Session:\s*([a-f0-9]{8})/i);
  return sessionMatch ? sessionMatch[1] : null;
}

export function extractReplyText(messageText: string): string {
  // Remove the quoted context (everything before the actual reply)
  // Typically the reply is after "My question:" or at the end
  const lines = messageText.split("\n");
  const replyIndex = lines.findIndex((line) =>
    line.toLowerCase().includes("my question:")
  );

  if (replyIndex !== -1) {
    return lines.slice(replyIndex + 1).join("\n").trim();
  }

  // If no "My question:" marker, return the last paragraph
  return lines[lines.length - 1].trim();
}
