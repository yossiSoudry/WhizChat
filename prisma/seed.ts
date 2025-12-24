import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const defaultSettings = [
  {
    key: "business_hours",
    value: {
      timezone: "Asia/Jerusalem",
      schedule: {
        sunday: { start: "09:00", end: "18:00" },
        monday: { start: "09:00", end: "18:00" },
        tuesday: { start: "09:00", end: "18:00" },
        wednesday: { start: "09:00", end: "18:00" },
        thursday: { start: "09:00", end: "18:00" },
        friday: null,
        saturday: null,
      },
    },
  },
  {
    key: "messages",
    value: {
      welcome: "Hey! 👋 How can we help you today?",
      offline:
        "We are currently offline. Leave us a message and we will get back to you on the next business day!",
      ask_contact: "Would you like us to reply via Email or WhatsApp?",
      transferred_to_whatsapp:
        "Great! Continuing this conversation on WhatsApp...",
      going_offline:
        "Our support team has ended their shift. We will get back to you as soon as possible!",
      agent_joined: "You are now chatting with {agent_name}",
    },
  },
  {
    key: "widget",
    value: {
      position: "right",
      primaryColor: "#C026D3",
      secondaryColor: "#DB2777",
    },
  },
  {
    key: "whatsapp",
    value: {
      businessPhone: "",
      instanceId: "",
      apiToken: "",
    },
  },
  {
    key: "archive",
    value: {
      daysUntilArchive: 30,
      autoArchiveEnabled: true,
    },
  },
];

const defaultFAQs = [
  {
    question: "What are your pricing plans?",
    answer:
      "We offer three plans: Starter ($9/mo), Pro ($29/mo), and Business ($99/mo). Visit our pricing page for full details.",
    displayOrder: 1,
  },
  {
    question: "How do I get started?",
    answer:
      "1. Sign up for a free account\n2. Install our WordPress plugin\n3. Activate your license\n\nNeed help? We're here!",
    displayOrder: 2,
  },
  {
    question: "Do you offer refunds?",
    answer:
      "Yes! We offer a 30-day money-back guarantee. If you're not satisfied, contact us for a full refund.",
    displayOrder: 3,
  },
  {
    question: "What are your support hours?",
    answer:
      "Our support team is available Sunday-Thursday, 9:00 AM - 6:00 PM (Israel Time).",
    displayOrder: 4,
  },
];

const defaultQuickReplies = [
  {
    title: "Greeting",
    content:
      "Hi {customer_name}! Thanks for reaching out. How can I help you today?",
    shortcut: "/hi",
    displayOrder: 1,
  },
  {
    title: "Pricing Info",
    content:
      "Our pricing plans start at $9/month. You can see all details at: https://whizmanage.com/pricing",
    shortcut: "/pricing",
    displayOrder: 2,
  },
  {
    title: "Documentation",
    content:
      "You can find our documentation and guides at: https://docs.whizmanage.com",
    shortcut: "/docs",
    displayOrder: 3,
  },
  {
    title: "Closing - Resolved",
    content:
      "Great! I'm glad I could help. If you have any other questions, feel free to reach out anytime. Have a great day!",
    shortcut: "/bye",
    displayOrder: 4,
  },
];

async function main() {
  console.log("🌱 Seeding database...");

  // Seed Settings
  console.log("  - Settings...");
  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  // Seed FAQs
  console.log("  - FAQ Items...");
  for (const faq of defaultFAQs) {
    const existing = await prisma.fAQItem.findFirst({
      where: { question: faq.question },
    });
    if (!existing) {
      await prisma.fAQItem.create({ data: faq });
    }
  }

  // Seed Quick Replies
  console.log("  - Quick Replies...");
  for (const reply of defaultQuickReplies) {
    const existing = await prisma.quickReply.findFirst({
      where: { shortcut: reply.shortcut },
    });
    if (!existing) {
      await prisma.quickReply.create({ data: reply });
    }
  }

  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
