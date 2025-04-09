# TO'LOV NAZORATCHI BOT: BOSHLANG'ICH SOZLASHLAR

## Qadamlar

1. Telegram botni sozlash:
   - @BotFather bilan muloqot boshlang (/start)
   - Yangi bot yaratish uchun /newbot buyrug'ini yuboring
   - Botingiz uchun nom kiriting (masalan, "To'lov Nazoratchi Bot")
   - Botingiz uchun username kiriting (masalan, "tolov_nazoratchi_bot")
   - BotFather tomonidan berilgan API tokenni saqlang

2. Guruh yaratish va bot qo'shish:
   - Telegram da yangi guruh yarating
   - Botingizni guruhga qo'shing
   - Botga admin huquqlarini bering (guruhga a'zolarni qo'shish va chiqarish huquqi)

3. Bot secret (maxfiy) ma'lumotlarini o'rnatish:
   - Ushbu loyihada `.env` faylini yarating (replit muhitida) quyidagi ma'lumotlar bilan:
   ```
   TELEGRAM_BOT_TOKEN=botfather_bergan_token  # BotFather dan olgan tokeningiz
   TELEGRAM_GROUP_ID=guruh_id_raqami          # Pastda ko'rsatilgan usul orqali olinadi
   ```

4. Guruh ID sini topish:
   - Yaratilgan guruhda biror xabar yuboring
   - Ushbu URL ga kiring (botingiz tokenini qo'ying):
     ```
     https://api.telegram.org/botTOKEN/getUpdates
     ```
   - Javobdan "chat" obyekti ichidagi "id" qiymatini toping. Bu sizning guruh ID raqamingiz.

5. Admin huquqlarini o'zingizga berish:
   - Botingizga /start buyrug'ini yuborib, ro'yxatdan o'ting
   - Keyin `server/storage.ts` faylida `DEFAULT_ADMIN_ID` o'zgaruvchisini o'zingizning Telegram ID raqamingizga o'zgartiring
   - Telegram ID raqamingizni @userinfobot orqali olishingiz mumkin

6. Xabarlarni sozlash:
   - Botni ishga tushirish uchun 'Start application' workflow ni boshlang
   - Admin panel orqali o'zingizga mos xabarlarni o'rnating (Kirish xabari, To'lov ko'rsatmalari, va h.k.)

7. Botni ishlatish:
   - Foydalanuvchilar /start orqali bot bilan ishlashni boshlaydilar
   - Ular ism-familiya va telefon raqamlarini kiritadilar
   - To'lov qilish yo'riqnomasi yuboriladi
   - Foydalanuvchilar to'lov chekini yuboradilar
   - Admin bu to'lovni tasdiqlaydi yoki rad etadi
   - Tasdiqlangan foydalanuvchilar guruhga qo'shiladi

## Admin buyruqlari
- Kutilayotgan to'lovlar - Tekshirish kerak bo'lgan to'lovlarni ko'rsatadi
- Barcha foydalanuvchilar - Hamma foydalanuvchilar ro'yxatini ko'rsatadi
- Tugayotgan a'zoliklar - Muddati tugayotgan a'zoliklarni ko'rsatadi
- Matnlarni tahrirlash - Bot matnlarini tahrirlash uchun menyu

## Muammolarni hal qilish

Agar botni ishga tushirganda xatolik yuz bersa:
1. .env faylini to'g'ri to'ldirilganligini tekshiring
2. TELEGRAM_BOT_TOKEN va TELEGRAM_GROUP_ID raqamlarini to'g'ri kiritilganini tekshiring
3. Bot guruhda admin huquqlariga ega ekanligini tekshiring
4. 'uploads' papkasi mavjudligini va unga yozish huquqi borligini tekshiring