# Steadfast Courier Integration - Fix Guide

## Problem
Supabase Edge Functions cannot reach Steadfast API due to network restrictions:
```
DNS error: failed to lookup address information: Name or service not known
```

## Solutions (in order of recommendation)

### ✅ Solution 1: Use Custom Backend Proxy (RECOMMENDED)

This is the most reliable solution. Create a Node.js backend that proxies Steadfast API calls.

#### Setup:

1. **Install dependencies:**
```bash
npm install express cors dotenv
```

2. **Create `.env` file in root:**
```env
STEADFAST_API_BASE=https://portal.steadfast.com.bd/api/v1
STEADFAST_API_KEY=your_api_key
STEADFAST_API_SECRET=your_api_secret
PORT=3001
```

3. **Run the proxy server:**
```bash
node steadfast-proxy.js
```

4. **Create a client hook to use the proxy:**

```typescript
// src/hooks/useCourierSettingsProxy.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PROXY_URL = import.meta.env.VITE_STEADFAST_PROXY_URL || 'http://localhost:3001';

export const useCreateCourierParcelProxy = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: {
      order_id: string;
      recipient_name: string;
      recipient_phone: string;
      recipient_address: string;
      recipient_city: string;
      cod_amount: number;
      invoice: string;
      note?: string;
    }) => {
      try {
        const response = await fetch(`${PROXY_URL}/api/steadfast/create-parcel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        // Update order in Supabase
        await supabase.from('orders').update({
          status: 'shipped',
          courier_provider: 'steadfast',
          courier_status: 'created',
          courier_tracking_id: data.tracking_code,
          courier_consignment_id: data.consignment_id?.toString(),
          courier_updated_at: new Date().toISOString(),
        }).eq('id', payload.order_id);

        return data;
      } catch (err: any) {
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Parcel created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create parcel: ' + error.message);
    },
  });
};
```

5. **Update `.env.example`:**
```env
VITE_STEADFAST_PROXY_URL=http://localhost:3001
```

6. **In production, deploy proxy to:**
   - Vercel (Node.js)
   - Railway
   - Render
   - Your own VPS

---

### ⚠️ Solution 2: Direct Client API Call

**Security Risk!** Only for testing. Exposes API keys to browser.

Use the hook from `useCourierSettingsClient.ts`:
```typescript
import { useCreateCourierParcelDirect } from '@/hooks/useCourierSettingsClient';
```

---

### 3️⃣ Solution 3: Wait for Supabase Fix

If you have Supabase Pro/Teams plan, contact support about Edge Function network restrictions.

---

## Implementation Steps

### For Development:

1. Run proxy: `node steadfast-proxy.js`
2. Update `OrderCourierSection.tsx` to use proxy hook instead of Edge Function hook
3. Test parcel creation

### For Production:

1. Deploy proxy to a server (Vercel recommended)
2. Set `VITE_STEADFAST_PROXY_URL` environment variable
3. Deploy your app

---

## Testing

After setup, test connection:

```bash
curl -X POST http://localhost:3001/api/steadfast/test \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Files Created

- `steadfast-proxy.js` - Backend proxy server
- `src/hooks/useCourierSettingsClient.ts` - Direct client API hook
- This guide

---

## Recommendation

**Use Solution 1 (Custom Proxy)** - It's:
- ✅ Most reliable
- ✅ Secure (API keys on server)
- ✅ Production-ready
- ✅ Easy to scale
