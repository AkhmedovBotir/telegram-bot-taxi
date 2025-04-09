import * as cron from "node-cron";
import { IStorage } from "./storage";
import TelegramBot from "node-telegram-bot-api";

export function setupScheduler(storage: IStorage, bot: TelegramBot) {
  const reminderHours = ["09:00", "15:00", "21:00"];
  
  reminderHours.forEach(hour => {
    const [h, m] = hour.split(":");
    
    cron.schedule(`${m} ${h} * * *`, async () => {
      await sendExpiryReminders(storage, bot);
    });
  });
  
  cron.schedule("59 23 * * *", async () => {
    await processExpiredUsers(storage, bot);
  });
  
  cron.schedule("* * * * *", async () => {
    console.log("Running minute-by-minute checks...");
    await sendExpiryReminders(storage, bot);
    await processExpiredUsers(storage, bot);
  });
  
  console.log("Scheduler set up for reminders and expiry checks");
}

async function sendExpiryReminders(storage: IStorage, bot: TelegramBot) {
  try {
    console.log("Checking for expiry reminders...");
    
    const users3Days = await storage.getUsersByExpiryDate(3);
    console.log(`Found ${users3Days.length} users expiring in 3 days`);
    
    for (const user of users3Days) {
      const expiryDate = user.paymentExpiryDate 
        ? new Date(user.paymentExpiryDate).toLocaleDateString('uz-UZ') 
        : "";
      
      console.log(`Sending 3-day reminder to user ${user.fullName} (ID: ${user.id}), expires on ${expiryDate}`);
      
      try {
        const keyboard = {
          keyboard: [
            [{ text: '💰 To\'lovni amalga oshirish' }]
          ],
          resize_keyboard: true,
          one_time_keyboard: false
        };
        
        await bot.sendMessage(
          user.telegramId,
          `⚠️ Eslatma: Sizning a'zolik muddatingiz 3 kun ichida (${expiryDate}) tugaydi. ` +
          `\n\nIltimos, to'lovni o'z vaqtida amalga oshiring. ` +
          `\n\nTo'lov qilish uchun "To'lovni amalga oshirish" tugmasini bosing va to'lov chekini yuborish orqali a'zolikni 1 oyga uzaytiring.`,
          { reply_markup: keyboard }
        );
      } catch (err) {
        console.error(`Error sending 3-day reminder to user ${user.fullName}:`, err);
      }
    }
    
    // Check for users expiring in 2 days
    const users2Days = await storage.getUsersByExpiryDate(2);
    console.log(`Found ${users2Days.length} users expiring in 2 days`);
    
    for (const user of users2Days) {
      const expiryDate = user.paymentExpiryDate 
        ? new Date(user.paymentExpiryDate).toLocaleDateString('uz-UZ') 
        : "";
      
      console.log(`Sending 2-day reminder to user ${user.fullName} (ID: ${user.id}), expires on ${expiryDate}`);
      
      try {
        // Create keyboard for payment
        const keyboard = {
          keyboard: [
            [{ text: '💰 To\'lovni amalga oshirish' }]
          ],
          resize_keyboard: true,
          one_time_keyboard: false
        };
        
        await bot.sendMessage(
          user.telegramId,
          `⚠️ Eslatma: Sizning a'zolik muddatingiz 2 kun ichida (${expiryDate}) tugaydi. ` +
          `\n\nIltimos, to'lovni o'z vaqtida amalga oshiring. ` +
          `\n\nTo'lov qilish uchun "To'lovni amalga oshirish" tugmasini bosing va to'lov chekini yuborish orqali a'zolikni 1 oyga uzaytiring.`,
          { reply_markup: keyboard }
        );
      } catch (err) {
        console.error(`Error sending 2-day reminder to user ${user.fullName}:`, err);
      }
    }
    
    // Check for users expiring in 1 day
    const users1Day = await storage.getUsersByExpiryDate(1);
    console.log(`Found ${users1Day.length} users expiring in 1 day`);
    
    for (const user of users1Day) {
      const expiryDate = user.paymentExpiryDate 
        ? new Date(user.paymentExpiryDate).toLocaleDateString('uz-UZ') 
        : "";
      
      console.log(`Sending 1-day reminder to user ${user.fullName} (ID: ${user.id}), expires on ${expiryDate}`);
      
      try {
        // Create keyboard for payment
        const keyboard = {
          keyboard: [
            [{ text: '💰 To\'lovni amalga oshirish' }]
          ],
          resize_keyboard: true,
          one_time_keyboard: false
        };
        
        await bot.sendMessage(
          user.telegramId,
          `⚠️ Eslatma: Sizning a'zolik muddatingiz ertaga (${expiryDate}) tugaydi. ` +
          `\n\nIltimos, to'lovni bugun amalga oshiring, aks holda ertaga guruhdan chiqarilasiz. ` +
          `\n\nTo'lov qilish uchun "To'lovni amalga oshirish" tugmasini bosing va to'lov chekini yuborish orqali a'zolikni 1 oyga uzaytiring.`,
          { reply_markup: keyboard }
        );
      } catch (err) {
        console.error(`Error sending 1-day reminder to user ${user.fullName}:`, err);
      }
    }
    
    // Check for users expiring today
    const usersToday = await storage.getUsersByExpiryDate(0);
    console.log(`Found ${usersToday.length} users expiring today`);
    
    for (const user of usersToday) {
      const expiryDate = user.paymentExpiryDate 
        ? new Date(user.paymentExpiryDate).toLocaleDateString('uz-UZ') 
        : "";
      
      console.log(`Sending same-day reminder to user ${user.fullName} (ID: ${user.id}), expires on ${expiryDate}`);
      
      try {
        // Create keyboard for payment
        const keyboard = {
          keyboard: [
            [{ text: '💰 To\'lovni amalga oshirish' }]
          ],
          resize_keyboard: true,
          one_time_keyboard: false
        };
        
        await bot.sendMessage(
          user.telegramId,
          `⚠️ MUHIM ESLATMA: Sizning a'zolik muddatingiz bugun (${expiryDate}) tugaydi! ` +
          `\n\nIltimos, to'lovni DARHOL amalga oshiring, aks holda bugun yarim tunda guruhdan chiqarilasiz. ` +
          `\n\nTo'lov qilish uchun "To'lovni amalga oshirish" tugmasini bosing va to'lov chekini yuborish orqali a'zolikni 1 oyga uzaytiring.`,
          { reply_markup: keyboard }
        );
      } catch (err) {
        console.error(`Error sending same-day reminder to user ${user.fullName}:`, err);
      }
    }
  } catch (error) {
    console.error("Error sending expiry reminders:", error);
  }
}

async function processExpiredUsers(storage: IStorage, bot: TelegramBot) {
  try {
    console.log("Checking for expired users...");
    const today = new Date();
    console.log(`Current date for comparison: ${today.toISOString()}`);
    
    // Get all users
    const allUsers = await storage.getAllUsers();
    console.log(`Total users: ${allUsers.length}`);
    
    // Find expired users (better debugging)
    const expiredUsers = [];
    for (const user of allUsers) {
      if (!user.paymentExpiryDate) {
        console.log(`User ${user.fullName} (ID: ${user.id}) has no expiry date`);
        continue;
      }
      
      if (!user.isActive) {
        console.log(`User ${user.fullName} (ID: ${user.id}) is already inactive`);
        continue;
      }
      
      const expiryDate = new Date(user.paymentExpiryDate);
      console.log(`User ${user.fullName} (ID: ${user.id}) expiry date: ${expiryDate.toISOString()}`);
      
      if (expiryDate <= today) {
        console.log(`User ${user.fullName} (ID: ${user.id}) has EXPIRED`);
        expiredUsers.push(user);
      } else {
        console.log(`User ${user.fullName} (ID: ${user.id}) still active, expires on ${expiryDate.toISOString()}`);
      }
    }
    
    console.log(`Found ${expiredUsers.length} expired users to process`);
    
    // Process each expired user
    for (const user of expiredUsers) {
      try {
        console.log(`Processing expired user: ${user.fullName} (ID: ${user.id})`);
        
        // Update user status
        await storage.updateUser(user.id, {
          isActive: false,
          paymentStatus: 'expired' // Set status to expired
        });
        
        // Attempt to remove from group
        if (process.env.TELEGRAM_GROUP_ID) {
          try {
            console.log(`Attempting to kick user ${user.fullName} from group ${process.env.TELEGRAM_GROUP_ID}`);
            // Parse string to number for Telegram API
            await bot.banChatMember(
              process.env.TELEGRAM_GROUP_ID,
              parseInt(user.telegramId) 
            );
            console.log(`Kicked user ${user.fullName} from group successfully`);
          } catch (error) {
            console.error(`Error kicking user ${user.fullName} from group:`, error);
          }
        } else {
          console.log('No Telegram group ID configured, skipping kick operation');
        }
        
        // Notify user about expiration and request new payment
        try {
          console.log(`Sending expiration notification to user ${user.fullName}`);
          await bot.sendMessage(
            user.telegramId,
            "⏳ Sizning a'zolik muddatingiz tugadi va guruhdan chiqarildingiz.\n\n" +
            "Iltimos, yangi to'lovni amalga oshiring:\n" +
            "1. To'lov qilish tugmasini bosing\n" +
            "2. To'lov chekini rasmga olib yuboring\n" +
            "3. To'lovingiz tasdiqlanganidan so'ng guruhga qo'shilasiz"
          );
        } catch (telegramError) {
          console.error(`Error sending expiration message to user ${user.fullName}:`, telegramError);
        }
      } catch (error) {
        console.error(`Error processing expired user ${user.fullName}:`, error);
      }
    }
  } catch (error) {
    console.error("Error processing expired users:", error);
  }
}
