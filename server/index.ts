import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Force set environment variables for MongoDB
process.env.USE_MONGO = "true";
process.env.MONGODB_URL = "mongodb://Botir:%293K6SB%3E%3F_j4%2CcS_%24@45.120.178.65:27017/bot?authSource=admin&directConnection=true";

// Log environment variables
console.log("Environment variables loaded:")
console.log("USE_MONGO =", process.env.USE_MONGO);
console.log("MONGODB_URL =", process.env.MONGODB_URL);

// Import storage after setting environment variables
import { initializeStorage, initializeAdminAndTexts } from "./storage";

// Reinitialize storage with MongoDB mode forced to true
console.log("Reinitializing storage with MongoDB...");
const storageInstance = initializeStorage(true);

// Connect to MongoDB and initialize data
(async () => {
  try {
    console.log("Connecting to storage...");
    await storageInstance.connect();
    console.log("Storage connected successfully");
    
    console.log("Initializing data...");
    await initializeAdminAndTexts(storageInstance);
    console.log("Data initialization completed successfully");
  } catch (error) {
    console.error("Error initializing storage:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message, error.stack);
    }
    
    // Don't exit process, let the app try to run with limited functionality
    console.error("Application may not function correctly due to storage initialization failure");
  }
})();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
