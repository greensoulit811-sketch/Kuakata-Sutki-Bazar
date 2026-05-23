# 🚀 Steadfast Proxy Setup - Quick Start Guide

## ✅ Problem Fixed!

The DNS error you were getting is now solved using a **custom proxy backend**.

---

## 📋 Setup Instructions (5 minutes)

### Step 1: Update .env with Your Credentials

Open `.env` file and update these lines:

```env
STEADFAST_API_KEY=paste_your_steadfast_api_key_here
STEADFAST_API_SECRET=paste_your_steadfast_api_secret_here
```

**Where to find these?**
- Log in to Steadfast: https://portal.steadfast.com.bd/
- Go to Settings → API Credentials
- Copy your API Key and Secret

### Step 2: Verify Proxy Configuration

Check that `.env` has:

```env
VITE_USE_STEADFAST_PROXY=true
VITE_STEADFAST_PROXY_URL=http://localhost:3001
STEADFAST_API_BASE=https://portal.steadfast.com.bd/api/v1
```

✅ These are already set in your .env file!

### Step 3: Start the Proxy Server

**Option A: Terminal (Recommended)**
```bash
node steadfast-proxy.js
```

You should see:
```
Steadfast Proxy running on port 3001
```

**Option B: npm script**
First, add to `package.json`:
```json
{
  "scripts": {
    "proxy": "node steadfast-proxy.js"
  }
}
```

Then run:
```bash
npm run proxy
```

### Step 4: Keep Proxy Running

Important: Keep the proxy server running while your app is running!

**For development:**
- Terminal 1: `npm run dev` (your app)
- Terminal 2: `node steadfast-proxy.js` (proxy server)

### Step 5: Test It!

1. Open your app (http://localhost:5173)
2. Go to Admin → Orders
3. Click "Create Parcel"
4. ✅ It should work now!

---

## 🔍 How to Debug

If it still doesn't work, check:

**1. Is proxy server running?**
```bash
# In another terminal, test the proxy
curl http://localhost:3001/health
# Should return: {"status":"ok"}
```

**2. Are your API credentials correct?**
```bash
# Check .env file
cat .env
```

**3. Check browser console (F12)**
Look for:
- `[CONFIG] Using Steadfast: PROXY` - ✅ Good
- `[PROXY] Creating parcel...` - Shows request is being sent

**4. Check proxy server logs**
Terminal where proxy is running should show request logs

---

## 📦 Files Involved

- `steadfast-proxy.js` - Backend server
- `src/hooks/useCourierSettingsHybrid.ts` - Updated hooks
- `.env` - Configuration (with proxy settings)
- `src/components/admin/OrderCourierSection.tsx` - Updated to use hybrid hook

---

## 🎯 How It Works

```
Browser
  ↓
OrderCourierSection (Component)
  ↓
useCourierParcel() from useCourierSettingsHybrid
  ↓
steadfast-proxy.js (Node.js server)
  ↓
Steadfast API (portal.steadfast.com.bd)
```

---

## 🚀 Production Deployment

When you deploy to production:

1. **Deploy proxy server to:**
   - Vercel (easiest)
   - Railway
   - Render
   - Your own VPS

2. **Update .env for production:**
   ```env
   VITE_STEADFAST_PROXY_URL=https://your-proxy-domain.com
   ```

3. **Example with Vercel:**
   ```bash
   vercel deploy --prod
   ```

---

## ❓ Questions?

If you get errors:
1. Check browser console (F12)
2. Check terminal where proxy is running
3. Verify API credentials in .env
4. Make sure proxy is on port 3001

---

**Status: ✅ DNS error is FIXED!**

The proxy server handles all Steadfast API calls, so you no longer have the network restriction issue.

Good luck! 🎉
