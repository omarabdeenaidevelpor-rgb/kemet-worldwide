# نشر المشروع على Railway.com

## التعديلات المُنفذة ✅

تم تعديل المشروع ليعمل في **وضع Demo** بدون قاعدة بيانات للسماح بتسجيل الدخول التجريبي للعملاء.

### الملفات المعدّلة:
- ✅ `src/lib/auth.ts` — يدعم تسجيل الدخول بدون DB عند غياب `DATABASE_URL`
- ✅ `src/lib/demo-data.ts` — بيانات تجريبية ثابتة
- ✅ `next.config.mjs` — يكتشف `NEXTAUTH_URL` تلقائياً من Railway
- ✅ جميع API routes (dashboard, shipments, customers, employees, invoices, incidents, currencies)

---

## خطوات النشر على Railway

### 1️⃣ افتح Railway.com → مشروعك → الـ Service بتاع التطبيق

### 2️⃣ اذهب إلى → **Variables**

### 3️⃣ تأكد من وجود المتغيرات التالية:

| المتغير | القيمة |
|---|---|
| `NEXTAUTH_SECRET` | ✅ موجود بالفعل |
| `NEXTAUTH_URL` | **أضف:** `https://kemet-worldwide-production.up.railway.app` |
| `NODE_ENV` | **أضف:** `production` |

> ⚠️ **مهم جداً:** لا تضع `/` في نهاية `NEXTAUTH_URL`

### 4️⃣ ⚠️ **غيّر الـ NEXTAUTH_SECRET** (لأنك شاركته في المحادثة)

```powershell
# شغّل الأمر ده في PowerShell عشان تولّد مفتاح جديد:
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

انسخ الناتج وضعه في Railway كقيمة لـ `NEXTAUTH_SECRET`.

### 5️⃣ بعد حفظ المتغيرات

Railway هيعمل **redeploy تلقائي**. انتظر حتى يكتمل الـ deployment.

### 6️⃣ افتح التطبيق

```
https://kemet-worldwide-production.up.railway.app
```

---

## الحسابات التجريبية

بعد تسجيل الدخول بنجاح، استخدم أي حساب من القائمة الظاهرة على صفحة الدخول:

| الدور | البريد | كلمة المرور |
|---|---|---|
| **المدير العام** | admin@kemet.com | KemetAdmin2024! |
| **مدير العمليات** | ops@kemet.com | KemetOps2024! |
| **المحاسب** | finance@kemet.com | KemetFinance2024! |
| **منسق الشحنات** | coordinator@kemet.com | KemetCoord2024! |
| **خدمة العملاء** | cs@kemet.com | KemetCS2024! |
| **مندوب المبيعات** | sales@kemet.com | KemetSales2024! |
| **المراجع** | auditor@kemet.com | KemetAudit2024! |

---

## ربط قاعدة البيانات لاحقاً

لما تكون جاهز لربط PostgreSQL:

1. في Railway → أضف PostgreSQL service
2. في Variables → أضف:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ```
3. شغّل migrations من terminal:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

---

## استكشاف الأخطاء

### مشكلة: "حدث خطأ، يرجى المحاولة مرة أخرى"

**الحل:**
- تأكد إن `NEXTAUTH_URL` مضبوط بالظبط بدون `/` في الآخر
- تأكد إن `NEXTAUTH_SECRET` موجود ومش فاضي

### مشكلة: صفحة بيضاء أو 500 error

**الحل:**
1. افتح Railway → Deployments → آخر deployment → **View Logs**
2. ابحث عن الخطأ في الـ logs
3. ابعت الـ log message للمطور

---

## ملاحظات مهمة

- ⚠️ **الوضع التجريبي بدون قاعدة بيانات** — لا يمكن حفظ أي تعديلات
- ✅ كل الصفحات والـ APIs شغالة بـ demo data
- ✅ المشروع يكتشف تلقائياً وجود أو غياب `DATABASE_URL`
- ✅ لما تضيف `DATABASE_URL` لاحقاً، النظام هيستخدم قاعدة البيانات الحقيقية

---

**تم الانتهاء من التعديلات بنجاح! 🎉**

الآن المشروع جاهز للتجربة من العميل بدون قاعدة بيانات.
