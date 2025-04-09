# To'lov Nazoratchi Bot

Bu Telegram bot guruh a'zoligini to'lovlarni nazorat qilish va boshqarish uchun yaratilgan tizim. Bot orqali foydalanuvchilar to'lov qilishlari, to'lov chekini yuklashlari va a'zolik holatini tekshirishlari mumkin.

## Asosiy imkoniyatlar

- Foydalanuvchilar uchun to'lov qilish va to'lov chekini yuborish imkoniyati
- Administratorlar uchun to'lovlarni tasdiqlash/bekor qilish va foydalanuvchilarni boshqarish
- Har bir kutilayotgan to'lov alohida post sifatida ko'rsatiladi
- Har bir to'lov posti uchun tasdiqlash va bekor qilish tugmalari
- A'zolik muddati boshqaruvi va eslatmalar
- Matnlarni tahrirlash imkoniyati (Kirish xabari, To'lov ko'rsatmalari va boshq.)

## Sozlash

1. `.env` faylini yarating va quyidagi o'zgaruvchilarni to'ldiring:
   ```
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   TELEGRAM_GROUP_ID=your_telegram_group_id_here
   ```

2. TELEGRAM_BOT_TOKEN olish uchun:
   - BotFather (@BotFather) orqali Telegram botingizni yarating
   - Botingizni tanlang va /token buyrug'ini yuborib, API tokenini oling

3. TELEGRAM_GROUP_ID olish uchun:
   - Botingizni guruhga qo'shing
   - Guruhda biror xabar yuboring
   - Ushbu URL ga kiring: https://api.telegram.org/bot<TOKEN>/getUpdates
   - JSON javobda "chat" obyektida "id" ni toping. Bu guruhingizning ID si bo'ladi

4. Quyidagi buyruq bilan loyiha bilan ishga tushuring:
   ```
   npm run dev
   ```

## Admin sozlashlari

Admin huquqlarini berish uchun `server/storage.ts` faylidagi `DEFAULT_ADMIN_ID` o'zgaruvchisini o'zingizning Telegram ID raqamingizga o'zgartiring.

Siz o'z Telegram ID raqamingizni @userinfobot orqali olishingiz mumkin.

## Xabar matnlarini o'zgartirish

Bot ishlayotgan vaqtda, "Admin Panel" -> "Matnlarni tahrirlash" orqali xabar matnlarini o'zgartirishingiz mumkin. Quyidagi matnlarni o'zgartirishingiz mumkin:

- Kirish xabari
- Tasdiqlash xabari
- To'lov qilish yo'riqnomasi
- Aloqa ma'lumotlari
- Bot haqida ma'lumot

## Technik tafsilotlar

- Node.js va Express.js asosida qurilgan
- TypeScript orqali yozilgan
- Telegram Bot API bilan integratsiya qilingan
- In-memory ma'lumotlar saqlash tizimi