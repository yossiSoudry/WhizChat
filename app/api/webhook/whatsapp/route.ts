import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { extractSessionFromMessage, extractReplyText } from "@/lib/greenapi/client";

// WhatsApp Webhook from Green API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify webhook token (optional but recommended)
    const webhookToken = request.headers.get("x-webhook-token");
    if (
      process.env.GREEN_API_WEBHOOK_TOKEN &&
      webhookToken !== process.env.GREEN_API_WEBHOOK_TOKEN
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Handle message status updates (for read receipts)
    if (body.typeWebhook === "outgoingMessageStatus") {
      return handleMessageStatus(body);
    }

    // Handle incoming messages
    if (body.typeWebhook === "incomingMessageReceived") {
      return handleIncomingMessage(body);
    }

    // Handle instance state changes (connection status)
    if (body.typeWebhook === "stateInstanceChanged") {
      console.log("WhatsApp instance state:", body.stateInstance);
      return NextResponse.json({ ok: true });
    }

    // Unknown webhook type
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleMessageStatus(body: {
  idMessage: string;
  status: "sent" | "delivered" | "read";
  chatId: string;
}) {
  const { idMessage, status } = body;

  try {
    // Update message status
    const message = await prisma.message.findFirst({
      where: { waMessageId: idMessage },
    });

    if (message) {
      await prisma.message.update({
        where: { id: message.id },
        data: { waStatus: status },
      });

      // If read, update conversation's last read timestamp
      if (status === "read") {
        await prisma.conversation.update({
          where: { id: message.conversationId },
          data: { lastReadAtAgent: new Date() },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Handle message status error:", error);
    return NextResponse.json({ ok: true }); // Still return OK to prevent retries
  }
}

async function handleIncomingMessage(body: {
  idMessage: string;
  senderData: {
    chatId: string;
    sender: string;
    senderName: string;
  };
  messageData: {
    typeMessage: string;
    textMessageData?: { textMessage: string };
    extendedTextMessageData?: { text: string };
  };
}) {
  const { senderData, messageData, idMessage } = body;

  // Get message text
  const messageText =
    messageData.textMessageData?.textMessage ||
    messageData.extendedTextMessageData?.text;

  if (!messageText) {
    return NextResponse.json({ ok: true });
  }

  try {
    // Try to find session ID in message (for replies from agents)
    const sessionPrefix = extractSessionFromMessage(messageText);

    if (sessionPrefix) {
      // Find conversation by ID prefix
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: { startsWith: sessionPrefix },
        },
      });

      if (conversation) {
        // Extract actual reply text
        const replyText = extractReplyText(messageText);

        // Create message from agent via WhatsApp
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            content: replyText,
            senderType: "agent",
            senderName: senderData.senderName || "Support (via WhatsApp)",
            source: "whatsapp",
            waMessageId: idMessage,
            waStatus: "delivered",
          },
        });

        // Update conversation
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: new Date(),
            lastMessagePreview: replyText.slice(0, 100),
          },
        });
      }
    } else {
      // This might be a direct message from a customer via WhatsApp
      // Find conversation by WhatsApp chat ID
      const conversation = await prisma.conversation.findFirst({
        where: { waChatId: senderData.chatId },
      });

      if (conversation) {
        // Create message from customer via WhatsApp
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            content: messageText,
            senderType: "customer",
            senderName: senderData.senderName || "Customer",
            source: "whatsapp",
            waMessageId: idMessage,
            waStatus: "delivered",
          },
        });

        // Update conversation
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: new Date(),
            lastMessagePreview: messageText.slice(0, 100),
            unreadCount: { increment: 1 },
          },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Handle incoming message error:", error);
    return NextResponse.json({ ok: true }); // Still return OK to prevent retries
  }
}
