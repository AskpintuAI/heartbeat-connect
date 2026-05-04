# 🔥 Firebase Rules — ज़रूर deploy करें (वरना app काम नहीं करेगा)

आपके पास जो errors आ रहे हैं —
- `permission-denied` (chat delete fail)
- `storage/unauthorized` (photo upload fail)

— **ये code का bug नहीं है।** Firebase project me default rules सब कुछ block करती हैं।
इन्हें एक बार Firebase Console me paste करना है, फिर सब चलने लगेगा।

---

## ✅ Step 1 — Firestore Rules

1. खोलें: <https://console.firebase.google.com/project/maasebaat/firestore/rules>
2. पूरा content delete करें
3. `firebase-rules/firestore.rules` फ़ाइल का सारा content paste करें
4. **Publish** button दबाएँ

## ✅ Step 2 — Storage Rules

1. खोलें: <https://console.firebase.google.com/project/maasebaat/storage/rules>
2. पूरा content delete करें
3. `firebase-rules/storage.rules` फ़ाइल का सारा content paste करें
4. **Publish** button दबाएँ

> **Storage पहली बार use कर रहे हैं?** ऊपर वाले link पर "Get Started" दिखेगा →
> "Start in production mode" चुनें → location `asia-south1` (Mumbai) चुनें → Done.

## ✅ Step 3 — Authorized Domains (OTP login के लिए)

खोलें: <https://console.firebase.google.com/project/maasebaat/authentication/settings>
→ **Authorized domains → Add domain** → ये सब add करें:
- `maasebaat.lovable.app`
- आपका `<username>.github.io` (GitHub Pages से)
- अगर custom domain है तो वो भी

---

## 📦 APK / AAB बनाने के बारे में (Manus AI ने Capacitor की कमी बताई)

आपके project me **Capacitor की ज़रूरत नहीं** है क्योंकि हम **PWABuilder** approach use कर रहे हैं —
ये बेहतर है क्योंकि:
- ✅ कोई Android Studio install नहीं चाहिए
- ✅ कोई native code maintain नहीं करना
- ✅ सीधे `.aab` (Google Play के लिए) मिल जाता है

जो files **पहले से ready हैं**:
- ✅ `public/manifest.json` — सब fields सही
- ✅ `public/icon-192.png`, `public/icon-512.png` — maskable icons
- ✅ `public/favicon.png`
- ✅ Meta tags `src/routes/__root.tsx` me set
- ✅ `.github/workflows/deploy.yml` — GitHub Pages auto-deploy

### APK बनाने का सही तरीक़ा:
1. ऊपर वाले Firebase rules deploy कर दें
2. Lovable → **Publish** दबाएँ (या GitHub push → Pages auto-deploy)
3. <https://www.pwabuilder.com> खोलें
4. अपनी live URL paste करें: `https://maasebaat.lovable.app`
5. Score check करें (90+ आना चाहिए)
6. **Package For Stores → Android → Generate**
7. Package ID: `com.askpintuai.maasebaat`
8. Download `.aab` file → Google Play Console पर upload

> अगर Manus AI ने `capacitor.config.ts` माँगा है तो वो ग़लत approach बता रहा है —
> PWABuilder खुद Bubblewrap (TWA) use करके Android package बना देता है, बिना Capacitor के।

---

## अगर फिर भी कोई issue हो

- Browser console खोलें (F12)
- Error का text copy करें
- Lovable chat me paste करें → मैं fix कर दूँगा
