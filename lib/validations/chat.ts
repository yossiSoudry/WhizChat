import { z } from "zod";

// Chat Init - Create or get existing conversation
export const chatInitSchema = z.object({
  // WordPress user (optional)
  wpUserId: z.number().optional(),
  wpUserEmail: z.string().email().optional(),
  wpUserName: z.string().optional(),
  // Anonymous user ID from Supabase
  anonUserId: z.string().uuid().optional(),
});

export type ChatInitInput = z.infer<typeof chatInitSchema>;

// Send Message
export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  clientMessageId: z.string().max(50), // For deduplication
  senderName: z.string().optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// Get Messages
export const getMessagesSchema = z.object({
  conversationId: z.string().uuid(),
  after: z.string().uuid().optional(), // For pagination
  limit: z.coerce.number().min(1).max(100).default(50),
});

export type GetMessagesInput = z.infer<typeof getMessagesSchema>;

// Set Contact Info
export const setContactSchema = z.object({
  conversationId: z.string().uuid(),
  contactType: z.enum(["email", "whatsapp"]),
  contactValue: z.string().min(1),
  name: z.string().optional(),
});

export type SetContactInput = z.infer<typeof setContactSchema>;

// Mark as Read
export const markReadSchema = z.object({
  conversationId: z.string().uuid(),
  readerType: z.enum(["customer", "agent"]),
});

export type MarkReadInput = z.infer<typeof markReadSchema>;

// Typing Indicator
export const typingSchema = z.object({
  conversationId: z.string().uuid(),
  isTyping: z.boolean(),
});

export type TypingInput = z.infer<typeof typingSchema>;

// Move to WhatsApp
export const moveToWhatsAppSchema = z.object({
  conversationId: z.string().uuid(),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number"),
});

export type MoveToWhatsAppInput = z.infer<typeof moveToWhatsAppSchema>;
