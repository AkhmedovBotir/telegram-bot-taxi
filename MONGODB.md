# MongoDB bo\'yicha yo\'riqnoma

Loyiha ma\'lumotlarini saqlash uchun MongoDB dan foydalanish mumkin. Bu yerda MongoDB ni o\'rnatish va sozlash bo\'yicha qadamlar ko\'rsatilgan.

## Replit muhitida

Replit muhitida MongoDB ishlamaydi, shu sababli ma\'lumotlar xotirada saqlanadi (in-memory storage). Bu shuni anglatadiki, har safar dastur qayta ishga tushganda barcha ma\'lumotlar yo\'qoladi.

## Mahalliy kompyuterda

Mahalliy kompyuterda loyihani ishlatganingizda MongoDB dan foydalanish mumkin. Bu ma\'lumotlarni doimiy ravishda saqlash imkonini beradi.

### O\'rnatish

1. [MongoDB Community Edition](https://www.mongodb.com/try/download/community) ni yuklab oling va o\'rnating
2. MongoDB xizmatini ishga tushiring:
   - Windows: MongoDB xizmati avtomatik ishga tushadi
   - MacOS: `brew services start mongodb-community`
   - Linux: `sudo systemctl start mongod`

### Sozlash

1. `.env` faylidagi sozlamalarni o\'zgartiring:
   ```
   USE_MONGO=true
   MONGODB_URL=mongodb://localhost:27017/telegramPayBot
   ```

2. Agar MongoDB boshqa kompyuter yoki serverda joylashgan bo\'lsa, MONGODB_URL ni shunga qarab o\'zgartiring:
   ```
   MONGODB_URL=mongodb://username:password@hostname:port/telegramPayBot
   ```

### MongoDB Cloud Atlas

MongoDB Cloud Atlas - bu bepul bulutli MongoDB xizmati, u bilan ham ishlash mumkin:

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) da ro\'yxatdan o\'ting
2. Yangi klaster yarating (Free Tier)
3. Database Access bo\'limida foydalanuvchi yarating
4. Network Access bo\'limida IP addressingizni qo\'shing (yoki 0.0.0.0/0 barcha IP lar uchun)
5. Asosiy sahifada "Connect" tugmasini bosing va Connection String ni oling
6. `.env` faylini yangilang:
   ```
   USE_MONGO=true
   MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/telegramPayBot
   ```

## Muammolarni hal qilish

Agar MongoDB bilan ulanishda muammo bo\'lsa:

1. MongoDB xizmati ishga tushganini tekshiring
2. MONGODB_URL to\'g\'ri ekanligini tekshiring
3. Agar bulutli MongoDB ishlatsangiz, IP address mumkin bo\'lgan ro\'yxatda ekanligini tekshiring
4. Firewall yoki tarmoq sozlamalari MongoDB portini (odatda 27017) bloklash yoki bloklashmasligini tekshiring

Ma\'lumotlar in-memory storageda saqlanishini davom ettirish uchun `.env` faylida `USE_MONGO=false` ko\'rsating yoki o\'zgaruvchini o\'chirib tashlang.
