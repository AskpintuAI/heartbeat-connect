# Cloudflare Pages Setup Guide

## समस्या (Problem):
GitHub Pages केवल **static files** serve करता है। लेकिन Tanstack Start एक **SSR (Server-Side Rendering)** framework है जिसे server-side logic की जरूरत है।

## समाधान (Solution):
Cloudflare Pages का उपयोग करो जो SSR को support करता है।

---

## Step 1: Cloudflare Account बनाओ
1. https://dash.cloudflare.com/sign-up पर जाओ
2. अपना email और password से sign up करो
3. Email verify करो

---

## Step 2: Cloudflare Pages में Deploy करो
1. Cloudflare Dashboard → **Pages** → **Connect to Git**
2. GitHub authorize करो
3. Repository चुनो: `AskpintuAI/heartbeat-connect`
4. **Build settings**:
   - **Framework**: `None` (या auto-detect)
   - **Build command**: `bun run build`
   - **Build output directory**: `dist`
5. **Environment Variables**: (अगर जरूरत हो)
   - `VITE_BASE=/`
6. **Deploy करो**

---

## Step 3: Custom Domain Setup (Optional)
1. Cloudflare Dashboard → Pages → अपना project
2. **Custom domain** → अपना domain add करो
3. DNS settings configure करो

---

## GitHub Actions Workflow (Automatic)
`.github/workflows/deploy-cloudflare.yml` already configured है।

अगर काम न करे तो य�� enable करो:

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
      
      - name: Build
        run: bun run build
        env:
          VITE_BASE: /
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

---

## Secrets Setup (GitHub)
1. GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**:
   - `CLOUDFLARE_API_TOKEN`: Cloudflare API token
   - `CLOUDFLARE_ACCOUNT_ID`: Account ID

---

## Cloudflare API Token प्राप्त करो:
1. Cloudflare Dashboard → **My Profile** → **API Tokens**
2. **Create Token** → `Edit Cloudflare Workers` select करो
3. Token copy करो
4. GitHub में paste करो (Settings → Secrets)

---

## Final URLs:
- **Production**: `https://yourproject.pages.dev`
- **Custom Domain**: `https://yourdomain.com` (अगर configure किया)

---

Done! ✅ SSR support के साथ live जाएगा।
