import { z } from "zod";

// Get Conversations
export const getConversationsSchema = z.object({
  status: z.enum(["active", "closed", "pending"]).optional(),
  archived: z.coerce.boolean().default(false),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type GetConversationsInput = z.infer<typeof getConversationsSchema>;

// Send Agent Message
export const sendAgentMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  agentId: z.string().uuid(),
});

export type SendAgentMessageInput = z.infer<typeof sendAgentMessageSchema>;

// Update Conversation Status
export const updateConversationStatusSchema = z.object({
  status: z.enum(["active", "closed", "pending"]),
});

export type UpdateConversationStatusInput = z.infer<typeof updateConversationStatusSchema>;

// FAQ Item
export const faqItemSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type FAQItemInput = z.infer<typeof faqItemSchema>;

// Quick Reply
export const quickReplySchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1),
  shortcut: z.string().max(20).optional(),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type QuickReplyInput = z.infer<typeof quickReplySchema>;

// Settings
export const updateSettingsSchema = z.object({
  key: z.string(),
  value: z.record(z.string(), z.unknown()),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

// Agent
export const createAgentSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["admin", "agent"]).default("agent"),
  password: z.string().min(8),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;

export const updateAgentSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["admin", "agent"]).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
