import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - stores telegram user information
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  fullName: text("full_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  joinDate: timestamp("join_date").notNull(),
  paymentStatus: text("payment_status").notNull().default("pending"),
  paymentProof: text("payment_proof"),
  paymentExpiryDate: timestamp("payment_expiry_date"),
  isActive: boolean("is_active").notNull().default(false),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

// Admins table - stores telegram admin information
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  fullName: text("full_name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertAdminSchema = createInsertSchema(admins).omit({
  id: true,
});

// Text templates table - stores configurable bot messages
export const texts = pgTable("texts", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const insertTextSchema = createInsertSchema(texts).omit({
  id: true,
});

// Define types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;

export type Text = typeof texts.$inferSelect;
export type InsertText = z.infer<typeof insertTextSchema>;

// Payment status enum
export const PaymentStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  EXPIRED: "expired", // Added expired status for subscription expiry tracking
} as const;

// Default text templates
export const DEFAULT_TEXTS = {
  startMessage: "Assalomu alaykum! To'lov nazoratchi botga xush kelibsiz.\n\nIltimos, ro'yxatdan o'tish uchun ism va familiyangizni kiriting.",
  beforePaymentMessage: "To'lovni amalga oshirish uchun quyidagi hisob raqamga mablag' o'tkazing va to'lov chekini rasm shaklida yuboring.",
  aboutBotMessage: "Bu bot guruh a'zoliklarini nazorat qilish uchun yaratilgan. A'zolik muddati 1 oy davom etadi va to'lov o'z vaqtida amalga oshirilishi kerak.",
  contactMessage: "Savollar va takliflar uchun: @admin_username bilan bog'laning.",
  approvedMessage: "To'lovingiz tasdiqlandi! Siz guruhga qo'shildingiz. A'zolik muddati bir oyga uzaytirildi."
};
