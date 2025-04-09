import { 
  users, type User, type InsertUser,
  admins, type Admin, type InsertAdmin,
  texts, type Text, type InsertText,
  DEFAULT_TEXTS,
  PaymentStatus
} from "@shared/schema";
import fs from "fs";
import path from "path";

// Check if environment variables are set from index.ts
console.log("In storage.ts - Environment check:");
console.log("USE_MONGO =", process.env.USE_MONGO);

// Interface for all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUsersByPaymentStatus(status: string): Promise<User[]>;
  getUsersByExpiryDate(days: number): Promise<User[]>;
  deleteUser(id: number): Promise<boolean>;
  
  // Admin operations
  getAdmin(id: number): Promise<Admin | undefined>;
  getAdminByTelegramId(telegramId: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  getAllAdmins(): Promise<Admin[]>;
  
  // Text operations
  getText(key: string): Promise<Text | undefined>;
  updateText(key: string, value: string): Promise<Text | undefined>;
  getAllTexts(): Promise<Text[]>;
  initializeDefaultTexts(): Promise<void>;
  
  // Connection
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private admins: Map<number, Admin>;
  private texts: Map<string, Text>;
  private userCurrentId: number;
  private adminCurrentId: number;
  private textCurrentId: number;
  
  constructor() {
    this.users = new Map();
    this.admins = new Map();
    this.texts = new Map();
    this.userCurrentId = 1;
    this.adminCurrentId = 1;
    this.textCurrentId = 1;
  }
  
  // Connection methods (no-op for MemStorage)
  async connect(): Promise<void> {
    console.log("MemStorage connected");
  }
  
  async disconnect(): Promise<void> {
    console.log("MemStorage disconnected");
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.telegramId === telegramId
    );
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    // Set default values for required fields if not provided
    const user: User = { 
      ...userData, 
      id,
      paymentStatus: userData.paymentStatus || PaymentStatus.PENDING,
      paymentProof: userData.paymentProof || null,
      paymentExpiryDate: userData.paymentExpiryDate || null,
      isActive: userData.isActive !== undefined ? userData.isActive : false
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      return undefined;
    }
    
    const updatedUser: User = { ...existingUser, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async getUsersByPaymentStatus(status: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.paymentStatus === status
    );
  }
  
  async getUsersByExpiryDate(days: number): Promise<User[]> {
    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + days);
    
    // Format dates to compare only year, month, and day
    const formatDate = (date: Date) => {
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    };
    
    const targetDateFormatted = formatDate(targetDate);
    
    return Array.from(this.users.values()).filter((user) => {
      if (!user.paymentExpiryDate) return false;
      const expiryDate = new Date(user.paymentExpiryDate);
      return formatDate(expiryDate) === targetDateFormatted;
    });
  }
  
  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }
  
  // Admin operations
  async getAdmin(id: number): Promise<Admin | undefined> {
    return this.admins.get(id);
  }
  
  async getAdminByTelegramId(telegramId: string): Promise<Admin | undefined> {
    return Array.from(this.admins.values()).find(
      (admin) => admin.telegramId === telegramId
    );
  }
  
  async createAdmin(adminData: InsertAdmin): Promise<Admin> {
    const id = this.adminCurrentId++;
    // Make sure isActive is always defined
    const admin: Admin = { 
      ...adminData, 
      id,
      isActive: adminData.isActive !== undefined ? adminData.isActive : true 
    };
    this.admins.set(id, admin);
    return admin;
  }
  
  async getAllAdmins(): Promise<Admin[]> {
    return Array.from(this.admins.values());
  }
  
  // Text operations
  async getText(key: string): Promise<Text | undefined> {
    return this.texts.get(key);
  }
  
  async updateText(key: string, value: string): Promise<Text | undefined> {
    const existingText = this.texts.get(key);
    
    if (existingText) {
      const updatedText: Text = { ...existingText, value };
      this.texts.set(key, updatedText);
      return updatedText;
    }
    
    const id = this.textCurrentId++;
    const newText: Text = { id, key, value };
    this.texts.set(key, newText);
    return newText;
  }
  
  async getAllTexts(): Promise<Text[]> {
    return Array.from(this.texts.values());
  }
  
  async initializeDefaultTexts(): Promise<void> {
    for (const [key, value] of Object.entries(DEFAULT_TEXTS)) {
      if (!this.texts.has(key)) {
        const id = this.textCurrentId++;
        const text: Text = { id, key, value };
        this.texts.set(key, text);
      }
    }
  }
}

// Import MongoDB storage class from separate file
import { MongoStorage } from './mongodb';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Get MongoDB connection URL from environment variable or use default
const MONGODB_URL = process.env.MONGODB_URL || "mongodb://localhost:27017/telegramPayBot";

// Create storage instance
let storage: IStorage;

// Factory function to create storage based on type
function createStorage(forceMongoMode: boolean = false): IStorage {
  // Choose storage based on environment variable or forced mode
  let useMongoEnv = forceMongoMode || process.env.USE_MONGO === "true";
  console.log("USE_MONGO:", useMongoEnv);
  let storageType = useMongoEnv ? "mongo" : "memory";
  console.log("Configured storage type:", storageType);

  if (storageType === "mongo") {
    // Use MongoDB for storage
    const mongoUrl = process.env.MONGODB_URL || "mongodb://localhost:27017/telegramPayBot";
    console.log("Using MongoDB storage with URL:", mongoUrl);
    return new MongoStorage(mongoUrl);
  } else {
    // Use in-memory storage
    console.log("Using in-memory storage");
    return new MemStorage();
  }
}

// Initialize with default storage but allow it to be changed later
storage = createStorage();

// Export function to allow index.ts to reinitialize storage after setting env vars
export function initializeStorage(forceMongoMode: boolean = false): IStorage {
  storage = createStorage(forceMongoMode);
  return storage;
}

// Initialize storage only in index.ts after setting env variables
// No automatic connection here, let index.ts handle the connection in the correct order

// Initialize admin and default text data
export async function initializeAdminAndTexts(storage: IStorage): Promise<void> {
  try {
    // Initialize default texts
    console.log("Initializing default texts...");
    await storage.initializeDefaultTexts();
    
    // Add default admin if needed
    console.log("Checking for default admin...");
    const DEFAULT_ADMIN_ID = "1543822491"; // O'zgartiring
    const adminExists = await storage.getAdminByTelegramId(DEFAULT_ADMIN_ID);
    
    if (!adminExists) {
      console.log("Creating default admin...");
      await storage.createAdmin({
        telegramId: DEFAULT_ADMIN_ID,
        fullName: "Admin",
        isActive: true
      });
      console.log("Default admin with ID " + DEFAULT_ADMIN_ID + " has been created.");
    } else {
      console.log("Default admin already exists.");
    }
  } catch (err) {
    console.error("Error during initialization:", err);
    if (err instanceof Error) {
      console.error("Error details:", err.message);
    }
    throw err;
  }
}

// Export the storage instance
export { storage };
