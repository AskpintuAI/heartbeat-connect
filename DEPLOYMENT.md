# माँ से बात — Deployment & PWA Builder Guide

## 1. GitHub पर code push करें
1. Lovable editor → **Connectors → GitHub → Connect project**
2. Repository बनाएं — code automatically push हो जाएगा।

## 2. GitHub Pages enable करें
1. GitHub repo → **Settings → Pages**
2. **Source:** "GitHub Actions" चुनें
3. `main` branch पर push होते ही `.github/workflows/deploy.yml` workflow चलेगा
4. कुछ minutes बाद आपकी site live होगी:
   `https://<username>.github.io/<repo>/`

## 3. Firebase Authorized Domains में add करें
Firebase Console → Authentication → Settings → **Authorized domains** →
अपना `<username>.github.io` add करें (वरना OTP login fail होगा)।

## 4. Code ZIP download
GitHub repo → **Code → Download ZIP** — पूरा source code मिल जाएगा।

## 5. PWABuilder से Android APK बनाएं
1. https://www.pwabuilder.com खोलें
2. अपनी live URL paste करें (जैसे `https://<username>.github.io/<repo>/`)
3. Score check करें — manifest.json + icons पहले से ready हैं
4. **Package For Stores → Android** चुनें
5. Package ID डालें (जैसे `com.askpintuai.maasebaat`)
6. APK / AAB file download करें
7. Google Play Console पर upload करें

## Files included for PWA
- `public/manifest.json` — app manifest
- `public/icon-192.png`, `public/icon-512.png` — app icons
- Meta tags `__root.tsx` में set हैं
