# WhizChat - מערכת צ'אט עסקי עם אינטגרציית WhatsApp

## מסמך אפיון מלא | גרסה 1.2

---

## 📋 תוכן עניינים

1. [סקירה כללית](#1-סקירה-כללית)
2. [ארכיטקטורה טכנית](#2-ארכיטקטורה-טכנית)
3. [מודל נתונים](#3-מודל-נתונים)
4. [API Endpoints](#4-api-endpoints)
5. [אינטגרציית WhatsApp (Green API)](#5-אינטגרציית-whatsapp-green-api)
6. [Widget צד לקוח](#6-widget-צד-לקוח)
7. [דשבורד ניהול](#7-דשבורד-ניהול)
8. [Real-time Communication](#8-real-time-communication)
9. [הודעות אוטומטיות ו-FAQ](#9-הודעות-אוטומטיות-ו-faq)
10. [אבטחה ואימות](#10-אבטחה-ואימות)
11. [עיצוב ו-UI](#11-עיצוב-ו-ui)
12. [תרחישי שימוש](#12-תרחישי-שימוש)
13. [תחזוקה וארכיון](#13-תחזוקה-וארכיון)
14. [שלבי פיתוח](#14-שלבי-פיתוח)

---

## 1. סקירה כללית

### 1.1 מטרת המערכת

מערכת צ'אט מותאמת אישית שמאפשרת:
- תקשורת דו-כיוונית בין לקוחות לנציגי תמיכה
- אינטגרציה מלאה עם WhatsApp Business דרך Green API
- מעבר חלק מצ'אט באתר לשיחת WhatsApp
- ניהול מרכזי של כל השיחות

### 1.2 קהל יעד

- **לקוחות קצה**: משתמשי אתר whizmanage.com (מחוברים ואורחים)
- **נציגי תמיכה**: צוות החברה שעונה דרך דשבורד או WhatsApp
- **מנהל מערכת**: הגדרות, שעות פעילות, תשובות אוטומטיות

### 1.3 פלטפורמות הטמעה

| פלטפורמה | סוג | סטטוס |
|----------|-----|--------|
| whizmanage.com | WordPress + React Plugin | עיקרי |
| מערכת "עצה" | WordPress | עתידי |
| Docs | Vercel (Next.js) | עתידי |

---

## 2. ארכיטקטורה טכנית

### 2.1 תרשים ארכיטקטורה

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND LAYER                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │   WordPress     │  │   WordPress     │  │    Vercel       │          │
│  │  whizmanage.com │  │    (עצה)        │  │    (Docs)       │          │
│  │                 │  │                 │  │                 │          │
│  │  React Plugin   │  │                 │  │   Next.js App   │          │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘          │
│           │                    │                    │                    │
│           └────────────────────┼────────────────────┘                    │
│                                ▼                                         │
│              ┌─────────────────────────────────────────┐                │
│              │     Chat Widget (Embedded JS)            │                │
│              │     • Preact + Shadow DOM                │                │
│              │     • Supabase Anonymous Auth            │                │
│              │     • WebSocket Client                   │                │
│              │     • ~30KB gzipped                      │                │
│              └─────────────────┬───────────────────────┘                │
└────────────────────────────────┼────────────────────────────────────────┘
                                 │
                                 │ HTTPS + WebSocket
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            BACKEND LAYER                                 │
│                         (Next.js on Vercel)                             │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                        API Routes                                │    │
│  │                                                                  │    │
│  │  /api/chat                                                       │    │
│  │    ├── POST   /send          → שליחת הודעה                      │    │
│  │    ├── GET    /messages      → שליפת הודעות                     │    │
│  │    ├── GET    /conversations → רשימת שיחות                      │    │
│  │    ├── POST   /read          → סימון כנקרא                      │    │
│  │    └── POST   /typing        → חיווי הקלדה                      │    │
│  │                                                                  │    │
│  │  /api/webhook                                                    │    │
│  │    └── POST   /whatsapp      → קבלה מ-Green API                 │    │
│  │                                                                  │    │
│  │  /api/admin                                                      │    │
│  │    ├── GET    /settings      → הגדרות מערכת                     │    │
│  │    ├── PUT    /settings      → עדכון הגדרות                     │    │
│  │    ├── CRUD   /faq           → ניהול שאלות נפוצות               │    │
│  │    ├── CRUD   /agents        → ניהול נציגים                     │    │
│  │    └── GET    /analytics     → סטטיסטיקות                       │    │
│  │                                                                  │    │
│  │  /api/auth                                                       │    │
│  │    ├── POST   /verify-wp     → אימות משתמש WordPress            │    │
│  │    ├── POST   /anonymous     → יצירת session אנונימי            │    │
│  │    └── POST   /agent-login   → כניסת נציג                       │    │
│  │                                                                  │    │
│  │  /api/cron                                                       │    │
│  │    └── POST   /archive       → ארכיון שיחות ישנות               │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│         ┌──────────────┬──────────────┬──────────────┐                  │
│         ▼              ▼              ▼              ▼                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │  Supabase   │ │  Supabase   │ │  Green API  │ │   Vercel    │       │
│  │  Database   │ │  Realtime   │ │  (WhatsApp) │ │    KV       │       │
│  │  (Postgres) │ │  + Presence │ │             │ │  (Cache)    │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Webhook
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         WHATSAPP LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      Green API Instance                          │    │
│  │                                                                  │    │
│  │  • Instance ID: [YOUR_INSTANCE_ID]                              │    │
│  │  • API Token: [YOUR_API_TOKEN]                                  │    │
│  │  • Webhook URL: https://your-domain.vercel.app/api/webhook/wa   │    │
│  │                                                                  │    │
│  │  Webhooks Enabled:                                              │    │
│  │    ✓ incomingMessageReceived                                    │    │
│  │    ✓ outgoingMessageStatus (for read receipts)                  │    │
│  │    ✓ stateInstanceChanged                                       │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                 │                                        │
│                                 ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                   WhatsApp Business Account                      │    │
│  │                     (מספר טלפון עסקי)                            │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Tech Stack

| שכבה | טכנולוגיה | סיבה |
|------|-----------|------|
| **Frontend Widget** | Preact + TypeScript + Shadow DOM | קל משקל (~3KB), בידוד עיצובי מלא |
| **Backend** | Next.js 14 (App Router) | API Routes, Server Components |
| **Database** | Supabase (PostgreSQL) | Free tier נדיב, Realtime מובנה, Anonymous Auth |
| **Real-time** | Supabase Realtime + Presence | כלול ב-Supabase, תמיכה ב-Typing Indicators |
| **Cache** | Vercel KV (Redis) | Sessions, rate limiting |
| **WhatsApp** | Green API | כבר יש חשבון פעיל |
| **Hosting** | Vercel | Zero-config deployment, Cron Jobs |
| **Auth (Guests)** | Supabase Anonymous Auth | RLS מובנה, ללא צורך ב-fingerprint ידני |
| **Auth (Agents)** | Supabase Auth | מובנה, תומך ב-RLS |

### 2.3 תלויות חיצוניות

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "@supabase/supabase-js": "^2.38.0",
    "@supabase/ssr": "^0.1.0",
    "@vercel/kv": "^1.0.0",
    "zod": "^3.22.0",
    "nanoid": "^5.0.0",
    "next-themes": "^0.4.0",
    "tailwindcss": "^3.4.0",
    "tailwindcss-animate": "^1.0.7",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "lucide-react": "^0.400.0",
    "@radix-ui/react-*": "latest"
  }
}
```

### 2.4 ספריות UI - סדר עדיפות

בעת בחירת קומפוננטות, יש לבדוק **לפי הסדר הבא**:

| עדיפות | ספריה | URL | שימוש עיקרי |
|--------|--------|-----|-------------|
| 1️⃣ | **Animate UI** | https://animate-ui.com/ | אנימציות, transitions, micro-interactions |
| 2️⃣ | **Dice UI** | https://www.diceui.com/ | קומפוננטות מורכבות, OTP input, combobox |
| 3️⃣ | **shadcn/ui** | https://ui.shadcn.com/ | קומפוננטות בסיס (Button, Input, Dialog, etc.) |

**כלל הברזל:**
```
לכל רכיב חדש:
1. בדוק אם קיים ב-Animate UI → אם כן, השתמש בו
2. אם לא קיים → בדוק ב-Dice UI → אם כן, השתמש בו
3. אם לא קיים → השתמש ב-shadcn/ui
4. אם לא קיים בשום מקום → בנה custom component
```

**דוגמאות לשימוש:**

| רכיב | ספריה מומלצת | סיבה |
|------|--------------|------|
| Button עם hover animation | Animate UI | אנימציות מובנות |
| Toast/Notification | Animate UI | כניסה/יציאה אנימטיבית |
| OTP Input | Dice UI | קומפוננטה מתמחה |
| Combobox/Autocomplete | Dice UI | פונקציונליות מתקדמת |
| Dialog/Modal | shadcn/ui | בסיסי ויציב |
| Form inputs | shadcn/ui | בסיסי עם validation |
| Dropdown Menu | shadcn/ui | בסיסי |
| Typing indicator animation | Animate UI | אנימציות |
| Message bubble animation | Animate UI | כניסה חלקה |

---

## 3. מודל נתונים

### 3.1 תרשים ERD

```
┌─────────────────────────────┐       ┌─────────────────────────────┐
│       conversations         │       │          messages           │
├─────────────────────────────┤       ├─────────────────────────────┤
│ id (UUID) PK                │───┐   │ id (UUID) PK                │
│ wp_user_id (INT)            │   │   │ conversation_id FK          │──┐
│ anon_user_id (UUID) FK      │   │   │ client_message_id (VARCHAR) │  │
│ guest_name                  │   └──►│ content (TEXT)              │  │
│ guest_contact               │       │ sender_type (ENUM)          │  │
│ contact_type (ENUM)         │       │ sender_id                   │  │
│ status (ENUM)               │       │ source (ENUM)               │  │
│ is_archived (BOOL)          │       │ wa_message_id               │  │
│ wa_chat_id                  │       │ wa_status (ENUM)            │  │
│ last_message_at             │       │ created_at                  │  │
│ last_read_at_customer       │       └─────────────────────────────┘  │
│ last_read_at_agent          │                                        │
│ created_at                  │       ┌─────────────────────────────┐  │
│ updated_at                  │       │          agents             │  │
└─────────────────────────────┘       ├─────────────────────────────┤  │
                                      │ id (UUID) PK                │  │
┌─────────────────────────────┐       │ auth_user_id (UUID) FK      │  │
│         settings            │       │ email (UNIQUE)              │  │
├─────────────────────────────┤       │ name                        │  │
│ id (UUID) PK                │       │ role (ENUM)                 │  │
│ key (VARCHAR)               │       │ is_active (BOOL)            │  │
│ value (JSONB)               │       │ is_online (BOOL)            │  │
│ updated_at                  │       │ last_seen_at                │  │
└─────────────────────────────┘       │ created_at                  │  │
                                      └─────────────────────────────┘  │
┌─────────────────────────────┐                                        │
│       quick_replies         │       ┌─────────────────────────────┐  │
├─────────────────────────────┤       │        faq_items            │  │
│ id (UUID) PK                │       ├─────────────────────────────┤  │
│ title                       │       │ id (UUID) PK                │  │
│ content                     │       │ question                    │  │
│ shortcut                    │       │ answer                      │  │
│ display_order (INT)         │       │ display_order (INT)         │  │
│ is_active (BOOL)            │       │ is_active (BOOL)            │  │
│ created_at                  │       │ click_count (INT)           │  │
└─────────────────────────────┘       │ created_at                  │  │
                                      └─────────────────────────────┘  │
                                                                       │
                                      ┌─────────────────────────────┐  │
                                      │      typing_indicators      │  │
                                      ├─────────────────────────────┤  │
                                      │ conversation_id FK          │◄─┘
                                      │ user_id                     │
                                      │ user_type (ENUM)            │
                                      │ is_typing (BOOL)            │
                                      │ updated_at                  │
                                      └─────────────────────────────┘
```

### 3.2 סכמת טבלאות (SQL)

```sql
-- Enum Types
CREATE TYPE conversation_status AS ENUM ('active', 'closed', 'pending');
CREATE TYPE contact_type AS ENUM ('email', 'whatsapp', 'none');
CREATE TYPE sender_type AS ENUM ('customer', 'agent', 'system', 'bot');
CREATE TYPE message_source AS ENUM ('widget', 'dashboard', 'whatsapp');
CREATE TYPE wa_message_status AS ENUM ('sent', 'delivered', 'read', 'failed');
CREATE TYPE agent_role AS ENUM ('admin', 'agent');
CREATE TYPE user_type AS ENUM ('customer', 'agent');

-- Conversations Table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- WordPress User (if logged in)
    wp_user_id INTEGER,
    wp_user_email VARCHAR(255),
    wp_user_name VARCHAR(255),

    -- Anonymous User (using Supabase Anonymous Auth)
    anon_user_id UUID REFERENCES auth.users(id),

    -- Guest contact info (collected during chat)
    guest_name VARCHAR(255),
    guest_contact VARCHAR(255),    -- Email or phone
    contact_type contact_type DEFAULT 'none',

    -- Conversation State
    status conversation_status DEFAULT 'active',
    is_archived BOOLEAN DEFAULT FALSE,

    -- WhatsApp Integration
    wa_chat_id VARCHAR(255),       -- WhatsApp chat ID for routing
    wa_phone VARCHAR(20),          -- Customer's WhatsApp number (if provided)
    moved_to_whatsapp BOOLEAN DEFAULT FALSE,

    -- Metadata
    last_message_at TIMESTAMP WITH TIME ZONE,
    last_message_preview VARCHAR(100),
    unread_count INTEGER DEFAULT 0,

    -- Read Receipts (for "blue checkmarks")
    last_read_at_customer TIMESTAMP WITH TIME ZONE,
    last_read_at_agent TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_wp_user UNIQUE (wp_user_id),
    CONSTRAINT unique_anon_user UNIQUE (anon_user_id)
);

-- Indexes for conversations
CREATE INDEX idx_conversations_status ON conversations(status) WHERE is_archived = FALSE;
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC) WHERE is_archived = FALSE;
CREATE INDEX idx_conversations_wp_user ON conversations(wp_user_id) WHERE wp_user_id IS NOT NULL;
CREATE INDEX idx_conversations_anon_user ON conversations(anon_user_id) WHERE anon_user_id IS NOT NULL;
CREATE INDEX idx_conversations_archived ON conversations(is_archived, status);

-- Messages Table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

    -- Client-side nonce for deduplication
    client_message_id VARCHAR(50),

    -- Content
    content TEXT NOT NULL,

    -- Sender Info
    sender_type sender_type NOT NULL,
    sender_id VARCHAR(255),        -- agent UUID, wp_user_id, anon_user_id, or 'system'
    sender_name VARCHAR(255),

    -- Source
    source message_source NOT NULL,

    -- WhatsApp specific
    wa_message_id VARCHAR(255),    -- Green API message ID
    wa_status wa_message_status,   -- Message delivery status

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_client_message UNIQUE (conversation_id, client_message_id)
);

-- Indexes for messages
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_messages_wa_message_id ON messages(wa_message_id) WHERE wa_message_id IS NOT NULL;

-- Agents Table
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Auth (linked to Supabase Auth)
    auth_user_id UUID UNIQUE REFERENCES auth.users(id),

    -- Profile
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),

    -- Role & Status
    role agent_role DEFAULT 'agent',
    is_active BOOLEAN DEFAULT TRUE,
    is_online BOOLEAN DEFAULT FALSE,
    last_seen_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FAQ Items Table
CREATE TABLE faq_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    question VARCHAR(500) NOT NULL,
    answer TEXT NOT NULL,

    -- Display
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    -- Analytics
    click_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quick Replies Table (for agents)
CREATE TABLE quick_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    shortcut VARCHAR(20),          -- e.g., "/pricing"

    -- Display
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Typing Indicators Table (for real-time typing status)
CREATE TABLE typing_indicators (
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    user_type user_type NOT NULL,
    is_typing BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    PRIMARY KEY (conversation_id, user_id)
);

-- Settings Table (Key-Value Store)
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default Settings
INSERT INTO settings (key, value) VALUES
('business_hours', '{
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
}'::jsonb),
('messages', '{
    "welcome": "Hey! 👋 How can we help you today?",
    "offline": "We are currently offline. Leave us a message and we will get back to you on the next business day!",
    "ask_contact": "Would you like us to reply via Email or WhatsApp?",
    "transferred_to_whatsapp": "Great! Continuing this conversation on WhatsApp...",
    "going_offline": "Our support team has ended their shift. We will get back to you as soon as possible!",
    "agent_joined": "You are now chatting with {agent_name}"
}'::jsonb),
('widget', '{
    "position": "right",
    "primaryColor": "#A31CAF",
    "secondaryColor": "#39C3EF"
}'::jsonb),
('whatsapp', '{
    "businessPhone": "+972XXXXXXXXX",
    "instanceId": "",
    "apiToken": ""
}'::jsonb),
('archive', '{
    "daysUntilArchive": 30,
    "autoArchiveEnabled": true
}'::jsonb);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Agents (can see all)
CREATE POLICY "Agents can view all conversations" ON conversations
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM agents WHERE auth_user_id = auth.uid() AND is_active = TRUE)
    );

CREATE POLICY "Agents can update all conversations" ON conversations
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM agents WHERE auth_user_id = auth.uid() AND is_active = TRUE)
    );

CREATE POLICY "Agents can view all messages" ON messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM agents WHERE auth_user_id = auth.uid() AND is_active = TRUE)
    );

CREATE POLICY "Agents can insert messages" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM agents WHERE auth_user_id = auth.uid() AND is_active = TRUE)
    );

-- RLS Policies for Anonymous Users (can only see their own)
CREATE POLICY "Anon users can view own conversations" ON conversations
    FOR SELECT USING (
        anon_user_id = auth.uid()
    );

CREATE POLICY "Anon users can insert conversations" ON conversations
    FOR INSERT WITH CHECK (
        anon_user_id = auth.uid()
    );

CREATE POLICY "Anon users can view own messages" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.anon_user_id = auth.uid()
        )
    );

CREATE POLICY "Anon users can insert messages to own conversations" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.anon_user_id = auth.uid()
        )
    );

-- RLS Policies for Typing Indicators
CREATE POLICY "Anyone can view typing indicators" ON typing_indicators
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own typing status" ON typing_indicators
    FOR ALL USING (
        user_id = auth.uid()::text
        OR EXISTS (SELECT 1 FROM agents WHERE auth_user_id = auth.uid() AND is_active = TRUE)
    );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update conversation metadata on new message
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET
        last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.content, 100),
        unread_count = CASE
            WHEN NEW.sender_type = 'customer' THEN unread_count + 1
            ELSE unread_count
        END,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_on_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_on_message();

-- Function to auto-archive old closed conversations
CREATE OR REPLACE FUNCTION archive_old_conversations()
RETURNS void AS $$
DECLARE
    days_threshold INTEGER;
BEGIN
    SELECT (value->>'daysUntilArchive')::INTEGER INTO days_threshold
    FROM settings WHERE key = 'archive';

    IF days_threshold IS NULL THEN
        days_threshold := 30;
    END IF;

    UPDATE conversations
    SET is_archived = TRUE, updated_at = NOW()
    WHERE status = 'closed'
    AND is_archived = FALSE
    AND updated_at < NOW() - (days_threshold || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;
```

### 3.3 אובייקטי TypeScript

```typescript
// types/database.ts

export interface Conversation {
  id: string;
  wp_user_id: number | null;
  wp_user_email: string | null;
  wp_user_name: string | null;
  anon_user_id: string | null;
  guest_name: string | null;
  guest_contact: string | null;
  contact_type: 'email' | 'whatsapp' | 'none';
  status: 'active' | 'closed' | 'pending';
  is_archived: boolean;
  wa_chat_id: string | null;
  wa_phone: string | null;
  moved_to_whatsapp: boolean;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  last_read_at_customer: string | null;
  last_read_at_agent: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  client_message_id: string | null;
  content: string;
  sender_type: 'customer' | 'agent' | 'system' | 'bot';
  sender_id: string | null;
  sender_name: string | null;
  source: 'widget' | 'dashboard' | 'whatsapp';
  wa_message_id: string | null;
  wa_status: 'sent' | 'delivered' | 'read' | 'failed' | null;
  created_at: string;
}

export interface Agent {
  id: string;
  auth_user_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: 'admin' | 'agent';
  is_active: boolean;
  is_online: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
  click_count: number;
  created_at: string;
  updated_at: string;
}

export interface QuickReply {
  id: string;
  title: string;
  content: string;
  shortcut: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface TypingIndicator {
  conversation_id: string;
  user_id: string;
  user_type: 'customer' | 'agent';
  is_typing: boolean;
  updated_at: string;
}

export interface Settings {
  business_hours: {
    timezone: string;
    schedule: {
      [day: string]: { start: string; end: string } | null;
    };
  };
  messages: {
    welcome: string;
    offline: string;
    ask_contact: string;
    transferred_to_whatsapp: string;
    going_offline: string;
    agent_joined: string;
  };
  widget: {
    position: 'left' | 'right';
    primaryColor: string;
    secondaryColor: string;
  };
  whatsapp: {
    businessPhone: string;
    instanceId: string;
    apiToken: string;
  };
  archive: {
    daysUntilArchive: number;
    autoArchiveEnabled: boolean;
  };
}

// Client-side message for optimistic updates
export interface PendingMessage extends Omit<Message, 'id' | 'created_at'> {
  client_message_id: string;
  status: 'pending' | 'sent' | 'failed';
  created_at: string;
}
```

---

## 4. API Endpoints

### 4.1 Chat Endpoints (Public)

#### POST /api/chat/init
יצירת או שליפת שיחה קיימת

**Request:**
```typescript
{
  // For WordPress logged-in users
  wp_user_id?: number;
  wp_user_email?: string;
  wp_user_name?: string;

  // For anonymous users - Supabase will handle auth via anon token
  // No need to pass identifier - auth.uid() is used
}
```

**Response:**
```typescript
{
  conversation: Conversation;
  messages: Message[];
  settings: {
    is_online: boolean;
    welcome_message: string;
    faq_items: FAQItem[];
  };
  supabase_anon_token?: string; // For first-time anonymous users
}
```

#### POST /api/chat/send
שליחת הודעה מהלקוח

**Request:**
```typescript
{
  conversation_id: string;
  content: string;
  client_message_id: string; // Client-generated nonce for deduplication
  sender_type: 'customer';
  sender_name?: string;
}
```

**Response:**
```typescript
{
  message: Message;
  wa_sent: boolean; // Whether forwarded to WhatsApp
}
```

**Deduplication Logic:**
```typescript
// If client_message_id already exists, return existing message instead of creating duplicate
const existing = await supabase
  .from('messages')
  .select()
  .eq('conversation_id', conversationId)
  .eq('client_message_id', clientMessageId)
  .single();

if (existing.data) {
  return { message: existing.data, wa_sent: false, deduplicated: true };
}
```

#### GET /api/chat/messages
שליפת הודעות

**Query Params:**
```
conversation_id: string
after?: string (message ID for pagination)
limit?: number (default: 50)
```

**Response:**
```typescript
{
  messages: Message[];
  has_more: boolean;
}
```

#### POST /api/chat/contact
הגדרת פרטי התקשרות (אימייל/וואטסאפ)

**Request:**
```typescript
{
  conversation_id: string;
  contact_type: 'email' | 'whatsapp';
  contact_value: string; // Email or phone number
  name?: string;
}
```

#### POST /api/chat/read
סימון הודעות כנקראו

**Request:**
```typescript
{
  conversation_id: string;
  reader_type: 'customer' | 'agent';
}
```

#### POST /api/chat/typing
עדכון סטטוס הקלדה

**Request:**
```typescript
{
  conversation_id: string;
  is_typing: boolean;
}
```

#### POST /api/chat/move-to-whatsapp
העברת השיחה לוואטסאפ

**Request:**
```typescript
{
  conversation_id: string;
  phone_number: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  whatsapp_link: string; // wa.me link with pre-filled message
}
```

### 4.2 Webhook Endpoint

#### POST /api/webhook/whatsapp
קבלת הודעות וסטטוסים מ-Green API

**Incoming Message:**
```typescript
{
  typeWebhook: 'incomingMessageReceived';
  instanceData: {
    idInstance: number;
    wid: string;
    typeInstance: string;
  };
  timestamp: number;
  idMessage: string;
  senderData: {
    chatId: string;
    sender: string;
    senderName: string;
  };
  messageData: {
    typeMessage: 'textMessage' | 'extendedTextMessage';
    textMessageData?: { textMessage: string };
    extendedTextMessageData?: { text: string };
  };
}
```

**Message Status Update (for read receipts):**
```typescript
{
  typeWebhook: 'outgoingMessageStatus';
  instanceData: { idInstance: number; wid: string };
  timestamp: number;
  idMessage: string;
  status: 'sent' | 'delivered' | 'read';
  chatId: string;
}
```

**Status Update Processing:**
```typescript
// app/api/webhook/whatsapp/route.ts

if (body.typeWebhook === 'outgoingMessageStatus') {
  const { idMessage, status, chatId } = body;

  // Update message status
  await supabase
    .from('messages')
    .update({ wa_status: status })
    .eq('wa_message_id', idMessage);

  // If read, update conversation's last_read_at_agent
  if (status === 'read') {
    await supabase
      .from('conversations')
      .update({ last_read_at_agent: new Date().toISOString() })
      .eq('wa_chat_id', chatId);
  }

  return Response.json({ ok: true });
}
```

### 4.3 Admin Endpoints (Protected)

#### GET /api/admin/conversations
רשימת שיחות לדשבורד

**Query Params:**
```
status?: 'active' | 'closed' | 'pending'
archived?: boolean (default: false)
search?: string
page?: number
limit?: number
```

**Response:**
```typescript
{
  conversations: (Conversation & {
    customer_name: string;
    customer_email: string;
  })[];
  total: number;
  page: number;
  total_pages: number;
}
```

#### POST /api/admin/messages/send
שליחת הודעה מנציג

**Request:**
```typescript
{
  conversation_id: string;
  content: string;
  agent_id: string;
}
```

#### PUT /api/admin/conversations/:id/status
עדכון סטטוס שיחה

**Request:**
```typescript
{
  status: 'active' | 'closed' | 'pending';
}
```

#### CRUD /api/admin/faq
ניהול שאלות נפוצות

#### CRUD /api/admin/quick-replies
ניהול תשובות מהירות

#### GET/PUT /api/admin/settings
ניהול הגדרות מערכת

#### CRUD /api/admin/agents
ניהול נציגים

### 4.4 Cron Endpoints

#### POST /api/cron/archive
ארכיון שיחות ישנות (מופעל ע"י Vercel Cron)

**Vercel Cron Config (vercel.json):**
```json
{
  "crons": [
    {
      "path": "/api/cron/archive",
      "schedule": "0 3 * * *"
    }
  ]
}
```

**Implementation:**
```typescript
// app/api/cron/archive/route.ts

export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Run archive function
  const { error } = await supabase.rpc('archive_old_conversations');

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
```

---

## 5. אינטגרציית WhatsApp (Green API)

### 5.1 הגדרות נדרשות ב-Green API

```
Instance Settings:
├── Webhook URL: https://your-domain.vercel.app/api/webhook/whatsapp
├── Webhook Token: [GENERATE_SECURE_TOKEN]
└── Notification Types:
    ├── incomingMessageReceived: ✓
    ├── outgoingMessageStatus: ✓  ← חדש! לצורך Read Receipts
    └── stateInstanceChanged: ✓
```

### 5.2 שליחת הודעה לוואטסאפ העסקי

כשלקוח שולח הודעה מהצ'אט, היא נשלחת לוואטסאפ העסקי:

```typescript
// lib/greenapi.ts

const GREEN_API_URL = 'https://api.green-api.com';

export async function sendToBusinessWhatsApp(
  instanceId: string,
  apiToken: string,
  conversationId: string,
  customerName: string,
  message: string
): Promise<{ success: boolean; messageId?: string }> {

  const businessChatId = 'YOUR_BUSINESS_PHONE@c.us';

  // Format message with conversation context
  const formattedMessage = `
📩 New message from chat

👤 Customer: ${customerName}
🔗 Session: ${conversationId.slice(0, 8)}

💬 Message:
${message}
`.trim();

  const response = await fetch(
    `${GREEN_API_URL}/waInstance${instanceId}/sendMessage/${apiToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: businessChatId,
        message: formattedMessage,
      }),
    }
  );

  const data = await response.json();
  return {
    success: response.ok,
    messageId: data.idMessage,
  };
}
```

### 5.3 קבלת תשובות מוואטסאפ

כשהנציג עונה מהוואטסאפ, צריך לזהות לאיזו שיחה זה שייך:

```typescript
// app/api/webhook/whatsapp/route.ts

export async function POST(request: Request) {
  const body = await request.json();

  // Handle message status updates (read receipts)
  if (body.typeWebhook === 'outgoingMessageStatus') {
    return handleMessageStatus(body);
  }

  if (body.typeWebhook !== 'incomingMessageReceived') {
    return Response.json({ ok: true });
  }

  const { senderData, messageData } = body;
  const messageText = messageData.textMessageData?.textMessage
    || messageData.extendedTextMessageData?.text;

  // Check if this is a reply from business WhatsApp
  // Look for session ID pattern in quoted message or conversation context
  const sessionMatch = messageText?.match(/Session:\s*([a-f0-9]{8})/i);

  if (sessionMatch) {
    const sessionPrefix = sessionMatch[1];

    // Find conversation by ID prefix
    const conversation = await findConversationByIdPrefix(sessionPrefix);

    if (conversation) {
      // Extract actual reply (remove the quoted context)
      const replyText = extractReplyText(messageText);

      // Store message
      await createMessage({
        conversation_id: conversation.id,
        content: replyText,
        sender_type: 'agent',
        sender_name: 'Support (via WhatsApp)',
        source: 'whatsapp',
        wa_message_id: body.idMessage,
      });

      // Trigger realtime update
      await supabase
        .channel(`conversation:${conversation.id}`)
        .send({
          type: 'broadcast',
          event: 'new_message',
          payload: { /* message data */ },
        });
    }
  }

  return Response.json({ ok: true });
}

async function handleMessageStatus(body: any) {
  const { idMessage, status } = body;

  // Update message status in DB
  await supabase
    .from('messages')
    .update({ wa_status: status })
    .eq('wa_message_id', idMessage);

  // If read, update conversation read timestamp
  if (status === 'read') {
    const { data: message } = await supabase
      .from('messages')
      .select('conversation_id')
      .eq('wa_message_id', idMessage)
      .single();

    if (message) {
      await supabase
        .from('conversations')
        .update({ last_read_at_agent: new Date().toISOString() })
        .eq('id', message.conversation_id);
    }
  }

  return Response.json({ ok: true });
}
```

### 5.4 זרימת מעבר לוואטסאפ ישיר

כשלקוח בוחר להמשיך בוואטסאפ:

```typescript
// Generate WhatsApp link with conversation history
export function generateWhatsAppLink(
  businessPhone: string,
  conversationId: string,
  messages: Message[]
): string {
  // Create summary of conversation
  const summary = messages
    .slice(-5) // Last 5 messages
    .map(m => `${m.sender_type === 'customer' ? 'Me' : 'Support'}: ${m.content}`)
    .join('\n');

  const prefilledText = encodeURIComponent(
    `Continuing conversation from website (${conversationId.slice(0, 8)})\n\n` +
    `Previous messages:\n${summary}\n\n` +
    `My question: `
  );

  return `https://wa.me/${businessPhone}?text=${prefilledText}`;
}
```

---

## 6. Widget צד לקוח

### 6.1 מבנה הקבצים

```
widget/
├── src/
│   ├── index.ts              # Entry point + Shadow DOM setup
│   ├── widget.tsx            # Main component
│   ├── components/
│   │   ├── ChatBubble.tsx    # Floating button
│   │   ├── ChatWindow.tsx    # Chat container
│   │   ├── MessageList.tsx   # Messages display
│   │   ├── MessageInput.tsx  # Input field
│   │   ├── FAQList.tsx       # Quick questions
│   │   ├── ContactForm.tsx   # Email/WhatsApp choice
│   │   ├── Header.tsx        # Window header
│   │   ├── TypingIndicator.tsx # "Agent is typing..."
│   │   └── ReadReceipt.tsx   # Blue checkmarks
│   ├── hooks/
│   │   ├── useChat.ts        # Chat logic
│   │   ├── useRealtime.ts    # Supabase subscription
│   │   ├── useTyping.ts      # Typing indicator logic
│   │   ├── usePresence.ts    # Supabase Presence
│   │   └── useSettings.ts    # Widget settings
│   ├── lib/
│   │   ├── api.ts            # API calls
│   │   ├── supabase.ts       # Supabase client + anon auth
│   │   ├── storage.ts        # LocalStorage
│   │   └── nonce.ts          # Message deduplication
│   ├── styles/
│   │   └── widget.css        # Scoped styles
│   └── types.ts
├── dist/
│   └── whizchat.min.js       # Bundled output (~30KB)
└── package.json
```

### 6.2 Shadow DOM + אתחול Widget

```typescript
// widget/src/index.ts

import { render } from 'preact';
import { ChatWidget } from './widget';
import styles from './styles/widget.css?inline';

interface WhizChatConfig {
  apiUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  // WordPress user data (if available)
  wpUser?: {
    id: number;
    email: string;
    name: string;
  };
  // Styling overrides
  position?: 'left' | 'right';
  primaryColor?: string;
  zIndex?: number;
}

declare global {
  interface Window {
    WhizChat: {
      init: (config: WhizChatConfig) => void;
      open: () => void;
      close: () => void;
      destroy: () => void;
    };
    // From WordPress (existing globals)
    isLogin?: boolean;
    profileName?: string;
    profileImg?: string;
    siteUrl?: string;
    whizAccount?: {
      user: {
        id: number;
        email: string;
        name: { first: string; last: string };
      };
    };
  }
}

let widgetContainer: HTMLDivElement | null = null;
let shadowRoot: ShadowRoot | null = null;

export function init(config: WhizChatConfig) {
  // Auto-detect WordPress user
  const wpUser = config.wpUser || detectWordPressUser();

  // Create container with Shadow DOM for style isolation
  widgetContainer = document.createElement('div');
  widgetContainer.id = 'whizchat-widget-host';
  document.body.appendChild(widgetContainer);

  // Attach Shadow DOM
  shadowRoot = widgetContainer.attachShadow({ mode: 'closed' });

  // Inject styles into Shadow DOM
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  shadowRoot.appendChild(styleElement);

  // Create render target inside Shadow DOM
  const renderTarget = document.createElement('div');
  renderTarget.id = 'whizchat-root';
  shadowRoot.appendChild(renderTarget);

  // Render Preact app into Shadow DOM
  render(
    <ChatWidget
      apiUrl={config.apiUrl}
      supabaseUrl={config.supabaseUrl}
      supabaseAnonKey={config.supabaseAnonKey}
      wpUser={wpUser}
      position={config.position || 'right'}
      primaryColor={config.primaryColor || '#A31CAF'}
    />,
    renderTarget
  );
}

export function destroy() {
  if (widgetContainer) {
    widgetContainer.remove();
    widgetContainer = null;
    shadowRoot = null;
  }
}

function detectWordPressUser(): WhizChatConfig['wpUser'] | undefined {
  if (window.isLogin && window.whizAccount?.user) {
    const { id, email, name } = window.whizAccount.user;
    return {
      id,
      email,
      name: `${name.first} ${name.last}`.trim(),
    };
  }
  return undefined;
}

// Export to window
window.WhizChat = { init, open: () => {}, close: () => {}, destroy };
```

### 6.3 הטמעה באתר WordPress

```html
<!-- In WordPress footer or via plugin -->
<script src="https://your-domain.vercel.app/widget/whizchat.min.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    WhizChat.init({
      apiUrl: 'https://your-domain.vercel.app/api',
      supabaseUrl: 'https://xxx.supabase.co',
      supabaseAnonKey: 'eyJ...'
      // WordPress user data is auto-detected from window globals
    });
  });
</script>
```

### 6.4 Supabase Anonymous Auth

```typescript
// widget/src/lib/supabase.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

export async function initSupabase(url: string, anonKey: string): Promise<SupabaseClient> {
  supabase = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      storageKey: 'whizchat-auth',
    },
  });

  // Check for existing session
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    // Create anonymous session
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error('Failed to create anonymous session:', error);
    }
  }

  return supabase;
}

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase not initialized');
  }
  return supabase;
}

export async function getAnonUserId(): Promise<string | null> {
  const { data: { user } } = await getSupabase().auth.getUser();
  return user?.id || null;
}
```

### 6.5 Message Deduplication (Nonce)

```typescript
// widget/src/lib/nonce.ts

import { nanoid } from 'nanoid';

export function generateMessageNonce(): string {
  return nanoid(12); // e.g., "V1StGXR8_Z5j"
}

// In useChat hook
export function useChat({ apiUrl, wpUser }: ChatHookProps) {
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);

  async function sendMessage(content: string) {
    const clientMessageId = generateMessageNonce();

    // Optimistic update - show message immediately
    const optimisticMessage: PendingMessage = {
      client_message_id: clientMessageId,
      conversation_id: conversation!.id,
      content,
      sender_type: 'customer',
      sender_name: wpUser?.name || 'Guest',
      source: 'widget',
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    setPendingMessages(prev => [...prev, optimisticMessage]);

    try {
      const response = await fetch(`${apiUrl}/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversation!.id,
          content,
          client_message_id: clientMessageId,
          sender_type: 'customer',
        }),
      });

      const data = await response.json();

      // Remove from pending, real message will arrive via realtime
      setPendingMessages(prev =>
        prev.filter(m => m.client_message_id !== clientMessageId)
      );

    } catch (error) {
      // Mark as failed
      setPendingMessages(prev =>
        prev.map(m =>
          m.client_message_id === clientMessageId
            ? { ...m, status: 'failed' }
            : m
        )
      );
    }
  }

  return { sendMessage, pendingMessages, /* ... */ };
}
```

### 6.6 קומפוננטת Widget ראשית

```tsx
// widget/src/widget.tsx

import { useState, useEffect } from 'preact/hooks';
import { ChatBubble } from './components/ChatBubble';
import { ChatWindow } from './components/ChatWindow';
import { useChat } from './hooks/useChat';
import { useRealtime } from './hooks/useRealtime';
import { useTyping } from './hooks/useTyping';
import { initSupabase } from './lib/supabase';

interface Props {
  apiUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  wpUser?: { id: number; email: string; name: string };
  position: 'left' | 'right';
  primaryColor: string;
}

export function ChatWidget({
  apiUrl,
  supabaseUrl,
  supabaseAnonKey,
  wpUser,
  position,
  primaryColor
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Initialize Supabase with anonymous auth
  useEffect(() => {
    initSupabase(supabaseUrl, supabaseAnonKey).then(() => {
      setIsReady(true);
    });
  }, []);

  const {
    conversation,
    messages,
    pendingMessages,
    settings,
    isOnline,
    sendMessage,
    setContactInfo,
    initChat,
    markAsRead,
  } = useChat({ apiUrl, wpUser });

  const { isAgentTyping, setCustomerTyping } = useTyping({
    conversationId: conversation?.id,
  });

  // Subscribe to realtime updates
  useRealtime({
    conversationId: conversation?.id,
    onNewMessage: (message) => {
      if (!isOpen && message.sender_type !== 'customer') {
        setHasUnread(true);
      }
    },
  });

  useEffect(() => {
    if (isReady) {
      initChat();
    }
  }, [isReady]);

  // Mark as read when opening chat
  useEffect(() => {
    if (isOpen && conversation) {
      markAsRead();
    }
  }, [isOpen, conversation]);

  if (!isReady) return null;

  return (
    <div
      class="whizchat-container"
      style={{ [`--whizchat-primary`]: primaryColor }}
      dir="ltr"
    >
      {isOpen ? (
        <ChatWindow
          conversation={conversation}
          messages={[...messages, ...pendingMessages]}
          settings={settings}
          isOnline={isOnline}
          wpUser={wpUser}
          position={position}
          isAgentTyping={isAgentTyping}
          onClose={() => setIsOpen(false)}
          onSend={sendMessage}
          onSetContact={setContactInfo}
          onTyping={setCustomerTyping}
        />
      ) : (
        <ChatBubble
          position={position}
          hasUnread={hasUnread}
          onClick={() => {
            setIsOpen(true);
            setHasUnread(false);
          }}
        />
      )}
    </div>
  );
}
```

---

## 7. דשבורד ניהול

### 7.1 מבנה העמודים

```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx          # Agent login
│   └── layout.tsx
├── (dashboard)/
│   ├── layout.tsx            # Dashboard layout (RTL)
│   ├── page.tsx              # Conversations list
│   ├── conversations/
│   │   └── [id]/
│   │       └── page.tsx      # Single conversation
│   ├── settings/
│   │   ├── page.tsx          # General settings
│   │   ├── hours/
│   │   │   └── page.tsx      # Business hours
│   │   ├── messages/
│   │   │   └── page.tsx      # Auto messages
│   │   ├── faq/
│   │   │   └── page.tsx      # FAQ management
│   │   ├── quick-replies/
│   │   │   └── page.tsx      # Quick replies
│   │   ├── archive/
│   │   │   └── page.tsx      # Archive settings
│   │   └── whatsapp/
│   │       └── page.tsx      # WhatsApp settings
│   ├── agents/
│   │   └── page.tsx          # Agent management
│   └── analytics/
│       └── page.tsx          # Statistics
└── api/
    └── ...
```

### 7.2 תצוגת שיחות

```tsx
// app/(dashboard)/page.tsx

export default function ConversationsPage() {
  return (
    <div className="flex h-screen" dir="rtl">
      {/* Sidebar - Conversations List */}
      <aside className="w-80 border-l bg-gray-50">
        <ConversationsList />
      </aside>

      {/* Main - Selected Conversation */}
      <main className="flex-1 flex flex-col">
        <ConversationView />
      </main>
    </div>
  );
}
```

### 7.3 Real-time Updates בדשבורד

```tsx
// hooks/useConversations.ts

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Initial fetch (exclude archived by default)
    fetchConversations({ archived: false });

    // Subscribe to changes
    const channel = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          handleConversationChange(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          handleNewMessage(payload);
          playNotificationSound();
          showBrowserNotification(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { conversations, /* ... */ };
}
```

### 7.4 Typing Indicator (Presence)

```tsx
// hooks/usePresence.ts

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';

interface TypingUser {
  id: string;
  name: string;
  type: 'customer' | 'agent';
}

export function usePresence(conversationId: string) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase.channel(`presence:${conversationId}`, {
      config: {
        presence: {
          key: 'typing',
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typing = Object.values(state).flat().filter((u: any) => u.is_typing);
        setTypingUsers(typing as TypingUser[]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const setTyping = async (isTyping: boolean, user: TypingUser) => {
    const channel = supabase.channel(`presence:${conversationId}`);
    await channel.track({
      ...user,
      is_typing: isTyping,
    });
  };

  return { typingUsers, setTyping };
}
```

### 7.5 Push Notifications

```typescript
// lib/notifications.ts

export async function requestNotificationPermission() {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

export function showNotification(title: string, body: string, onClick?: () => void) {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: '/icon.png',
      tag: 'whizchat-message',
    });

    if (onClick) {
      notification.onclick = onClick;
    }
  }
}

export function playNotificationSound() {
  const audio = new Audio('/sounds/notification.mp3');
  audio.volume = 0.5;
  audio.play().catch(() => {
    // Autoplay blocked, ignore
  });
}
```

---

## 8. Real-time Communication

### 8.1 Supabase Realtime Setup

```typescript
// lib/supabase/realtime.ts

import { createClient } from '@supabase/supabase-js';

export function subscribeToConversation(
  conversationId: string,
  onMessage: (message: Message) => void,
  onTyping: (isTyping: boolean, userName: string) => void
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Subscribe to new messages
  const messagesChannel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onMessage(payload.new as Message);
      }
    )
    .subscribe();

  // Subscribe to typing indicators using Presence
  const presenceChannel = supabase.channel(`presence:${conversationId}`)
    .on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      const typingAgents = Object.values(state)
        .flat()
        .filter((u: any) => u.type === 'agent' && u.is_typing);

      if (typingAgents.length > 0) {
        onTyping(true, (typingAgents[0] as any).name);
      } else {
        onTyping(false, '');
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(messagesChannel);
    supabase.removeChannel(presenceChannel);
  };
}
```

### 8.2 Widget Real-time Hook

```typescript
// widget/src/hooks/useRealtime.ts

import { useEffect, useRef } from 'preact/hooks';
import { getSupabase } from '../lib/supabase';

interface Props {
  conversationId?: string;
  onNewMessage: (message: Message) => void;
  onReadReceipt?: (timestamp: string) => void;
}

export function useRealtime({ conversationId, onNewMessage, onReadReceipt }: Props) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    const supabase = getSupabase();

    // Subscribe to new messages
    channelRef.current = supabase
      .channel(`widget:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = payload.new as Message;
          // Only show messages not sent by customer
          if (message.sender_type !== 'customer') {
            onNewMessage(message);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          // Check if read receipt updated
          const newData = payload.new as Conversation;
          if (newData.last_read_at_agent && onReadReceipt) {
            onReadReceipt(newData.last_read_at_agent);
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [conversationId]);
}
```

### 8.3 Typing Indicator Hook

```typescript
// widget/src/hooks/useTyping.ts

import { useEffect, useState, useRef } from 'preact/hooks';
import { getSupabase, getAnonUserId } from '../lib/supabase';

interface Props {
  conversationId?: string;
}

export function useTyping({ conversationId }: Props) {
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [agentName, setAgentName] = useState('');
  const typingTimeoutRef = useRef<number | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    const supabase = getSupabase();

    channelRef.current = supabase.channel(`presence:${conversationId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channelRef.current!.presenceState();
        const typingAgents = Object.values(state)
          .flat()
          .filter((u: any) => u.type === 'agent' && u.is_typing);

        if (typingAgents.length > 0) {
          setIsAgentTyping(true);
          setAgentName((typingAgents[0] as any).name);
        } else {
          setIsAgentTyping(false);
          setAgentName('');
        }
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [conversationId]);

  const setCustomerTyping = async (isTyping: boolean) => {
    if (!conversationId || !channelRef.current) return;

    const userId = await getAnonUserId();

    await channelRef.current.track({
      id: userId,
      type: 'customer',
      is_typing: isTyping,
    });

    // Auto-clear typing after 3 seconds of no input
    if (isTyping) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = window.setTimeout(() => {
        setCustomerTyping(false);
      }, 3000);
    }
  };

  return { isAgentTyping, agentName, setCustomerTyping };
}
```

---

## 9. הודעות אוטומטיות ו-FAQ

### 9.1 הודעות מערכת

| מפתח | שימוש | ברירת מחדל (EN) |
|------|-------|-----------------|
| `welcome` | פתיחת צ'אט | "Hey! 👋 How can we help you today?" |
| `offline` | מחוץ לשעות | "We are currently offline. Leave us a message and we will get back to you on the next business day!" |
| `ask_contact` | בקשת פרטים | "Would you like us to reply via Email or WhatsApp?" |
| `transferred_to_whatsapp` | מעבר לוואטסאפ | "Great! Continuing this conversation on WhatsApp..." |
| `going_offline` | שעות נגמרו באמצע שיחה | "Our support team has ended their shift. We will get back to you as soon as possible!" |
| `agent_joined` | נציג הצטרף | "You are now chatting with {agent_name}" |

### 9.2 לוגיקת שעות פעילות

```typescript
// lib/business-hours.ts

import { Settings } from '@/types/database';

export function isWithinBusinessHours(settings: Settings): boolean {
  const { timezone, schedule } = settings.business_hours;

  // Get current time in business timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const weekday = parts.find(p => p.type === 'weekday')?.value.toLowerCase();
  const hour = parts.find(p => p.type === 'hour')?.value;
  const minute = parts.find(p => p.type === 'minute')?.value;

  const daySchedule = schedule[weekday!];
  if (!daySchedule) return false;

  const currentTime = `${hour}:${minute}`;
  return currentTime >= daySchedule.start && currentTime <= daySchedule.end;
}

// Check and send going-offline message for active conversations
export async function handleBusinessHoursTransition(
  wasOnline: boolean,
  isNowOnline: boolean,
  supabase: SupabaseClient
) {
  // Business hours just ended
  if (wasOnline && !isNowOnline) {
    // Find all active conversations with recent activity
    const { data: activeConversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('status', 'active')
      .gte('last_message_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()); // Active in last 30 min

    // Send "going offline" message to each
    for (const conv of activeConversations || []) {
      await supabase.from('messages').insert({
        conversation_id: conv.id,
        content: settings.messages.going_offline,
        sender_type: 'system',
        source: 'widget',
      });
    }
  }
}
```

### 9.3 FAQ - שאלות נפוצות

מוצגות ללקוח כשהוא פותח את הצ'אט:

```typescript
// Example FAQ items
const defaultFAQs: FAQItem[] = [
  {
    question: "What are your pricing plans?",
    answer: "We offer three plans: Starter ($9/mo), Pro ($29/mo), and Business ($99/mo). Visit our pricing page for full details.",
  },
  {
    question: "How do I get started?",
    answer: "1. Sign up for a free account\n2. Install our WordPress plugin\n3. Activate your license\n\nNeed help? We're here!",
  },
  {
    question: "Do you offer refunds?",
    answer: "Yes! We offer a 30-day money-back guarantee. If you're not satisfied, contact us for a full refund.",
  },
  {
    question: "What's your support hours?",
    answer: "Our support team is available Sunday-Thursday, 9:00 AM - 6:00 PM (Israel Time).",
  },
];
```

### 9.4 Quick Replies לנציגים

```typescript
// Example quick replies
const defaultQuickReplies: QuickReply[] = [
  {
    title: "Greeting",
    content: "Hi {customer_name}! Thanks for reaching out. How can I help you today?",
    shortcut: "/hi",
  },
  {
    title: "Pricing Info",
    content: "Our pricing plans start at $9/month. You can see all details at: https://whizmanage.com/pricing",
    shortcut: "/pricing",
  },
  {
    title: "Documentation",
    content: "You can find our documentation and guides at: https://docs.whizmanage.com",
    shortcut: "/docs",
  },
  {
    title: "Closing - Resolved",
    content: "Great! I'm glad I could help. If you have any other questions, feel free to reach out anytime. Have a great day!",
    shortcut: "/bye",
  },
];
```

---

## 10. אבטחה ואימות

### 10.1 אימות אנונימי (Supabase Anonymous Auth)

```typescript
// widget/src/lib/supabase.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

export async function initSupabase(url: string, anonKey: string): Promise<SupabaseClient> {
  supabase = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      storageKey: 'whizchat-auth',
    },
  });

  // Check for existing session
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    // Create anonymous session - this user can only access their own data via RLS
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error('Failed to create anonymous session:', error);
      throw error;
    }
  }

  return supabase;
}

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase not initialized. Call initSupabase first.');
  }
  return supabase;
}

export async function getAnonUserId(): Promise<string | null> {
  const { data: { user } } = await getSupabase().auth.getUser();
  return user?.id || null;
}

// Link anonymous user to WordPress user (for logged-in users)
export async function linkToWordPressUser(wpUserId: number, wpEmail: string) {
  const supabase = getSupabase();
  const anonUserId = await getAnonUserId();

  if (!anonUserId) return;

  // Update conversation to include WordPress user info
  await supabase
    .from('conversations')
    .update({
      wp_user_id: wpUserId,
      wp_user_email: wpEmail,
    })
    .eq('anon_user_id', anonUserId);
}
```

### 10.2 אימות משתמש WordPress

```typescript
// app/api/auth/verify-wp/route.ts

export async function POST(request: Request) {
  const { wp_user_id, wp_user_email, site_url, nonce } = await request.json();

  // Verify with WordPress site
  const wpResponse = await fetch(`${site_url}/wp-json/whizchat/v1/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: wp_user_id, nonce }),
  });

  if (!wpResponse.ok) {
    return Response.json({ error: 'Invalid user' }, { status: 401 });
  }

  // Create session token
  const token = await createSessionToken(wp_user_id, wp_user_email);

  return Response.json({ token });
}
```

### 10.3 WordPress Verification Endpoint

צריך להוסיף ל-WordPress plugin:

```php
// In innovative-design.php

add_action('rest_api_init', function() {
    register_rest_route('whizchat/v1', '/verify', [
        'methods' => 'POST',
        'callback' => 'whizchat_verify_user',
        'permission_callback' => '__return_true',
    ]);
});

function whizchat_verify_user($request) {
    $user_id = $request->get_param('user_id');
    $nonce = $request->get_param('nonce');

    // Verify user exists and is logged in
    $user = get_user_by('ID', $user_id);
    if (!$user) {
        return new WP_Error('invalid_user', 'User not found', ['status' => 404]);
    }

    // Return user data
    return [
        'valid' => true,
        'user' => [
            'id' => $user->ID,
            'email' => $user->user_email,
            'name' => $user->display_name,
        ],
    ];
}
```

### 10.4 Agent Authentication

נציגים מתחברים דרך Supabase Auth:

```typescript
// app/(auth)/login/page.tsx

export default function AgentLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const supabase = createClientComponentClient();

  async function handleLogin(e: FormEvent) {
    e.preventDefault();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error('Invalid credentials');
      return;
    }

    // Verify user is an agent
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('auth_user_id', data.user.id)
      .single();

    if (!agent || !agent.is_active) {
      await supabase.auth.signOut();
      toast.error('Access denied');
      return;
    }

    router.push('/');
  }

  // ...
}
```

### 10.5 Rate Limiting

```typescript
// middleware.ts

import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 requests per minute
});

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/chat')) {
    const ip = request.ip ?? '127.0.0.1';
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);

    if (!success) {
      return Response.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          },
        }
      );
    }
  }

  return NextResponse.next();
}
```

### 10.6 Environment Variables

```env
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Green API
GREEN_API_INSTANCE_ID=xxx
GREEN_API_TOKEN=xxx
GREEN_API_WEBHOOK_TOKEN=xxx

# WhatsApp Business
WHATSAPP_BUSINESS_PHONE=972XXXXXXXXX

# Vercel KV (for rate limiting)
KV_URL=xxx
KV_REST_API_URL=xxx
KV_REST_API_TOKEN=xxx
KV_REST_API_READ_ONLY_TOKEN=xxx

# Cron Job Security
CRON_SECRET=xxx

# App
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
WORDPRESS_SITES=https://whizmanage.com
```

---

## 11. עיצוב ו-UI

### 11.1 צבעי המותג (Whizmanage Brand Colors)

הגרדיאנט הראשי של המותג (מתוך הקוד הקיים):

```
bg-gradient-to-r from-fuchsia-600 to-pink-600
```

לפעמים עם via:
```
bg-gradient-to-r from-fuchsia-700 via-pink-600 to-fuchsia-600
```

```typescript
// lib/theme/brand-colors.ts

export const brandColors = {
  // Primary Gradient Colors (Fuchsia → Pink)
  fuchsia: {
    500: '#D946EF',
    600: '#C026D3',  // ← Primary gradient start
    700: '#A21CAF',
  },
  pink: {
    500: '#EC4899',
    600: '#DB2777',  // ← Primary gradient end
  },

  // Charcoal - Dark background
  charcoal: '#08090A',

  // Secondary - Cyan (לשימוש משני)
  cyan: {
    DEFAULT: '#39C3EF',
    hover: '#22B8E6',
  },
} as const;

// CSS Gradient Variables
export const brandGradient = 'linear-gradient(to right, #C026D3, #DB2777)';
export const brandGradientFull = 'linear-gradient(to right, #A21CAF, #DB2777, #C026D3)';
```

### 11.2 Dark/Light Mode - הגדרת ערכת נושא

```css
/* globals.css - Based on existing Whizmanage theme */

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  /* ========================================
     LIGHT MODE (Default)
     ======================================== */
  :root {
    /* Brand Gradient Colors (Fuchsia → Pink) */
    --brand-fuchsia-600: 292 84% 49%;       /* #C026D3 - gradient start */
    --brand-fuchsia-700: 293 69% 40%;       /* #A21CAF */
    --brand-pink-500: 330 81% 60%;          /* #EC4899 */
    --brand-pink-600: 333 71% 51%;          /* #DB2777 - gradient end */
    --brand-charcoal: 210 11% 4%;           /* #08090A */
    --brand-cyan: 193 83% 58%;              /* #39C3EF */

    /* Semantic Colors */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;

    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;

    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;

    --primary: 292 84% 49%;                  /* fuchsia-600 */
    --primary-foreground: 0 0% 100%;

    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;

    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;

    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;

    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 100%;

    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 292 84% 49%;                     /* fuchsia-600 */

    /* Widget Specific */
    --widget-bg: 0 0% 100%;
    --widget-bg-secondary: 210 40% 98%;
    --widget-text: 222.2 84% 4.9%;
    --widget-text-secondary: 215.4 16.3% 46.9%;
    --widget-border: 214.3 31.8% 91.4%;

    /* Status Colors */
    --status-online: 160 84% 39%;           /* #10B981 */
    --status-offline: 215.4 16.3% 46.9%;    /* #6B7280 */
    --status-unread: 0 84.2% 60.2%;         /* #EF4444 */
    --status-read: 217 91% 60%;             /* #3B82F6 */

    --radius: 0.5rem;
  }

  /* ========================================
     DARK MODE
     ======================================== */
  .dark {
    /* Brand Gradient Colors - Slightly brighter for dark mode */
    --brand-fuchsia-600: 292 91% 53%;       /* Brighter #D946EF */
    --brand-fuchsia-700: 293 69% 45%;       /* Brighter */
    --brand-pink-500: 330 81% 65%;          /* Brighter */
    --brand-pink-600: 333 71% 56%;          /* Brighter */
    --brand-charcoal: 210 11% 4%;
    --brand-cyan: 193 83% 65%;

    /* Semantic Colors */
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;

    --card: 222.2 84% 6%;
    --card-foreground: 210 40% 98%;

    --popover: 222.2 84% 6%;
    --popover-foreground: 210 40% 98%;

    --primary: 292 91% 53%;                  /* brighter fuchsia-600 */
    --primary-foreground: 0 0% 100%;

    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;

    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;

    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;

    --destructive: 0 62.8% 50.6%;
    --destructive-foreground: 210 40% 98%;

    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 292 91% 53%;                     /* brighter fuchsia-600 */

    /* Widget Specific - Dark */
    --widget-bg: 222.2 84% 6%;
    --widget-bg-secondary: 217.2 32.6% 12%;
    --widget-text: 210 40% 98%;
    --widget-text-secondary: 215 20.2% 65.1%;
    --widget-border: 217.2 32.6% 17.5%;

    /* Status Colors - Dark mode adjusted */
    --status-online: 160 84% 45%;
    --status-offline: 215 20.2% 55%;
    --status-unread: 0 84.2% 65%;
    --status-read: 217 91% 65%;
  }
}
```

### 11.3 Theme Provider Setup

```tsx
// app/providers.tsx

'use client';

import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}

// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### 11.4 Theme Toggle Component

```tsx
// components/ui/theme-toggle.tsx

'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
// Use Animate UI for smooth transition if available
import { AnimatedButton } from '@animate-ui/react'; // Check if exists first

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="relative"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
```

### 11.5 Tailwind Config with Brand Colors

```typescript
// tailwind.config.ts

import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand gradient colors from Whizmanage
        brand: {
          fuchsia: {
            600: 'hsl(var(--brand-fuchsia-600))',
            700: 'hsl(var(--brand-fuchsia-700))',
          },
          pink: {
            500: 'hsl(var(--brand-pink-500))',
            600: 'hsl(var(--brand-pink-600))',
          },
          charcoal: 'hsl(var(--brand-charcoal))',
          cyan: 'hsl(var(--brand-cyan))',
        },
        // shadcn/ui compatible
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        // Widget specific
        widget: {
          bg: 'hsl(var(--widget-bg))',
          'bg-secondary': 'hsl(var(--widget-bg-secondary))',
          text: 'hsl(var(--widget-text))',
          'text-secondary': 'hsl(var(--widget-text-secondary))',
          border: 'hsl(var(--widget-border))',
        },
        // Status
        status: {
          online: 'hsl(var(--status-online))',
          offline: 'hsl(var(--status-offline))',
          unread: 'hsl(var(--status-unread))',
          read: 'hsl(var(--status-read))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      // Brand gradients (fuchsia-600 → pink-600)
      backgroundImage: {
        'brand-gradient': 'linear-gradient(to right, hsl(var(--brand-fuchsia-600)), hsl(var(--brand-pink-600)))',
        'brand-gradient-full': 'linear-gradient(to right, hsl(var(--brand-fuchsia-700)), hsl(var(--brand-pink-600)), hsl(var(--brand-fuchsia-600)))',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
        'typing-bounce': {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-4px)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'pulse-dot': 'pulse-dot 2s infinite',
        'typing-bounce': 'typing-bounce 1.4s infinite ease-in-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

### 11.6 Widget Theme Support (Inside Shadow DOM)

```typescript
// widget/src/lib/theme.ts

export type WidgetTheme = 'light' | 'dark' | 'system';

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function initWidgetTheme(preference: WidgetTheme = 'system'): 'light' | 'dark' {
  const theme = preference === 'system' ? getSystemTheme() : preference;

  // Store preference
  localStorage.setItem('whizchat-theme', preference);

  return theme;
}

// Listen for system theme changes
export function watchSystemTheme(callback: (theme: 'light' | 'dark') => void) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches ? 'dark' : 'light');
  };

  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}
```

```tsx
// widget/src/widget.tsx - Theme support

import { useState, useEffect } from 'preact/hooks';
import { initWidgetTheme, watchSystemTheme, WidgetTheme } from './lib/theme';

export function ChatWidget({ /* ... */ }: Props) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Initialize theme
    const savedPreference = localStorage.getItem('whizchat-theme') as WidgetTheme || 'system';
    setTheme(initWidgetTheme(savedPreference));

    // Watch for system changes if preference is 'system'
    if (savedPreference === 'system') {
      return watchSystemTheme(setTheme);
    }
  }, []);

  return (
    <div
      class={`whizchat-container ${theme === 'dark' ? 'dark' : ''}`}
      style={{ [`--whizchat-primary`]: primaryColor }}
      dir="ltr"
    >
      {/* ... */}
    </div>
  );
}
```

### 11.7 Widget CSS with Dark Mode

```css
/* widget/src/styles/widget.css */

/* Reset - ensures clean slate inside Shadow DOM */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.whizchat-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  direction: ltr;
  color-scheme: light;

  /* Light Mode Variables (Default) - Brand Gradient */
  --whizchat-fuchsia-600: #C026D3;
  --whizchat-fuchsia-700: #A21CAF;
  --whizchat-pink-500: #EC4899;
  --whizchat-pink-600: #DB2777;
  --whizchat-cyan: #39C3EF;
  --whizchat-bg: #FFFFFF;
  --whizchat-bg-secondary: #F9FAFB;
  --whizchat-text: #1F2937;
  --whizchat-text-secondary: #6B7280;
  --whizchat-border: #E5E7EB;
  --whizchat-online: #10B981;
  --whizchat-offline: #6B7280;
  --whizchat-unread: #EF4444;
  --whizchat-read: #3B82F6;
  --whizchat-shadow: rgba(0, 0, 0, 0.15);
}

/* Dark Mode Variables */
.whizchat-container.dark {
  color-scheme: dark;

  /* Brand Gradient - Brighter for dark mode */
  --whizchat-fuchsia-600: #D946EF;
  --whizchat-fuchsia-700: #C026D3;
  --whizchat-pink-500: #F472B6;
  --whizchat-pink-600: #EC4899;
  --whizchat-cyan: #67E8F9;
  --whizchat-bg: #0F172A;
  --whizchat-bg-secondary: #1E293B;
  --whizchat-text: #F8FAFC;
  --whizchat-text-secondary: #94A3B8;
  --whizchat-border: #334155;
  --whizchat-online: #34D399;
  --whizchat-offline: #94A3B8;
  --whizchat-unread: #F87171;
  --whizchat-read: #60A5FA;
  --whizchat-shadow: rgba(0, 0, 0, 0.4);
}

/* Chat Bubble - With brand gradient */
.whizchat-bubble {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--whizchat-fuchsia-600), var(--whizchat-pink-600));
  box-shadow: 0 4px 12px var(--whizchat-shadow);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
  z-index: 2147483647;
}

.whizchat-bubble:hover {
  transform: scale(1.05);
  background: linear-gradient(135deg, var(--whizchat-fuchsia-700), var(--whizchat-pink-600));
}

/* Chat Window */
.whizchat-window {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 380px;
  height: 600px;
  max-height: calc(100vh - 40px);
  background: var(--whizchat-bg);
  border-radius: 16px;
  box-shadow: 0 8px 32px var(--whizchat-shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 2147483647;
  border: 1px solid var(--whizchat-border);
  transition: background 0.2s, border-color 0.2s;
}

/* Header with brand gradient (fuchsia → pink) */
.whizchat-header {
  padding: 16px;
  background: linear-gradient(to right, var(--whizchat-fuchsia-600), var(--whizchat-pink-600));
  color: white;
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Messages container */
.whizchat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--whizchat-bg);
}

/* Message bubbles */
.whizchat-message {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 14px;
  position: relative;
  animation: fade-in 0.3s ease-out;
}

.whizchat-message.customer {
  align-self: flex-end;
  background: linear-gradient(135deg, var(--whizchat-fuchsia-600), var(--whizchat-pink-600));
  color: white;
  border-bottom-right-radius: 4px;
}

.whizchat-message.agent,
.whizchat-message.system,
.whizchat-message.bot {
  align-self: flex-start;
  background: var(--whizchat-bg-secondary);
  color: var(--whizchat-text);
  border-bottom-left-radius: 4px;
}

/* Input area */
.whizchat-input-container {
  padding: 12px 16px;
  border-top: 1px solid var(--whizchat-border);
  background: var(--whizchat-bg);
  display: flex;
  gap: 8px;
}

.whizchat-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--whizchat-border);
  border-radius: 24px;
  font-size: 14px;
  outline: none;
  background: var(--whizchat-bg);
  color: var(--whizchat-text);
  transition: border-color 0.2s, background 0.2s;
}

.whizchat-input::placeholder {
  color: var(--whizchat-text-secondary);
}

.whizchat-input:focus {
  border-color: var(--whizchat-fuchsia-600);
}

/* Send button - With gradient */
.whizchat-send-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--whizchat-fuchsia-600), var(--whizchat-pink-600));
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, transform 0.2s;
}

.whizchat-send-btn:hover {
  background: linear-gradient(135deg, var(--whizchat-fuchsia-700), var(--whizchat-pink-600));
  transform: scale(1.05);
}

/* FAQ items */
.whizchat-faq-item {
  padding: 8px 12px;
  margin-bottom: 6px;
  background: var(--whizchat-bg-secondary);
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  color: var(--whizchat-text);
  transition: background 0.2s;
}

.whizchat-faq-item:hover {
  background: var(--whizchat-border);
}

/* Animations */
@keyframes fade-in {
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
}

/* Mobile Responsive */
@media (max-width: 480px) {
  .whizchat-window {
    width: 100%;
    height: 100%;
    max-height: 100%;
    bottom: 0;
    right: 0;
    border-radius: 0;
  }
}
```

### 11.8 Dashboard Styling (RTL)

```css
/* Dashboard specific styles */

.dashboard-layout {
  direction: rtl;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.conversation-list {
  border-left: 1px solid var(--border);
}

.message-agent {
  align-self: flex-end; /* Agent messages on right in RTL */
}

.message-customer {
  align-self: flex-start; /* Customer messages on left in RTL */
}
```

### 11.9 Animated Icons - הנחיות שימוש

כל **כפתור אינטראקטיבי** (שמפעיל פעולה כלשהי: ניווט, סינון, CRUD, שליחה וכו') צריך להשתמש באייקונים אנימטיביים מ-Animate UI.

#### 11.9.1 התקנת אייקונים אנימטיביים

```bash
# דוגמאות להתקנת אייקונים
npx shadcn@latest add @animate-ui/icons-message-circle-more
npx shadcn@latest add @animate-ui/icons-send
npx shadcn@latest add @animate-ui/icons-plus
npx shadcn@latest add @animate-ui/icons-trash
npx shadcn@latest add @animate-ui/icons-x
npx shadcn@latest add @animate-ui/icons-clock
npx shadcn@latest add @animate-ui/icons-chevron-up-down
```

#### 11.9.2 שימוש ב-AnimateIcon Wrapper

**חשוב מאוד**: כדי שהאנימציה תפעל בזמן ריחוף על **הכפתור כולו** (ולא רק על האייקון), יש לעטוף את הכפתור ב-`AnimateIcon`:

```tsx
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Plus } from "@/components/animate-ui/icons/plus";
import { Button } from "@/components/ui/button";

// ✅ נכון - אנימציה על ריחוף בכפתור
<AnimateIcon animateOnHover asChild>
  <Button onClick={handleAdd} className="gap-2">
    <Plus className="w-4 h-4" />
    הוסף פריט
  </Button>
</AnimateIcon>

// ❌ שגוי - אנימציה רק על ריחוף באייקון עצמו
<Button onClick={handleAdd} className="gap-2">
  <Plus className="w-4 h-4" animateOnHover />
  הוסף פריט
</Button>
```

#### 11.9.3 אייקונים אנימטיביים זמינים

| אייקון | שימוש נפוץ | שם חבילה |
|--------|-----------|----------|
| MessageCircleMore | שיחות, הודעות | `@animate-ui/icons-message-circle-more` |
| Users | נציגים, משתמשים | `@animate-ui/icons-users` |
| ChartLine | סטטיסטיקות, גרפים | `@animate-ui/icons-chart-line` |
| SlidersHorizontal | הגדרות | `@animate-ui/icons-sliders-horizontal` |
| MessageCircleQuestion | שאלות נפוצות | `@animate-ui/icons-message-circle-question` |
| MessageSquareMore | תשובות מהירות | `@animate-ui/icons-message-square-more` |
| Send | שליחת הודעה | `@animate-ui/icons-send` |
| X | סגירה, ביטול | `@animate-ui/icons-x` |
| Plus | הוספה | `@animate-ui/icons-plus` |
| Trash | מחיקה | `@animate-ui/icons-trash` |
| RotateCcw | רענון, פתיחה מחדש | `@animate-ui/icons-rotate-ccw` |
| Paperclip | צירוף קובץ | `@animate-ui/icons-paperclip` |
| Clock | זמן, שעות | `@animate-ui/icons-clock` |
| ChevronUpDown | פתיחת תפריט | `@animate-ui/icons-chevron-up-down` |
| ChevronUp/Down | הרחבה/כיווץ | `@animate-ui/icons-chevron-up/down` |
| Check | אישור, סימון | `@animate-ui/icons-check` |
| Sun/Moon | מצב בהיר/כהה | `@animate-ui/icons-sun/moon` |

#### 11.9.4 אייקונים שאינם זמינים ב-Animate UI

האייקונים הבאים **לא קיימים** ב-Animate UI ויש להשתמש ב-lucide-react:
- Archive
- Save
- Pencil/Edit2
- Smile
- Circle
- Settings

```tsx
// לאייקונים לא זמינים - השתמש ב-lucide-react ללא wrapper
import { Archive, Save } from "lucide-react";

<Button onClick={handleArchive}>
  <Archive className="w-4 h-4" />
  ארכיון
</Button>
```

### 11.10 Switch Component - תמיכה ב-RTL

ה-Switch צריך לעבוד נכון גם ב-RTL:

```tsx
// components/ui/switch.tsx
<SwitchPrimitives.Thumb
  className={cn(
    "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
    // LTR: checked = right, unchecked = left
    "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
    // RTL: checked = left, unchecked = right (mirrored)
    "rtl:data-[state=checked]:translate-x-0 rtl:data-[state=unchecked]:-translate-x-5"
  )}
/>
```

**הסבר:**
- במצב LTR: כפתור ה-thumb זז **ימינה** כשמופעל
- במצב RTL: כפתור ה-thumb צריך לזוז **שמאלה** כשמופעל (כי הכיוון מראי)

### 11.11 Tabs - מניעת "הבהוב" (Blinking)

ב-Animate UI Tabs, יש להסיר את `mode="wait"` מ-AnimatePresence כדי למנוע הבהוב:

```tsx
// components/animate-ui/primitives/effects/highlight.tsx
// ❌ שגוי - גורם להבהוב
<AnimatePresence mode="wait" initial={false}>
  {/* ... */}
</AnimatePresence>

// ✅ נכון - ללא הבהוב
<AnimatePresence initial={false}>
  {/* ... */}
</AnimatePresence>
```

---

## 12. תרחישי שימוש

### 12.1 לקוח מחובר פותח צ'אט

```
1. לקוח לוחץ על בועת הצ'אט
2. Widget מזהה משתמש מחובר (window.whizAccount)
3. Widget יוצר Supabase Anonymous Session (אם לא קיים)
4. Widget שולח POST /api/chat/init עם wp_user_id + anon_user_id
5. Server מוצא שיחה קיימת או יוצר חדשה
6. מוחזרת היסטוריית שיחה + הגדרות
7. מוצגת הודעת פתיחה + FAQ
8. לקוח שולח הודעה (עם client_message_id לדה-דופליקציה)
9. הודעה נשמרת ב-DB
10. הודעה נשלחת לוואטסאפ העסקי
11. נציג רואה בדשבורד + מקבל התראה + צליל
12. נציג עונה (מדשבורד או וואטסאפ)
13. לקוח מקבל תשובה בזמן אמת
14. לקוח רואה "וי כחול" כשהנציג קרא
```

### 12.2 אורח פותח צ'אט

```
1. אורח לוחץ על בועת הצ'אט
2. Widget יוצר Supabase Anonymous Session
3. Widget שולח POST /api/chat/init עם anon_user_id
4. מוצגת הודעת פתיחה + FAQ
5. מוצגת הצעה להתחבר או להמשיך כאורח
   - אם מתחבר: Redirect ל-login, שיחה תשויך לחשבון
   - אם ממשיך כאורח: שיחה נשמרת (RLS מגן על נתונים)
6. אורח שולח הודעה
7. מוצגת בקשה לפרטי התקשרות (אימייל/וואטסאפ)
8. אורח בוחר העדפה
9. המשך זרימה רגילה
```

### 12.3 מעבר לוואטסאפ

```
1. לקוח לוחץ "Continue on WhatsApp"
2. Widget שולח POST /api/chat/move-to-whatsapp
3. Server מייצר סיכום שיחה
4. Server מייצר wa.me link עם pre-filled message
5. נפתח וואטסאפ עם ההודעה
6. שיחה מסומנת כ-moved_to_whatsapp
7. הודעות עתידיות מגיעות ישירות לוואטסאפ
```

### 12.4 תשובה מוואטסאפ

```
1. נציג עונה בוואטסאפ (Reply על ההודעה)
2. Green API שולח Webhook (incomingMessageReceived)
3. Server מזהה Session ID מההודעה
4. Server מוצא שיחה מתאימה
5. הודעה נשמרת עם source: 'whatsapp'
6. Supabase Realtime מעדכן:
   - Dashboard: הודעה חדשה + עדכון רשימה
   - Widget: אם לקוח פתוח - הודעה חדשה
7. אם לקוח לא באתר - לא קורה כלום (ימתין לפעם הבאה)
```

### 12.5 סנכרון סטטוס קריאה (Read Receipt)

```
1. נציג קורא הודעה בוואטסאפ
2. Green API שולח Webhook (outgoingMessageStatus: read)
3. Server מעדכן wa_status = 'read' בהודעה
4. Server מעדכן last_read_at_agent בשיחה
5. Widget מקבל עדכון דרך Realtime
6. לקוח רואה "וי כחול" על ההודעות שנקראו
```

### 12.6 מחוץ לשעות פעילות

```
1. לקוח פותח צ'אט בשעה 21:00
2. Server בודק business_hours
3. מוחזר is_online: false
4. מוצגת הודעת offline
5. לקוח יכול עדיין לשלוח הודעה
6. מוצגת בקשה לפרטי התקשרות
7. הודעה נשמרת + נשלחת לוואטסאפ
8. ביום העסקים הבא - נציג עונה
```

### 12.7 שיחה "גולשת" - יציאה משעות פעילות

```
1. לקוח בשיחה פעילה בשעה 17:55
2. Server מזהה שעות עומדות להסתיים (Cron check כל 5 דקות)
3. בשעה 18:00 - Server שולח הודעת מערכת אוטומטית:
   "Our support team has ended their shift. We will get back to you as soon as possible!"
4. לקוח רואה את ההודעה בזמן אמת
5. לקוח יכול להמשיך לכתוב - הודעות יחכו לנציג
```

---

## 13. תחזוקה וארכיון

### 13.1 מדיניות ארכיון

| פרמטר | ערך ברירת מחדל | תיאור |
|-------|---------------|-------|
| `daysUntilArchive` | 30 | ימים עד ארכיון אוטומטי |
| `autoArchiveEnabled` | true | האם הארכיון האוטומטי פעיל |

### 13.2 Cron Job לארכיון

```typescript
// app/api/cron/archive/route.ts

import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check if auto-archive is enabled
  const { data: settings } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'archive')
    .single();

  if (!settings?.value?.autoArchiveEnabled) {
    return Response.json({ message: 'Auto-archive disabled' });
  }

  // Run archive function
  const { error } = await supabase.rpc('archive_old_conversations');

  if (error) {
    console.error('Archive error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
```

### 13.3 Vercel Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/archive",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/check-business-hours",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### 13.4 Dashboard - תצוגת ארכיון

```tsx
// app/(dashboard)/archive/page.tsx

export default function ArchivePage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    fetchConversations({ archived: true });
  }, []);

  async function unarchive(id: string) {
    await supabase
      .from('conversations')
      .update({ is_archived: false })
      .eq('id', id);

    // Refresh list
    fetchConversations({ archived: true });
  }

  return (
    <div dir="rtl">
      <h1>ארכיון שיחות</h1>
      {/* List of archived conversations with unarchive option */}
    </div>
  );
}
```

---

## 14. שלבי פיתוח

### שלב 1: תשתית בסיסית
- [ ] הקמת פרויקט Next.js
- [ ] הגדרת Supabase (DB + Auth + Anonymous Auth)
- [ ] יצירת טבלאות וסכמה
- [ ] הגדרת RLS policies
- [ ] הגדרת Environment Variables
- [ ] Deploy ראשוני ל-Vercel

### שלב 2: API Backend
- [ ] POST /api/chat/init (עם Anonymous Auth)
- [ ] POST /api/chat/send (עם client_message_id)
- [ ] GET /api/chat/messages
- [ ] POST /api/chat/read
- [ ] POST /api/chat/typing
- [ ] POST /api/webhook/whatsapp (כולל outgoingMessageStatus)
- [ ] בדיקת אינטגרציה עם Green API

### שלב 3: Widget
- [ ] הגדרת Shadow DOM
- [ ] פיתוח Chat Bubble
- [ ] פיתוח Chat Window
- [ ] אינטגרציה עם Supabase Anonymous Auth
- [ ] Message deduplication (client_message_id)
- [ ] Supabase Realtime subscription
- [ ] Typing indicators (Presence)
- [ ] Read receipts UI
- [ ] Build ו-CDN deployment

### שלב 4: דשבורד ניהול
- [ ] Agent Authentication
- [ ] רשימת שיחות (מסנן ארכיון)
- [ ] תצוגת שיחה בודדת
- [ ] שליחת הודעות
- [ ] Typing indicators
- [ ] Real-time updates + notifications + sound
- [ ] Browser Push Notifications

### שלב 5: הגדרות ו-FAQ
- [ ] עמוד הגדרות כללי
- [ ] ניהול שעות פעילות
- [ ] ניהול הודעות אוטומטיות (כולל going_offline)
- [ ] ניהול FAQ
- [ ] ניהול Quick Replies
- [ ] הגדרות ארכיון

### שלב 6: Cron Jobs ותחזוקה
- [ ] Cron לארכיון שיחות
- [ ] Cron לבדיקת שעות פעילות
- [ ] עמוד ארכיון בדשבורד

### שלב 7: הטמעה ובדיקות
- [ ] הטמעה ב-WordPress (whizmanage.com)
- [ ] בדיקות E2E
- [ ] בדיקות ביצועים
- [ ] בדיקת Shadow DOM isolation
- [ ] תיקוני באגים
- [ ] Go Live 🚀

---

## נספחים

### A. WordPress Integration Code

להוסיף ל-`innovative-design.php`:

```php
// WhizChat Integration

// Verification endpoint
add_action('rest_api_init', function() {
    register_rest_route('whizchat/v1', '/verify', [
        'methods' => 'POST',
        'callback' => 'whizchat_verify_user',
        'permission_callback' => '__return_true',
    ]);
});

function whizchat_verify_user($request) {
    $user_id = $request->get_param('user_id');

    $user = get_user_by('ID', $user_id);
    if (!$user) {
        return new WP_Error('invalid_user', 'User not found', ['status' => 404]);
    }

    return [
        'valid' => true,
        'user' => [
            'id' => $user->ID,
            'email' => $user->user_email,
            'name' => $user->display_name,
        ],
    ];
}

// Inject chat widget
add_action('wp_footer', function() {
    $chat_url = 'https://your-chat-domain.vercel.app';
    ?>
    <script src="<?php echo $chat_url; ?>/widget/whizchat.min.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            WhizChat.init({
                apiUrl: '<?php echo $chat_url; ?>/api',
                supabaseUrl: 'https://xxx.supabase.co',
                supabaseAnonKey: 'eyJ...'
            });
        });
    </script>
    <?php
});
```

### B. Green API Webhook Configuration

ב-Green API Dashboard:

```
Settings > Webhooks:
- Webhook URL: https://your-domain.vercel.app/api/webhook/whatsapp
- Webhook Token: [generate secure token]

Notification Types:
✓ Incoming message received
✓ Outgoing message status  ← חשוב! לצורך Read Receipts
✓ State instance changed
```

### C. Supabase Anonymous Auth Setup

ב-Supabase Dashboard:

```
Authentication > Providers:
✓ Anonymous Sign-ins: Enabled

Authentication > URL Configuration:
- Site URL: https://your-domain.vercel.app
- Redirect URLs: https://your-domain.vercel.app/*
```

---

## סיכום שינויים בגרסה 1.1

| נושא | שינוי |
|------|-------|
| **Auth** | מעבר מ-fingerprint ל-Supabase Anonymous Auth |
| **Widget** | שימוש ב-Shadow DOM לבידוד עיצובי |
| **Read Receipts** | הוספת last_read_at_customer/agent + wa_status |
| **Deduplication** | הוספת client_message_id למניעת כפילויות |
| **Business Hours** | הוספת הודעת going_offline לשיחות גולשות |
| **Archive** | הוספת is_archived + Cron Job יומי |
| **Typing** | שימוש ב-Supabase Presence לחיווי הקלדה |
| **DB Schema** | שדות חדשים + אינדקסים משופרים |

---

## מסמך זה נוצר לצורך פיתוח מערכת WhizChat

**גרסה:** 1.1
**תאריך:** דצמבר 2024
**מחבר:** Claude AI

לשאלות ועדכונים - פתח צ'אט חדש עם מסמך זה 😊
