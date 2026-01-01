export interface Message {
  id: string;
  content: string;
  senderType: "customer" | "agent" | "system" | "bot";
  senderName: string | null;
  source: "widget" | "dashboard" | "whatsapp";
  createdAt: string;
  status?: "sent" | "delivered" | "read";
  messageType?: "text" | "image" | "file" | "audio" | "video";
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileMimeType?: string | null;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface Conversation {
  id: string;
  status: "active" | "closed" | "pending";
}

export interface WidgetSettings {
  isOnline: boolean;
  welcomeMessage: string;
  faqItems: FAQItem[];
}

export interface InitResponse {
  conversation: Conversation;
  messages: Message[];
  settings: WidgetSettings;
}

export interface WidgetConfig {
  position?: "left" | "right";
  primaryColor?: string;
  secondaryColor?: string;
  wpUserId?: number;
  wpUserEmail?: string;
  wpUserName?: string;
  wpUserAvatar?: string;
}
