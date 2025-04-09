import {
  users,
  type User,
  type InsertUser,
  admins,
  type Admin,
  type InsertAdmin,
  texts,
  type Text,
  type InsertText,
  DEFAULT_TEXTS,
  PaymentStatus,
} from "@shared/schema";
import { MongoClient, Collection, ObjectId, Document, Filter } from "mongodb";
import { IStorage } from "./storage";

// MongoDB storage implementation for future use
export class MongoStorage implements IStorage {
  private client: MongoClient | null = null;
  private usersCollection: Collection | null = null;
  private adminsCollection: Collection | null = null;
  private textsCollection: Collection | null = null;
  private countersCollection: Collection | null = null;

  constructor(
    private mongoUrl: string = "mongodb://localhost:27017/telegramPayBot"
  ) {
    // Check if environment variables are available and use them
    if (process.env.MONGODB_URL) {
      this.mongoUrl = process.env.MONGODB_URL;
    }
    console.log("MongoStorage constructor initialized with URL:", this.mongoUrl);
  }

  async connect(): Promise<void> {
    try {
      console.log("Attempting to connect to MongoDB...");
      console.log("MongoDB URL:", this.mongoUrl);
      
      // Use the URL from environment variables instead of constructor parameter
      const envMongoUrl = process.env.MONGODB_URL || this.mongoUrl;
      console.log("Using MongoDB URL from env:", envMongoUrl);
      
      this.client = new MongoClient(envMongoUrl);
      console.log("Created MongoDB client instance");
      
      await this.client.connect();
      console.log("MongoDB client connected successfully");

      const db = this.client.db();
      console.log("Connected to MongoDB database:", db.databaseName);

      this.usersCollection = db.collection("users");
      this.adminsCollection = db.collection("admins");
      this.textsCollection = db.collection("texts");
      this.countersCollection = db.collection("counters");

      // Ensure counters exist
      const counters = ["users", "admins", "texts"];
      for (const counter of counters) {
        console.log(`Checking counter: ${counter}`);
        const filter = { _id: counter } as unknown as Filter<Document>;
        const exists = await this.countersCollection.findOne(filter);
        if (!exists) {
          console.log(`Creating counter: ${counter}`);
          await this.countersCollection.insertOne({ _id: counter, seq: 0 } as any);
        }
      }

      console.log("MongoDB connected successfully and collections initialized");
    } catch (error) {
      console.error("MongoDB connection error:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }

  private async getNextSequence(name: string): Promise<number> {
    if (!this.countersCollection) throw new Error("MongoDB not connected");

    try {
      const filter = { _id: name } as unknown as Filter<Document>;
      const result = await this.countersCollection.findOneAndUpdate(
        filter,
        { $inc: { seq: 1 } },
        { returnDocument: "after" },
      );

      if (!result || !result.value) return 1;
      return result.value.seq || 1;
    } catch (error) {
      console.error(`Error getting next sequence for ${name}:`, error);
      return 1;
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    if (!this.usersCollection) throw new Error("MongoDB not connected");

    const user = await this.usersCollection.findOne({ id: id });
    if (!user) return undefined;

    return this.convertMongoUser(user);
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    if (!this.usersCollection) throw new Error("MongoDB not connected");

    const user = await this.usersCollection.findOne({ telegramId: telegramId });
    if (!user) return undefined;

    return this.convertMongoUser(user);
  }

  async createUser(userData: InsertUser): Promise<User> {
    if (!this.usersCollection) throw new Error("MongoDB not connected");

    const id = await this.getNextSequence("users");
    const user: User = {
      ...userData,
      id,
      paymentStatus: userData.paymentStatus || PaymentStatus.PENDING,
      paymentProof: userData.paymentProof || null,
      paymentExpiryDate: userData.paymentExpiryDate || null,
      isActive: userData.isActive !== undefined ? userData.isActive : false,
    };

    await this.usersCollection.insertOne(user);
    return user;
  }

  async updateUser(
    id: number,
    userData: Partial<InsertUser>,
  ): Promise<User | undefined> {
    if (!this.usersCollection) throw new Error("MongoDB not connected");

    const result = await this.usersCollection.findOneAndUpdate(
      { id: id },
      { $set: userData },
      { returnDocument: "after" },
    );

    if (!result || !result.value) return undefined;
    return this.convertMongoUser(result.value);
  }

  async getAllUsers(): Promise<User[]> {
    if (!this.usersCollection) throw new Error("MongoDB not connected");

    const users = await this.usersCollection.find({}).toArray();
    return users.map((user) => this.convertMongoUser(user));
  }

  async getUsersByPaymentStatus(status: string): Promise<User[]> {
    if (!this.usersCollection) throw new Error("MongoDB not connected");

    const users = await this.usersCollection
      .find({ paymentStatus: status })
      .toArray();
    return users.map((user) => this.convertMongoUser(user));
  }

  async getUsersByExpiryDate(days: number): Promise<User[]> {
    if (!this.usersCollection) {
      console.log("Warning: usersCollection not ready yet when getting users by expiry date. Returning empty array.");
      return [];
    }
    
    try {
      const now = new Date();
      const targetDate = new Date();
      targetDate.setDate(now.getDate() + days);
      
      // Format dates to compare only year, month, and day (fixing month to use correct value)
      const formatDate = (date: Date) => {
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      };
      
      const targetDateFormatted = formatDate(targetDate);
      console.log(`Looking for users expiring on date: ${targetDateFormatted} (days: ${days})`);
      
      const users = await this.usersCollection
        .find({ 
          paymentExpiryDate: { $exists: true },
          isActive: true
        })
        .toArray();
      
      console.log(`Found ${users.length} users with expiry dates to check`);
      
      const matchingUsers = users
        .filter((user) => {
          if (!user.paymentExpiryDate) return false;
          const expiryDate = new Date(user.paymentExpiryDate);
          const expiryFormatted = formatDate(expiryDate);
          const isMatch = expiryFormatted === targetDateFormatted;
          
          console.log(`User ${user.fullName} (ID: ${user.id}) expires on ${expiryFormatted}, target: ${targetDateFormatted}, match: ${isMatch}`);
          
          return isMatch;
        })
        .map((user) => this.convertMongoUser(user));
      
      console.log(`After filtering, found ${matchingUsers.length} users expiring in ${days} days`);
      return matchingUsers;
    } catch (error) {
      console.error(`Error getting users expiring in ${days} days:`, error);
      return [];
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    if (!this.usersCollection) throw new Error("MongoDB not connected");

    const result = await this.usersCollection.deleteOne({ id: id });
    return result.deletedCount > 0;
  }

  // Admin operations
  async getAdmin(id: number): Promise<Admin | undefined> {
    if (!this.adminsCollection) throw new Error("MongoDB not connected");

    const admin = await this.adminsCollection.findOne({ id: id });
    if (!admin) return undefined;

    return this.convertMongoAdmin(admin);
  }

  async getAdminByTelegramId(telegramId: string): Promise<Admin | undefined> {
    if (!this.adminsCollection) throw new Error("MongoDB not connected");

    const admin = await this.adminsCollection.findOne({
      telegramId: telegramId,
    });
    if (!admin) return undefined;

    return this.convertMongoAdmin(admin);
  }

  async createAdmin(adminData: InsertAdmin): Promise<Admin> {
    if (!this.adminsCollection) throw new Error("MongoDB not connected");

    const id = await this.getNextSequence("admins");
    const admin: Admin = {
      ...adminData,
      id,
      isActive: adminData.isActive !== undefined ? adminData.isActive : true,
    };

    await this.adminsCollection.insertOne(admin);
    return admin;
  }

  async getAllAdmins(): Promise<Admin[]> {
    if (!this.adminsCollection) throw new Error("MongoDB not connected");

    const admins = await this.adminsCollection.find({}).toArray();
    return admins.map((admin) => this.convertMongoAdmin(admin));
  }

  // Text operations
  async getText(key: string): Promise<Text | undefined> {
    if (!this.textsCollection) {
      console.log("Warning: textsCollection not ready yet. Returning default value.");
      // Return undefined to trigger the default fallback value
      return undefined;
    }

    try {
      const text = await this.textsCollection.findOne({ key: key });
      if (!text) return undefined;
      
      return this.convertMongoText(text);
    } catch (error) {
      console.error("Error getting text from MongoDB:", error);
      return undefined;
    }
  }

  async updateText(key: string, value: string): Promise<Text | undefined> {
    if (!this.textsCollection) {
      console.log("Warning: textsCollection not ready yet when updating text. Returning undefined.");
      return undefined;
    }

    try {
      const existingText = await this.textsCollection.findOne({ key: key });

      if (existingText) {
        const result = await this.textsCollection.findOneAndUpdate(
          { key: key },
          { $set: { value } },
          { returnDocument: "after" },
        );

        if (!result || !result.value) return undefined;
        return this.convertMongoText(result.value);
      }

      const id = await this.getNextSequence("texts");
      const newText: Text = { id, key, value };
      await this.textsCollection.insertOne(newText);
      return newText;
    } catch (error) {
      console.error(`Error updating text with key ${key}:`, error);
      return undefined;
    }
  }

  async getAllTexts(): Promise<Text[]> {
    if (!this.textsCollection) {
      console.log("Warning: textsCollection not ready yet when getting all texts. Returning empty array.");
      return [];
    }

    try {
      const texts = await this.textsCollection.find({}).toArray();
      return texts.map((text) => this.convertMongoText(text));
    } catch (error) {
      console.error("Error getting all texts from MongoDB:", error);
      return [];
    }
  }

  async initializeDefaultTexts(): Promise<void> {
    if (!this.textsCollection) {
      console.log("Warning: textsCollection not ready yet when initializing default texts. Skipping.");
      return;
    }

    try {
      for (const [key, value] of Object.entries(DEFAULT_TEXTS)) {
        const existingText = await this.textsCollection.findOne({ key: key });
  
        if (!existingText) {
          const id = await this.getNextSequence("texts");
          const text: Text = { id, key, value };
          await this.textsCollection.insertOne(text);
        }
      }
    } catch (error) {
      console.error("Error initializing default texts:", error);
    }
  }

  // Helper methods for MongoDB document conversion
  private convertMongoUser(user: any): User {
    const { _id, ...userData } = user;
    return userData as User;
  }

  private convertMongoAdmin(admin: any): Admin {
    const { _id, ...adminData } = admin;
    return adminData as Admin;
  }

  private convertMongoText(text: any): Text {
    const { _id, ...textData } = text;
    return textData as Text;
  }
}
