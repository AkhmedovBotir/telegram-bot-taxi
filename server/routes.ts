import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { Express as ExpressType } from "express-serve-static-core";
import { z } from "zod";
import path from "path";
import fs from "fs";
import { insertUserSchema, insertAdminSchema, PaymentStatus } from "@shared/schema";

// Import after environment variables have been set in index.ts
import { storage } from "./storage";
import { initBot } from "./bot";
import { setupScheduler } from "./scheduler";
import { setupFileUploads } from "./uploads";
import multer from "multer";

// Validate file upload
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
  fileFilter: (req: any, file: any, cb: multer.FileFilterCallback) => {
    // Accept only images
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize uploads directory
  setupFileUploads();
  
  // Initialize the Telegram bot
  const bot = await initBot(storage);
  
  // Initialize the scheduler for reminders and expiry checks
  setupScheduler(storage, bot);
  
  // Static files for uploads directory
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
  
  // API routes
  const apiRouter = express.Router();
  
  // Get users API endpoint
  apiRouter.get("/users", async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Error fetching users" });
    }
  });
  
  // Get pending payments
  apiRouter.get("/payments/pending", async (req: Request, res: Response) => {
    try {
      const pendingUsers = await storage.getUsersByPaymentStatus(PaymentStatus.PENDING);
      res.json(pendingUsers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching pending payments" });
    }
  });
  
  // Approve payment
  apiRouter.post("/payments/approve/:id", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Set payment as approved and calculate expiry date
      const now = new Date();
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1); // Add 1 month
      
      const updatedUser = await storage.updateUser(userId, {
        paymentStatus: PaymentStatus.APPROVED,
        isActive: true,
        paymentExpiryDate: expiryDate,
      });
      
      // Notify user via bot
      const text = await storage.getText("approvedMessage");
      if (text && updatedUser) {
        bot.sendMessage(updatedUser.telegramId, text.value);
      }
      
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Error approving payment" });
    }
  });
  
  // Reject payment
  apiRouter.post("/payments/reject/:id", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        reason: z.string().min(1),
      });
      
      const { reason } = schema.parse(req.body);
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updatedUser = await storage.updateUser(userId, {
        paymentStatus: PaymentStatus.REJECTED,
      });
      
      // Notify user via bot
      if (updatedUser) {
        bot.sendMessage(
          updatedUser.telegramId,
          `Sizning to'lovingiz bekor qilindi.\nSabab: ${reason}`
        );
      }
      
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Error rejecting payment" });
    }
  });
  
  // Remove user from group
  apiRouter.post("/users/remove/:id", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        reason: z.string().optional(),
      });
      
      const { reason } = schema.parse(req.body);
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove user from Telegram group
      try {
        if (process.env.TELEGRAM_GROUP_ID) {
          // Telegram API method name changed to banChatMember in newer versions
          if ('banChatMember' in bot) {
            await (bot as any).banChatMember(
              process.env.TELEGRAM_GROUP_ID,
              parseInt(user.telegramId)
            );
          } else if ('kickChatMember' in bot) {
            await (bot as any).kickChatMember(
              process.env.TELEGRAM_GROUP_ID,
              parseInt(user.telegramId)
            );
          }
        }
      } catch (error) {
        console.error("Error kicking user from group:", error);
      }
      
      // Update user status
      const updatedUser = await storage.updateUser(userId, {
        isActive: false,
      });
      
      // Notify user
      const message = reason
        ? `Siz guruhdan chiqarildingiz.\nSabab: ${reason}`
        : "⏳ A'zolik muddati tugadi. Siz guruhdan chiqarildingiz.";
      
      bot.sendMessage(user.telegramId, message);
      
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Error removing user" });
    }
  });
  
  // Get text templates
  apiRouter.get("/texts", async (req: Request, res: Response) => {
    try {
      const texts = await storage.getAllTexts();
      res.json(texts);
    } catch (error) {
      res.status(500).json({ message: "Error fetching texts" });
    }
  });
  
  // Update text template
  apiRouter.put("/texts/:key", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        value: z.string().min(1),
      });
      
      const { value } = schema.parse(req.body);
      const key = req.params.key;
      
      const updatedText = await storage.updateText(key, value);
      
      if (!updatedText) {
        return res.status(404).json({ message: "Text template not found" });
      }
      
      res.json(updatedText);
    } catch (error) {
      res.status(500).json({ message: "Error updating text template" });
    }
  });
  
  // Get dashboard stats
  apiRouter.get("/stats", async (req: Request, res: Response) => {
    try {
      const allUsers = await storage.getAllUsers();
      const activeUsers = allUsers.filter(user => user.isActive);
      const pendingPayments = await storage.getUsersByPaymentStatus(PaymentStatus.PENDING);
      
      // Calculate users expiring today
      const today = new Date();
      const expiringToday = allUsers.filter(user => {
        if (!user.paymentExpiryDate) return false;
        const expiryDate = new Date(user.paymentExpiryDate);
        return (
          expiryDate.getFullYear() === today.getFullYear() &&
          expiryDate.getMonth() === today.getMonth() &&
          expiryDate.getDate() === today.getDate()
        );
      });
      
      // Calculate rough monthly revenue
      // Assuming each user pays a fixed amount per month
      const monthlyRevenue = activeUsers.length * 50000; // Example amount, adjust as needed
      
      res.json({
        activeUsers: activeUsers.length,
        pendingPayments: pendingPayments.length,
        expiringToday: expiringToday.length,
        monthlyRevenue
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching stats" });
    }
  });
  
  // Get recent activities
  apiRouter.get("/activities", async (req: Request, res: Response) => {
    try {
      // In a real application, we would have an activities table
      // For now, we'll return a limited set of recent activities based on users
      const allUsers = await storage.getAllUsers();
      
      // Sort users by most recent join date
      const sortedUsers = [...allUsers].sort((a, b) => {
        const dateA = a.joinDate ? new Date(a.joinDate).getTime() : 0;
        const dateB = b.joinDate ? new Date(b.joinDate).getTime() : 0;
        return dateB - dateA;
      });
      
      // Take the 10 most recent users and create activities from them
      const recentActivities = sortedUsers.slice(0, 10).map(user => {
        let activity = {
          id: user.id,
          userId: user.id,
          userName: user.fullName,
          date: user.joinDate,
          type: ""
        };
        
        if (user.paymentStatus === PaymentStatus.PENDING) {
          activity.type = "payment_sent";
        } else if (user.paymentStatus === PaymentStatus.APPROVED) {
          activity.type = "payment_approved";
        } else if (user.paymentStatus === PaymentStatus.REJECTED) {
          activity.type = "payment_rejected";
        } else if (!user.isActive) {
          activity.type = "user_removed";
        } else {
          activity.type = "user_joined";
        }
        
        return activity;
      });
      
      res.json(recentActivities);
    } catch (error) {
      res.status(500).json({ message: "Error fetching activities" });
    }
  });
  
  // Apply API router
  app.use("/api", apiRouter);
  
  const httpServer = createServer(app);
  
  return httpServer;
}
