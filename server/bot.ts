import TelegramBot, { KeyboardButton } from "node-telegram-bot-api";
import { IStorage } from "./storage";
import path from "path";
import fs from "fs";
import { PaymentStatus } from "@shared/schema";

// Session store for conversation state
type UserSession = {
  state: "idle" | "waiting_name" | "waiting_phone" | "waiting_payment";
  data: Record<string, any>;
};

// Bot instance and session store
let bot: TelegramBot;
let storage: IStorage;
const sessions: Map<string, UserSession> = new Map();

export async function initBot(storageInstance: IStorage): Promise<TelegramBot> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is required");
  }
  
  // Save storage instance globally
  storage = storageInstance;
  
  bot = new TelegramBot(token, { polling: true });

  // Start command handler
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id.toString();
    const userId = msg.from?.id.toString();

    if (!userId) return;

    // Check if user is admin
    const isAdmin = await storage.getAdminByTelegramId(userId);

    if (isAdmin) {
      // Admin user welcome message
      const startText = await storage.getText("startMessage");
      bot.sendMessage(
        chatId,
        `${startText?.value || "Assalomu alaykum! To'lov nazoratchi botga xush kelibsiz."}\n\n*Admin rejimida ishlayapsiz*`,
        { parse_mode: "Markdown" },
      );

      // Show admin panel directly for admins
      const users = await storage.getAllUsers();
      const pendingUsers = await storage.getUsersByPaymentStatus(
        PaymentStatus.PENDING,
      );
      const approvedUsers = await storage.getUsersByPaymentStatus(
        PaymentStatus.APPROVED,
      );
      const rejectedUsers = await storage.getUsersByPaymentStatus(
        PaymentStatus.REJECTED,
      );

      // Get users expiring soon (in 3 days)
      const expiringUsers = await storage.getUsersByExpiryDate(3);

      // Send admin panel message with inline buttons
      bot.sendMessage(
        chatId,
        `🔐 *Admin Panel*\n\n` +
          `👥 Jami foydalanuvchilar: ${users.length}\n` +
          `⏳ Kutilayotgan to'lovlar: ${pendingUsers.length}\n` +
          `✅ Tasdiqlangan to'lovlar: ${approvedUsers.length}\n` +
          `❌ Bekor qilingan to'lovlar: ${rejectedUsers.length}\n` +
          `⚠️ 3 kun ichida tugaydigan a'zoliklar: ${expiringUsers.length}`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "⏳ Kutilayotgan to'lovlar",
                  callback_data: "admin_pending",
                },
              ],
              [
                {
                  text: "👥 Barcha foydalanuvchilar",
                  callback_data: "admin_users",
                },
              ],
              [
                {
                  text: "⚠️ Tugayotgan a'zoliklar",
                  callback_data: "admin_expiring",
                },
              ],
              [
                {
                  text: "📝 Matnlarni tahrirlash",
                  callback_data: "admin_texts",
                },
              ],
            ],
          },
        },
      );

      // Send admin keyboard
      const keyboard = await createKeyboard(userId, storage);
      bot.sendMessage(
        chatId,
        "Quyidagi tugmalardan foydalanishingiz mumkin:",
        keyboard,
      );

      return;
    }

    // Regular user flow
    // Check if user already exists
    const existingUser = await storage.getUserByTelegramId(userId);

    if (existingUser) {
      const paymentStatus = existingUser.paymentStatus;

      if (paymentStatus === PaymentStatus.PENDING) {
        bot.sendMessage(
          chatId,
          "Sizning to'lovingiz tasdiqlanishi kutilmoqda.",
        );

        // Send keyboard with correct buttons based on user role
        const keyboard = await createKeyboard(userId, storage);
        bot.sendMessage(
          chatId,
          "Quyidagi tugmalardan foydalanishingiz mumkin:",
          keyboard,
        );
      } else if (paymentStatus === PaymentStatus.APPROVED) {
        const expiryDate = existingUser.paymentExpiryDate
          ? new Date(existingUser.paymentExpiryDate).toLocaleDateString("uz-UZ")
          : "Aniqlanmagan";

        bot.sendMessage(
          chatId,
          `Siz faol a'zosiz! A'zolik muddati: ${expiryDate}ga qadar.`,
        );

        // Send keyboard with correct buttons based on user role
        const keyboard = await createKeyboard(userId, storage);
        bot.sendMessage(
          chatId,
          "Quyidagi tugmalardan foydalanishingiz mumkin:",
          keyboard,
        );
      } else {
        // Reset user if rejected
        resetUserSession(userId);
        sendStartMessage(chatId, userId);
      }
      return;
    }

    // New user, start registration
    resetUserSession(userId);
    sendStartMessage(chatId, userId);
  });

  // Handle text messages
  bot.on("message", async (msg) => {
    if (!msg.text || msg.text.startsWith("/")) return;

    const chatId = msg.chat.id.toString();
    const userId = msg.from?.id.toString();

    if (!userId) return;
    
    // Check if user is admin - administrators don't need registration
    const isAdmin = await storage.getAdminByTelegramId(userId);
    if (isAdmin) {
      // Skip handling registration for admins
      return;
    }

    const session = sessions.get(userId);

    if (!session) {
      // If no session, just send the start message
      resetUserSession(userId);
      sendStartMessage(chatId, userId);
      return;
    }

    if (session.state === "waiting_name") {
      // Save user's name
      session.data.fullName = msg.text;
      session.state = "waiting_phone";

      // Ask for phone number
      bot.sendMessage(
        chatId,
        "Iltimos, telefon raqamingizni kiriting (masalan, +998901234567):",
      );
    } else if (session.state === "waiting_phone") {
      // Validate phone number format
      const phoneRegex = /^\+?[0-9]{10,13}$/;

      if (!phoneRegex.test(msg.text.replace(/\s/g, ""))) {
        bot.sendMessage(
          chatId,
          "Noto'g'ri format. Iltimos, telefon raqamingizni to'g'ri formatda kiriting (masalan, +998901234567):",
        );
        return;
      }

      // Save phone number
      session.data.phoneNumber = msg.text;
      session.state = "waiting_payment";

      // Create user in database
      try {
        const user = await storage.createUser({
          telegramId: userId,
          fullName: session.data.fullName,
          phoneNumber: session.data.phoneNumber,
          joinDate: new Date(),
          paymentStatus: PaymentStatus.PENDING,
          isActive: false,
        });

        // Ask for payment receipt
        const paymentText = await storage.getText("beforePaymentMessage");
        bot.sendMessage(
          chatId,
          paymentText?.value ||
            "To'lovni amalga oshirish uchun quyidagi hisob raqamga mablag' o'tkazing va to'lov chekini rasm shaklida yuboring.",
        );
      } catch (error) {
        console.error("Error creating user:", error);
        bot.sendMessage(
          chatId,
          "Ro'yxatdan o'tishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
        );
        resetUserSession(userId);
      }
    }
  });

  // Handle photo messages (payment receipts)
  bot.on("photo", async (msg) => {
    const chatId = msg.chat.id.toString();
    const userId = msg.from?.id.toString();

    if (!userId) return;
    
    // Check if user is admin - administrators don't need to upload payment receipts
    const isAdmin = await storage.getAdminByTelegramId(userId);
    if (isAdmin) {
      // Skip handling photos for admins
      return;
    }

    const user = await storage.getUserByTelegramId(userId);

    if (!user) {
      bot.sendMessage(
        chatId,
        "Iltimos, avval ro'yxatdan o'ting. /start buyrug'ini yuboring.",
      );
      return;
    }

    const session = sessions.get(userId) || { state: "idle", data: {} };

    // Only accept payment receipts if user is in the right state
    if (
      session.state === "waiting_payment" ||
      user.paymentStatus === PaymentStatus.REJECTED
    ) {
      // Get the largest photo (best quality)
      const photo =
        msg.photo && msg.photo.length > 0
          ? msg.photo[msg.photo.length - 1]
          : null;

      if (!photo || !photo.file_id) {
        bot.sendMessage(
          chatId,
          "Rasm yuborishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
        );
        return;
      }

      try {
        // Download photo
        const fileInfo = await bot.getFile(photo.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`;

        // Create a file name with timestamp and user ID to avoid collisions
        const timestamp = Date.now();
        const fileName = `payment_${userId}_${timestamp}.jpg`;
        const filePath = path.join(process.cwd(), "uploads", fileName);

        // Stream download
        const fileStream = await downloadFile(fileUrl, filePath);

        // Update user's payment info
        await storage.updateUser(user.id, {
          paymentStatus: PaymentStatus.PENDING,
          paymentProof: `uploads/${fileName}`,
        });

        // Reset session state
        session.state = "idle";
        sessions.set(userId, session);

        // Notify user
        bot.sendMessage(
          chatId,
          "To'lov cheki qabul qilindi. Administrator tekshiruvidan so'ng sizga xabar yuboriladi.",
        );

        // Notify admins
        notifyAdmins(storage, user);
      } catch (error) {
        console.error("Error processing payment receipt:", error);
        bot.sendMessage(
          chatId,
          "To'lov chekini yuklashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
        );
      }
    }
  });

  // Handle 💰 To'lovni amalga oshirish button
  bot.onText(/💰 To\'lovni amalga oshirish/, async (msg) => {
    const chatId = msg.chat.id.toString();
    const userId = msg.from?.id.toString();

    if (!userId) return;

    // Check if user exists
    const user = await storage.getUserByTelegramId(userId);
    if (!user) {
      bot.sendMessage(chatId, "Siz ro'yxatdan o'tmagansiz, iltimos /start buyrug'ini bosing.");
      return;
    }
    
    // Check if the user is eligible for payment renewal (approaching expiry date or already expired)
    let isEligibleForPayment = false;
    
    if (user.paymentStatus === PaymentStatus.EXPIRED) {
      // Already expired users can make payment
      isEligibleForPayment = true;
    } else if (user.paymentExpiryDate) {
      // Check days remaining
      const expiryDate = new Date(user.paymentExpiryDate);
      const today = new Date();
      
      // Calculate days difference
      const timeDiff = expiryDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      console.log(`User ${user.fullName} (ID: ${user.id}) has ${daysDiff} days until expiry`);
      
      // Eligible if 3 or fewer days remaining
      isEligibleForPayment = (daysDiff <= 3);
    }
    
    if (!isEligibleForPayment) {
      // User trying to make payment when not needed
      bot.sendMessage(
        chatId,
        "Sizning a'zolik muddatingiz hali tugamagan va yaqinlashmagan. To'lov qilish vaqti kelganda sizga eslatma xabari yuboriladi."
      );
      return;
    }

    const session = sessions.get(userId) || { state: "idle", data: {} };
    session.state = "waiting_payment";
    sessions.set(userId, session);

    // Send payment information
    const paymentText = await storage.getText("beforePaymentMessage");
    
    bot.sendMessage(
      chatId,
      paymentText?.value || 
      "To'lovni amalga oshirish uchun quyidagi hisob raqamga mablag' o'tkazing va to'lov chekini rasm shaklida yuboring.",
    );
  });

  // Handle button commands
  bot.onText(/📎 Bot haqida/, async (msg) => {
    const chatId = msg.chat.id.toString();

    const aboutText = await storage.getText("aboutBotMessage");
    bot.sendMessage(
      chatId,
      aboutText?.value ||
        "Bu bot guruh a'zoliklarini nazorat qilish uchun yaratilgan. A'zolik muddati 1 oy davom etadi va to'lov o'z vaqtida amalga oshirilishi kerak.",
    );
  });

  bot.onText(/📞 Aloqa/, async (msg) => {
    const chatId = msg.chat.id.toString();

    const contactText = await storage.getText("contactMessage");
    bot.sendMessage(
      chatId,
      contactText?.value ||
        "Savollar va takliflar uchun: @admin_username bilan bog'laning.",
    );
  });

  bot.onText(/📤 To'lov holatim/, async (msg) => {
    const chatId = msg.chat.id.toString();
    const userId = msg.from?.id.toString();

    if (!userId) return;

    const user = await storage.getUserByTelegramId(userId);

    if (!user) {
      bot.sendMessage(
        chatId,
        "Siz hali ro'yxatdan o'tmagansiz. /start buyrug'ini yuboring.",
      );
      return;
    }

    // Check if payment proof exists
    if (!user.paymentProof && user.paymentStatus !== PaymentStatus.APPROVED) {
      // User hasn't sent payment proof yet - show payment instructions
      const paymentText = await storage.getText("beforePaymentMessage");
      bot.sendMessage(
        chatId,
        "⚠️ Siz hali to'lov chekini yubormagansiz!\n\n" +
          (paymentText?.value ||
            "To'lovni amalga oshirish uchun quyidagi hisob raqamga mablag' o'tkazing va to'lov chekini rasm shaklida yuboring."),
      );
      return;
    }

    let statusMessage = "To'lov holati: ";

    switch (user.paymentStatus) {
      case PaymentStatus.PENDING:
        statusMessage += "Kutilmoqda ⏳";
        break;
      case PaymentStatus.APPROVED:
        statusMessage += "Tasdiqlangan ✅\n";
        if (user.paymentExpiryDate) {
          const expiryDate = new Date(user.paymentExpiryDate);
          const today = new Date();
          const daysLeft = Math.ceil(
            (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
          );

          statusMessage += `A'zolik tugash vaqti: ${expiryDate.toLocaleDateString("uz-UZ")}\n`;
          statusMessage += `${daysLeft} kun qoldi.`;
        }
        break;
      case PaymentStatus.REJECTED:
        statusMessage += "Bekor qilingan ❌\n";
        statusMessage +=
          "Iltimos, to'lovni qayta amalga oshirib, chekni yuboring.";

        // Show payment instructions again for rejected users
        const paymentText = await storage.getText("beforePaymentMessage");
        bot.sendMessage(
          chatId,
          paymentText?.value ||
            "To'lovni amalga oshirish uchun quyidagi hisob raqamga mablag' o'tkazing va to'lov chekini rasm shaklida yuboring.",
        );
        return;

      default:
        statusMessage += "Aniqlanmagan";
    }

    bot.sendMessage(chatId, statusMessage);
  });

  // Handle Admin Panel button
  // Handle 📝 Xabarlar button for admins
  bot.onText(/📝 Xabarlar/, async (msg) => {
    const chatId = msg.chat.id.toString();
    const userId = msg.from?.id.toString();

    if (!userId) return;

    // Check if user is admin
    const admin = await storage.getAdminByTelegramId(userId);

    if (!admin) {
      bot.sendMessage(chatId, "Sizda bu amalni bajarish uchun ruxsat yo'q.");
      return;
    }

    // Get texts
    const texts = await storage.getAllTexts();

    if (texts.length === 0) {
      bot.sendMessage(chatId, "Matnlar topilmadi");
      return;
    }

    // Send list of text templates with edit buttons
    let message = "📝 *Matnlarni tahrirlash:*\n\n" +
      "Quyidagi tugmalar orqali matnlarni tahrirlashingiz mumkin:";

    // Create inline keyboard with text edit buttons
    const keyboard: any[][] = [];

    for (const text of texts) {
      // Create a readable name for the text key
      let readableName = "";

      switch (text.key) {
        case "startMessage":
          readableName = "Kirish xabari";
          break;
        case "approvedMessage":
          readableName = "Tasdiqlash xabari";
          break;
        case "beforePaymentMessage":
          readableName = "To'lov qilish yo'riqnomasi";
          break;
        case "contactMessage":
          readableName = "Aloqa ma'lumotlari";
          break;
        case "aboutBotMessage":
          readableName = "Bot haqida ma'lumot";
          break;
        default:
          readableName = text.key;
      }

      keyboard.push([
        { text: readableName, callback_data: `edit_text_${text.key}` },
      ]);
    }

    bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: keyboard,
      },
    });
  });

  // Handle 📊 Statistika button for admins
  bot.onText(/📊 Statistika/, async (msg) => {
    const chatId = msg.chat.id.toString();
    const userId = msg.from?.id.toString();

    if (!userId) return;

    // Check if user is admin
    const admin = await storage.getAdminByTelegramId(userId);

    if (!admin) {
      bot.sendMessage(chatId, "Sizda bu amalni bajarish uchun ruxsat yo'q.");
      return;
    }

    // Get stats
    const users = await storage.getAllUsers();
    const pendingUsers = await storage.getUsersByPaymentStatus(PaymentStatus.PENDING);
    const approvedUsers = await storage.getUsersByPaymentStatus(PaymentStatus.APPROVED);
    const rejectedUsers = await storage.getUsersByPaymentStatus(PaymentStatus.REJECTED);

    // Get users expiring soon (in 3 days)
    const expiringUsers = await storage.getUsersByExpiryDate(3);

    // Send stats message
    bot.sendMessage(
      chatId,
      `📊 *Statistika*\n\n` +
      `👥 Jami foydalanuvchilar: ${users.length}\n` +
      `⏳ Kutilayotgan to'lovlar: ${pendingUsers.length}\n` +
      `✅ Tasdiqlangan to'lovlar: ${approvedUsers.length}\n` +
      `❌ Bekor qilingan to'lovlar: ${rejectedUsers.length}\n` +
      `⚠️ 3 kun ichida tugaydigan a'zoliklar: ${expiringUsers.length}`,
      {
        parse_mode: "Markdown"
      }
    );
  });

  bot.onText(/🔐 Admin Panel/, async (msg) => {
    const chatId = msg.chat.id.toString();
    const userId = msg.from?.id.toString();

    if (!userId) return;

    // Check if user is admin
    const admin = await storage.getAdminByTelegramId(userId);

    if (!admin) {
      bot.sendMessage(chatId, "Sizda bu amalni bajarish uchun ruxsat yo'q.");
      return;
    }

    // Get stats
    const users = await storage.getAllUsers();
    const pendingUsers = await storage.getUsersByPaymentStatus(
      PaymentStatus.PENDING,
    );
    const approvedUsers = await storage.getUsersByPaymentStatus(
      PaymentStatus.APPROVED,
    );
    const rejectedUsers = await storage.getUsersByPaymentStatus(
      PaymentStatus.REJECTED,
    );

    // Get users expiring soon (in 3 days)
    const expiringUsers = await storage.getUsersByExpiryDate(3);

    // Send admin panel message with inline buttons
    bot.sendMessage(
      chatId,
      `🔐 *Admin Panel*\n\n` +
        `👥 Jami foydalanuvchilar: ${users.length}\n` +
        `⏳ Kutilayotgan to'lovlar: ${pendingUsers.length}\n` +
        `✅ Tasdiqlangan to'lovlar: ${approvedUsers.length}\n` +
        `❌ Bekor qilingan to'lovlar: ${rejectedUsers.length}\n` +
        `⚠️ 3 kun ichida tugaydigan a'zoliklar: ${expiringUsers.length}`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "⏳ Kutilayotgan to'lovlar",
                callback_data: "admin_pending",
              },
            ],
            [
              {
                text: "👥 Barcha foydalanuvchilar",
                callback_data: "admin_users",
              },
            ],
            [
              {
                text: "⚠️ Tugayotgan a'zoliklar",
                callback_data: "admin_expiring",
              },
            ],
            [{ text: "📝 Matnlarni tahrirlash", callback_data: "admin_texts" }],
          ],
        },
      },
    );
  });

  // Create keyboard with buttons based on user role
  async function createKeyboard(userId: string, storage: IStorage) {
    // Check if user is admin
    const admin = await storage.getAdminByTelegramId(userId);

    if (admin) {
      // Admin keyboard with ONLY admin panel button and without user buttons
      return {
        reply_markup: {
          keyboard: [
            [{ text: "🔐 Admin Panel" }],
            [{ text: "📝 Xabarlar" }],
            [{ text: "📊 Statistika" }],
          ] as KeyboardButton[][],
          resize_keyboard: true,
        },
      };
    } else {
      // For regular users, check if they are near expiry date (for payment button)
      const user = await storage.getUserByTelegramId(userId);
      const shouldShowPaymentButton = await checkIfUserNeedsPayment(user);
      
      // Regular user keyboard - determine if payment button should be visible
      const keyboard: KeyboardButton[][] = [];
      
      // Main button row always visible
      keyboard.push([{ text: "📤 To'lov holatim" }]);
      
      // Payment button only shown when expiry date is approaching
      if (shouldShowPaymentButton) {
        keyboard.push([{ text: "💰 To'lovni amalga oshirish" }]);
      }
      
      // Bottom row with info buttons always visible
      keyboard.push([{ text: "📎 Bot haqida" }, { text: "📞 Aloqa" }]);
      
      return {
        reply_markup: {
          keyboard: keyboard,
          resize_keyboard: true,
        },
      };
    }
  }
  
  // Helper function to check if user needs to make a payment
  async function checkIfUserNeedsPayment(user: any): Promise<boolean> {
    if (!user) return false;
    
    // Already expired users need to make a payment
    if (user.paymentStatus === PaymentStatus.EXPIRED || user.paymentStatus === PaymentStatus.REJECTED) {
      return true;
    }
    
    // If user has an expiry date, check how many days remain
    if (user.paymentExpiryDate) {
      const expiryDate = new Date(user.paymentExpiryDate);
      const today = new Date();
      
      // Calculate days difference
      const timeDiff = expiryDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      // Show payment button if 3 or fewer days remain
      return (daysDiff <= 3);
    }
    
    return false;
  }

  // Send start message with keyboard
  async function sendStartMessage(chatId: string, userId?: string) {
    const startText = await storage.getText("startMessage");

    if (userId) {
      // If userId is provided, create keyboard based on user role
      const keyboard = await createKeyboard(userId, storage);

      bot.sendMessage(
        chatId,
        startText?.value ||
          "Assalomu alaykum! To'lov nazoratchi botga xush kelibsiz.\n\nIltimos, ro'yxatdan o'tish uchun ism va familiyangizni kiriting.",
        keyboard,
      );
    } else {
      // Default keyboard for unknown user - initially without any buttons
      bot.sendMessage(
        chatId,
        startText?.value ||
          "Assalomu alaykum! To'lov nazoratchi botga xush kelibsiz.\n\nIltimos, ro'yxatdan o'tish uchun ism va familiyangizni kiriting.",
      );
    }
  }

  // Reset user session
  function resetUserSession(userId: string) {
    sessions.set(userId, {
      state: "waiting_name",
      data: {},
    });
  }

  // Notify admins about new payment
  async function notifyAdmins(storage: IStorage, user: any) {
    const admins = await storage.getAllAdmins();

    // Get user's receipt path
    const receiptPath = user.paymentProof;

    if (!receiptPath) {
      console.error("No receipt path found for user:", user);
      return;
    }

    for (const admin of admins) {
      try {
        // Send user info
        const message = `📑 Yangi to'lov cheki:\n\n👤 Ism: ${user.fullName}\n📞 Tel: ${user.phoneNumber}\n\nTasdiqlaysizmi?`;

        // Send photo with inline keyboard
        await bot.sendPhoto(
          admin.telegramId,
          fs.createReadStream(path.join(process.cwd(), receiptPath)),
          {
            caption: message,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "✅ Tasdiqlash",
                    callback_data: `approve_${user.id}`,
                  },
                  {
                    text: "❌ Bekor qilish",
                    callback_data: `reject_${user.id}`,
                  },
                ],
              ],
            },
          },
        );
      } catch (error) {
        console.error(`Error notifying admin ${admin.telegramId}:`, error);
        // Try sending a text message if photo fails
        try {
          await bot.sendMessage(
            admin.telegramId,
            `📑 Yangi to'lov:\n\n👤 *${user.fullName}*\n📞 *${user.phoneNumber}*\n\n⚠️ Chek rasmini yuborishda xatolik yuz berdi.`,
            {
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "✅ Tasdiqlash",
                      callback_data: `approve_${user.id}`,
                    },
                    {
                      text: "❌ Bekor qilish",
                      callback_data: `reject_${user.id}`,
                    },
                  ],
                ],
              },
            },
          );
        } catch (msgError) {
          console.error(
            `Error sending fallback message to admin ${admin.telegramId}:`,
            msgError,
          );
        }
      }
    }
  }

  // Handle inline keyboard callbacks
  bot.on("callback_query", async (callbackQuery) => {
    if (!callbackQuery.data || !callbackQuery.from) return;

    const adminId = callbackQuery.from.id.toString();
    const chatId = callbackQuery.message?.chat.id;

    // Check if user is admin for admin panel actions
    if (callbackQuery.data.startsWith("admin_")) {
      const admin = await storage.getAdminByTelegramId(adminId);

      if (!admin) {
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Sizda ruxsat yo'q",
          show_alert: true,
        });
        return;
      }

      // Handle admin panel actions
      const action = callbackQuery.data;

      if (action === "admin_pending") {
        // Show pending payments
        const pendingUsers = await storage.getUsersByPaymentStatus(
          PaymentStatus.PENDING,
        );

        if (pendingUsers.length === 0) {
          bot.answerCallbackQuery(callbackQuery.id, {
            text: "Kutilayotgan to'lovlar yo'q",
            show_alert: true,
          });
          return;
        }

        // Send welcome message
        if (chatId)
          bot.sendMessage(
            chatId,
            "⏳ *Kutilayotgan to'lovlar:*\n\nHar bir foydalanuvchi alohida post sifatida yuboriladi.",
            {
              parse_mode: "Markdown",
            },
          );

        // Send each pending user as a separate post with inline buttons
        for (const user of pendingUsers) {
          // Check if user has payment proof
          if (!user.paymentProof) {
            if (chatId)
              bot.sendMessage(
                chatId,
                `👤 *${user.fullName}*\n📞 ${user.phoneNumber}\n\n⚠️ To'lov cheki topilmadi.`,
                { parse_mode: "Markdown" },
              );
            continue;
          }

          try {
            // Send photo with inline keyboard
            if (chatId)
              await bot.sendPhoto(
                chatId,
                fs.createReadStream(
                  path.join(process.cwd(), user.paymentProof),
                ),
                {
                  caption: `📑 To'lov cheki:\n\n👤 *${user.fullName}*\n📞 ${user.phoneNumber}\n\nTasdiqlaysizmi?`,
                  parse_mode: "Markdown",
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: "✅ Tasdiqlash",
                          callback_data: `approve_${user.id}`,
                        },
                        {
                          text: "❌ Bekor qilish",
                          callback_data: `reject_${user.id}`,
                        },
                      ],
                    ],
                  },
                },
              );
          } catch (error) {
            console.error("Error sending payment photo to admin:", error);
            if (chatId)
              bot.sendMessage(
                chatId,
                `👤 *${user.fullName}*\n📞 ${user.phoneNumber}\n\n⚠️ To'lov chekini yuborishda xatolik yuz berdi.`,
                { parse_mode: "Markdown" },
              );
          }
        }

        bot.answerCallbackQuery(callbackQuery.id);
      } else if (action === "admin_users") {
        // Show all users (with pagination if needed)
        const users = await storage.getAllUsers();

        if (users.length === 0) {
          bot.answerCallbackQuery(callbackQuery.id, {
            text: "Foydalanuvchilar yo'q",
            show_alert: true,
          });
          return;
        }

        const formatDate = (date: Date | undefined) => {
          if (!date) return "Aniqlanmagan";
          return new Date(date).toLocaleDateString("uz-UZ");
        };

        // Send list of users (limit to 10 users to avoid message size limits)
        let message = "👥 *Barcha foydalanuvchilar:*\n\n";
        const displayUsers = users.slice(0, 10);

        for (const user of displayUsers) {
          let status = "";

          switch (user.paymentStatus) {
            case PaymentStatus.PENDING:
              status = "⏳ Kutilmoqda";
              break;
            case PaymentStatus.APPROVED:
              status = "✅ Tasdiqlangan";
              break;
            case PaymentStatus.REJECTED:
              status = "❌ Bekor qilingan";
              break;
          }

          message +=
            `👤 *${user.fullName}*\n` +
            `📞 ${user.phoneNumber}\n` +
            `💳 ${status}\n` +
            `📅 ${formatDate(user.paymentExpiryDate || undefined)}\n\n`;
        }

        if (users.length > 10) {
          message += `... va yana ${users.length - 10} foydalanuvchi.`;
        }

        if (chatId)
          bot.sendMessage(chatId, message, {
            parse_mode: "Markdown",
          });

        bot.answerCallbackQuery(callbackQuery.id);
      } else if (action === "admin_expiring") {
        // Show users with expiring memberships
        const expiringUsers = await storage.getUsersByExpiryDate(3);

        if (expiringUsers.length === 0) {
          bot.answerCallbackQuery(callbackQuery.id, {
            text: "Tugayotgan a'zoliklar yo'q",
            show_alert: true,
          });
          return;
        }

        // Send list of expiring users
        let message = "⚠️ *3 kun ichida tugaydigan a'zoliklar:*\n\n";

        for (const user of expiringUsers) {
          const expiryDate = new Date(user.paymentExpiryDate ?? "");
          const today = new Date();
          const daysLeft = Math.ceil(
            (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
          );

          message +=
            `👤 *${user.fullName}*\n` +
            `📞 ${user.phoneNumber}\n` +
            `📅 ${expiryDate.toLocaleDateString("uz-UZ")} (${daysLeft} kun qoldi)\n\n`;
        }

        if (chatId)
          bot.sendMessage(chatId, message, {
            parse_mode: "Markdown",
          });

        bot.answerCallbackQuery(callbackQuery.id);
      } else if (action === "admin_texts") {
        // Show text templates for editing
        const texts = await storage.getAllTexts();

        if (texts.length === 0) {
          bot.answerCallbackQuery(callbackQuery.id, {
            text: "Matnlar topilmadi",
            show_alert: true,
          });
          return;
        }

        // Send list of text templates with edit buttons
        let message =
          "📝 *Matnlarni tahrirlash:*\n\n" +
          "Quyidagi tugmalar orqali matnlarni tahrirlashingiz mumkin:";

        // Create inline keyboard with text edit buttons
        const keyboard: any[][] = [];

        for (const text of texts) {
          // Create a readable name for the text key
          let readableName = "";

          switch (text.key) {
            case "startMessage":
              readableName = "Kirish xabari";
              break;
            case "approvedMessage":
              readableName = "Tasdiqlash xabari";
              break;
            case "beforePaymentMessage":
              readableName = "To'lov qilish yo'riqnomasi";
              break;
            case "contactMessage":
              readableName = "Aloqa ma'lumotlari";
              break;
            case "aboutBotMessage":
              readableName = "Bot haqida ma'lumot";
              break;
            default:
              readableName = text.key;
          }

          keyboard.push([
            { text: readableName, callback_data: `edit_text_${text.key}` },
          ]);
        }

        if (chatId)
          bot.sendMessage(chatId, message, {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: keyboard,
            },
          });

        bot.answerCallbackQuery(callbackQuery.id);
      }

      return;
    } else if (callbackQuery.data.startsWith("edit_text_")) {
      // Handle text editing
      const textKey = callbackQuery.data.replace("edit_text_", "");
      const text = await storage.getText(textKey);

      if (!text) {
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Matn topilmadi",
          show_alert: true,
        });
        return;
      }

      // Get readable name for the text key
      let readableName = "";

      switch (textKey) {
        case "startMessage":
          readableName = "Kirish xabari";
          break;
        case "approvedMessage":
          readableName = "Tasdiqlash xabari";
          break;
        case "beforePaymentMessage":
          readableName = "To'lov qilish yo'riqnomasi";
          break;
        case "contactMessage":
          readableName = "Aloqa ma'lumotlari";
          break;
        case "aboutBotMessage":
          readableName = "Bot haqida ma'lumot";
          break;
        default:
          readableName = textKey;
      }

      // Send current text and ask for new text
      if (chatId)
        bot
          .sendMessage(
            chatId,
            `📝 *${readableName}*\n\nJoriy matn:\n\n${text.value}\n\nYangi matnni kiriting:`,
            {
              parse_mode: "Markdown",
              reply_markup: {
                force_reply: true,
                selective: true,
              },
            },
          )
          .then((sentMessage) => {
            // Listen for the admin's reply
            const replyListenerId = bot.onReplyToMessage(
              sentMessage.chat.id,
              sentMessage.message_id,
              async (message) => {
                if (!message.text) return;

                // Update text
                const updatedText = await storage.updateText(
                  textKey,
                  message.text,
                );

                if (updatedText) {
                  if (chatId)
                    bot.sendMessage(
                      chatId,
                      `✅ *${readableName}* muvaffaqiyatli yangilandi.`,
                      {
                        parse_mode: "Markdown",
                      },
                    );
                } else {
                  if (chatId)
                    bot.sendMessage(
                      chatId,
                      `❌ *${readableName}* yangilashda xatolik yuz berdi.`,
                      {
                        parse_mode: "Markdown",
                      },
                    );
                }

                // Remove this listener
                bot.removeReplyListener(replyListenerId);
              },
            );
          });

      bot.answerCallbackQuery(callbackQuery.id);
      return;
    }

    // Handle payment approval/rejection
    const admin = await storage.getAdminByTelegramId(adminId);

    if (!admin) {
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Sizda ruxsat yo'q",
        show_alert: true,
      });
      return;
    }

    const [action, userId] = callbackQuery.data.split("_");

    // Skip if not approval/rejection
    if (action !== "approve" && action !== "reject") {
      return;
    }

    const user = await storage.getUser(parseInt(userId));

    if (!user) {
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Foydalanuvchi topilmadi",
        show_alert: true,
      });
      return;
    }

    if (action === "approve") {
      // Approve payment
      const now = new Date();
      const expiryDate = new Date();
      expiryDate.setMonth(now.getMonth() + 1);

      await storage.updateUser(user.id, {
        paymentStatus: PaymentStatus.APPROVED,
        isActive: true,
        paymentExpiryDate: expiryDate,
      });

      // Add user to group if group ID is provided
      if (process.env.TELEGRAM_GROUP_ID) {
        try {
          await bot.unbanChatMember(
            process.env.TELEGRAM_GROUP_ID,
            parseInt(user.telegramId),
          );

          // Generate invite link
          const inviteLink = await bot.exportChatInviteLink(
            process.env.TELEGRAM_GROUP_ID,
          );

          // Send approval message with link
          const approvedText = await storage.getText("approvedMessage");
          bot.sendMessage(
            user.telegramId,
            `${approvedText?.value || "To'lovingiz tasdiqlandi! Siz guruhga qo'shildingiz. A'zolik muddati bir oyga uzaytirildi."}\n\nGuruhga qo'shilish uchun havola: ${inviteLink}`,
          );
        } catch (error) {
          console.error("Error adding user to group:", error);

          // Send approval without link
          const approvedText = await storage.getText("approvedMessage");
          bot.sendMessage(
            user.telegramId,
            approvedText?.value ||
              "To'lovingiz tasdiqlandi! Siz guruhga qo'shildingiz. A'zolik muddati bir oyga uzaytirildi.",
          );
        }
      } else {
        // Send approval without link
        const approvedText = await storage.getText("approvedMessage");
        bot.sendMessage(
          user.telegramId,
          approvedText?.value ||
            "To'lovingiz tasdiqlandi! Siz guruhga qo'shildingiz. A'zolik muddati bir oyga uzaytirildi.",
        );
      }

      // Answer callback
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "To'lov tasdiqlandi",
      });

      // Update inline keyboard
      bot.editMessageReplyMarkup(
        {
          inline_keyboard: [
            [{ text: "✅ Tasdiqlandi", callback_data: "approved" }],
          ],
        },
        {
          chat_id: callbackQuery.message?.chat.id,
          message_id: callbackQuery.message?.message_id,
        },
      );
    } else if (action === "reject") {
      // Ask admin for rejection reason
      bot
        .sendMessage(
          adminId,
          `${user.fullName} uchun to'lovni bekor qilish sababini kiriting:`,
          {
            reply_markup: {
              force_reply: true,
              selective: true,
            },
          },
        )
        .then((sentMessage) => {
          // Listen for the admin's reply
          const replyListenerId = bot.onReplyToMessage(
            sentMessage.chat.id,
            sentMessage.message_id,
            async (message) => {
              if (!message.text) return;

              // Update user status
              await storage.updateUser(user.id, {
                paymentStatus: PaymentStatus.REJECTED,
              });

              // Notify user about rejection
              bot.sendMessage(
                user.telegramId,
                `Sizning to'lovingiz bekor qilindi.\nSabab: ${message.text}\n\nIltimos, to'lovni qayta amalga oshirib, chekni yuboring.`,
              );

              // Confirm to admin
              bot.sendMessage(
                adminId,
                `${user.fullName} uchun to'lov bekor qilindi.`,
              );

              // Update inline keyboard
              bot.editMessageReplyMarkup(
                {
                  inline_keyboard: [
                    [{ text: "❌ Bekor qilindi", callback_data: "rejected" }],
                  ],
                },
                {
                  chat_id: callbackQuery.message?.chat.id,
                  message_id: callbackQuery.message?.message_id,
                },
              );

              // Remove this listener
              bot.removeReplyListener(replyListenerId);
            },
          );
        });

      // Answer callback
      bot.answerCallbackQuery(callbackQuery.id);
    }
  });

  return bot;
}

// Helper function to download file
async function downloadFile(url: string, path: string): Promise<void> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to download file: ${response.status} ${response.statusText}`,
    );
  }

  // Store the file data in memory and then write it to a file
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(path, Buffer.from(buffer));

  return Promise.resolve();
}

export function getBot(): TelegramBot {
  if (!bot) {
    throw new Error("Bot not initialized");
  }
  return bot;
}

// Function to check if MongoDB is connected before starting bot operations
export function isStorageConnected(): boolean {
  return !!storage;
}
