import "dotenv/config";
import prisma from "../lib/prisma";

async function main() {
  // Update messages settings to English
  const newMessages = {
    welcome: "Hello! How may I assist you today?",
    offline: "We are currently unavailable. Please leave a message and we will respond as soon as possible.",
    ask_contact: "Would you prefer to be contacted via email or WhatsApp?",
    transferred_to_whatsapp: "Excellent! We will continue this conversation on WhatsApp.",
    going_offline: "Our support team has concluded for the day. We will respond to your inquiry shortly.",
    agent_joined: "You are now connected with {agent_name}.",
  };

  const result = await prisma.setting.upsert({
    where: { key: "messages" },
    update: { value: newMessages },
    create: { key: "messages", value: newMessages },
  });

  console.log("Updated messages settings:", result);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
