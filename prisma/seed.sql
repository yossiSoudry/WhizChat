-- WhizChat Seed Data
-- Run this in Supabase SQL Editor

-- Settings
INSERT INTO settings (id, key, value, updated_at) VALUES
  (gen_random_uuid(), 'business_hours', '{
    "timezone": "Asia/Jerusalem",
    "schedule": {
      "sunday": {"start": "09:00", "end": "18:00"},
      "monday": {"start": "09:00", "end": "18:00"},
      "tuesday": {"start": "09:00", "end": "18:00"},
      "wednesday": {"start": "09:00", "end": "18:00"},
      "thursday": {"start": "09:00", "end": "18:00"},
      "friday": null,
      "saturday": null
    }
  }', NOW()),
  (gen_random_uuid(), 'messages', '{
    "welcome": "Hey! 👋 How can we help you today?",
    "offline": "We are currently offline. Leave us a message and we will get back to you on the next business day!",
    "ask_contact": "Would you like us to reply via Email or WhatsApp?",
    "transferred_to_whatsapp": "Great! Continuing this conversation on WhatsApp...",
    "going_offline": "Our support team has ended their shift. We will get back to you as soon as possible!",
    "agent_joined": "You are now chatting with {agent_name}"
  }', NOW()),
  (gen_random_uuid(), 'widget', '{
    "position": "right",
    "primaryColor": "#C026D3",
    "secondaryColor": "#DB2777"
  }', NOW()),
  (gen_random_uuid(), 'whatsapp', '{
    "businessPhone": "",
    "instanceId": "",
    "apiToken": ""
  }', NOW()),
  (gen_random_uuid(), 'archive', '{
    "daysUntilArchive": 30,
    "autoArchiveEnabled": true
  }', NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- FAQ Items
INSERT INTO faq_items (id, question, answer, display_order, is_active, click_count, created_at, updated_at) VALUES
  (gen_random_uuid(), 'What are your pricing plans?', 'We offer three plans: Starter ($9/mo), Pro ($29/mo), and Business ($99/mo). Visit our pricing page for full details.', 1, true, 0, NOW(), NOW()),
  (gen_random_uuid(), 'How do I get started?', '1. Sign up for a free account
2. Install our WordPress plugin
3. Activate your license

Need help? We''re here!', 2, true, 0, NOW(), NOW()),
  (gen_random_uuid(), 'Do you offer refunds?', 'Yes! We offer a 30-day money-back guarantee. If you''re not satisfied, contact us for a full refund.', 3, true, 0, NOW(), NOW()),
  (gen_random_uuid(), 'What are your support hours?', 'Our support team is available Sunday-Thursday, 9:00 AM - 6:00 PM (Israel Time).', 4, true, 0, NOW(), NOW());

-- Quick Replies
INSERT INTO quick_replies (id, title, content, shortcut, display_order, is_active, created_at) VALUES
  (gen_random_uuid(), 'Greeting', 'Hi {customer_name}! Thanks for reaching out. How can I help you today?', '/hi', 1, true, NOW()),
  (gen_random_uuid(), 'Pricing Info', 'Our pricing plans start at $9/month. You can see all details at: https://whizmanage.com/pricing', '/pricing', 2, true, NOW()),
  (gen_random_uuid(), 'Documentation', 'You can find our documentation and guides at: https://docs.whizmanage.com', '/docs', 3, true, NOW()),
  (gen_random_uuid(), 'Closing - Resolved', 'Great! I''m glad I could help. If you have any other questions, feel free to reach out anytime. Have a great day!', '/bye', 4, true, NOW());
