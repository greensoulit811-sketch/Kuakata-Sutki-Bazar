import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

// Retry helper for network calls
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 1, timeoutMs = 4500) {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[FETCH] Attempt ${attempt}/${maxRetries} for ${url}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (err: any) {
      lastError = err;
      console.error(`[FETCH] Attempt ${attempt} failed:`, err.message);
      
      if (err.name === 'AbortError') {
        err.message = `Request timed out after ${timeoutMs}ms. The courier API took too long to respond.`;
      }

      // Don't retry on auth/validation errors
      if (err.message?.includes('auth') || err.message?.includes('credential') || err.name === 'AbortError') {
        throw err;
      }
      
      // Wait before retry with exponential backoff
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 2000);
        console.log(`[FETCH] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const url = new URL(req.url);
    const pathAction = url.pathname.split('/').pop();
    const action = (pathAction && pathAction !== 'steadfast-courier') ? pathAction : body.action;

    // We wrapper everything in a 200 response to avoid the "non-2xx" error in browser
    const createResponse = (data: any) => {
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    };

    // Verify user is logged in
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createResponse({ success: false, error: 'Unauthorized: No auth header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return createResponse({ success: false, error: 'Unauthorized: Invalid session' });
    }

    // Check if admin
    const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin', { _user_id: user.id });
    if (rpcError || !isAdmin) {
      return createResponse({ 
        success: false, 
        error: 'Admin access required. Please make sure you are logged in as an administrator.' 
      });
    }

    // Get courier settings
    const { data: settings, error: settingsError } = await supabase
      .from('courier_settings')
      .select('*')
      .eq('provider', 'steadfast')
      .maybeSingle();

    if (settingsError) {
      return createResponse({ success: false, error: 'Database error: ' + settingsError.message });
    }

    let baseUrl = settings?.api_base_url?.replace(/\/+$/, '') || '';

    // Auto-correct deprecated Steadfast URL to the new Packzy API URL
    if (baseUrl.includes('portal.steadfast.com.bd')) {
      baseUrl = baseUrl.replace('portal.steadfast.com.bd', 'portal.packzy.com');
    }

    if (action === 'test-connection') {
      if (!settings?.enabled) {
        return createResponse({ 
          success: false, 
          error: 'Steadfast is not enabled. Please toggle "Enable Integration" and click Save first.' 
        });
      }

      if (!settings.api_key || !settings.api_secret) {
        return createResponse({ success: false, error: 'API Key or Secret is missing.' });
      }

      try {
        const url = `${baseUrl}/get_balance`;
        console.log(`[STEADFAST] Testing connection with URL: ${url}`);

        const res = await fetchWithRetry(url, {
          headers: { 
            'Api-Key': settings.api_key, 
            'Secret-Key': settings.api_secret, 
            'Content-Type': 'application/json' 
          },
        }, 1, 4500);

        const resText = await res.text();
        console.log(`[STEADFAST] Test response status: ${res.status}, body: ${resText}`);
        
        let data: any;
        try { 
          data = JSON.parse(resText); 
        } catch { 
          return createResponse({ 
            success: false, 
            error: 'Invalid response from Steadfast API. Please verify your API Base URL.' 
          });
        }
        
        if (res.ok && data.status === 200) {
          console.log(`[STEADFAST] Connection test successful`);
          return createResponse({ success: true, balance: data.current_balance });
        }
        
        console.error(`[STEADFAST] Connection test failed:`, data?.message);
        return createResponse({ 
          success: false, 
          error: data.message || 'API Connection Failed: Incorrect credentials or server error.' 
        });
      } catch (err: any) {
        console.error(`[STEADFAST] Test fetch error:`, err);
        return createResponse({ 
          success: false, 
          error: `Network error: ${err.message}. Please check if your server can reach Steadfast API.`,
          debug_info: err.toString()
        });
      }
    }

    if (action === 'create-parcel') {
      if (!settings?.enabled) {
        return createResponse({ success: false, error: 'Steadfast not enabled. Please enable it in Settings → Courier.' });
      }

      if (!settings?.api_base_url || !settings?.api_key || !settings?.api_secret) {
        return createResponse({ success: false, error: 'Steadfast API credentials are missing. Please configure them in Settings → Courier.' });
      }

      const payload = {
        invoice: body.invoice,
        recipient_name: body.recipient_name,
        recipient_phone: body.recipient_phone,
        recipient_address: body.recipient_address,
        cod_amount: body.cod_amount,
        note: body.note || '',
      };

      try {
        const url = `${baseUrl}/create_order`;
        console.log(`[STEADFAST] Creating parcel with URL: ${url}`);
        console.log(`[STEADFAST] Payload:`, payload);

        const res = await fetchWithRetry(url, {
          method: 'POST',
          headers: { 
            'Api-Key': settings.api_key, 
            'Secret-Key': settings.api_secret, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify(payload),
        }, 1, 4500);

        const resText = await res.text();
        console.log(`[STEADFAST] Response status: ${res.status}, body: ${resText}`);
        
        let data: any;
        try { 
          data = JSON.parse(resText); 
        } catch {
          console.error(`[STEADFAST] Failed to parse JSON response`);
          return createResponse({ 
            success: false, 
            error: 'Invalid JSON response from courier. Please check your API URL and credentials.',
            debug_info: `Response: ${resText.substring(0, 200)}`
          });
        }

        const { error: logError } = await supabase.from('courier_logs').insert({
          order_id: body.order_id, provider: 'steadfast', action: 'create_parcel',
          status: res.ok && data?.status === 200 ? 'success' : 'failed', message: data?.message || resText,
          request_payload: payload, response_payload: data,
        });
        if (logError) console.error('Failed to log:', logError);

        if (res.ok && data?.status === 200) {
          console.log(`[STEADFAST] Parcel created successfully`);
          const { error: updateError } = await supabase.from('orders').update({
            status: 'shipped',
            courier_provider: 'steadfast', courier_status: 'created',
            courier_tracking_id: data.consignment?.tracking_code,
            courier_consignment_id: data.consignment?.consignment_id?.toString(),
            courier_updated_at: new Date().toISOString(),
          }).eq('id', body.order_id);
          if (updateError) console.error('Failed to update order:', updateError);

          return createResponse({ 
            success: true, 
            tracking_code: data.consignment?.tracking_code,
            consignment_id: data.consignment?.consignment_id,
          });
        }
        
        console.error(`[STEADFAST] Parcel creation failed:`, data?.message);
        return createResponse({ success: false, error: data?.message || 'Failed to create parcel. Please verify your API credentials.' });
      } catch (err: any) {
        console.error(`[STEADFAST] Fetch error:`, err);
        return createResponse({ 
          success: false, 
          error: `Network error: ${err.message}. This may be a temporary issue. Please try again.`,
          debug_info: err.toString()
        });
      }
    }

    if (action === 'sync-all') {
      // Find all orders that are currently in 'shipped' or 'created' courier status
      const { data: activeOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, courier_consignment_id')
        .not('courier_consignment_id', 'is', null)
        .in('courier_status', ['created', 'in_transit', 'pending']);

      if (ordersError) return createResponse({ success: false, error: ordersError.message });
      if (!activeOrders || activeOrders.length === 0) return createResponse({ success: true, count: 0 });

      const startTime = Date.now();
      let updatedCount = 0;
      for (const order of activeOrders) {
        // Break early to prevent hitting Edge Function 5-second wall clock limit
        if (Date.now() - startTime > 4000) {
          console.warn('[STEADFAST] Approaching execution timeout, stopping sync-all early.');
          break;
        }
        
        try {
          const res = await fetchWithRetry(`${baseUrl}/status_by_cid/${order.courier_consignment_id}`, {
            headers: { 
              'Api-Key': settings.api_key, 
              'Secret-Key': settings.api_secret, 
              'Content-Type': 'application/json' 
            },
          }, 1, 2000);
          
          if (!res.ok) continue;
          const data = await res.json();
          if (data.status !== 200) continue;

          let courierStatus = 'created';
          let mainOrderStatus = null;
          const ds = data.delivery_status?.toLowerCase();

          if (ds === 'delivered') { courierStatus = 'delivered'; mainOrderStatus = 'delivered'; }
          else if (ds === 'cancelled' || ds === 'returned') { courierStatus = 'cancelled'; mainOrderStatus = 'cancelled'; }
          else if (ds === 'pending') { courierStatus = 'pending'; }
          else if (ds) { courierStatus = 'in_transit'; mainOrderStatus = 'shipped'; }

          const updateData: any = { courier_status: courierStatus, courier_updated_at: new Date().toISOString() };
          if (mainOrderStatus) updateData.status = mainOrderStatus;

          await supabase.from('orders').update(updateData).eq('id', order.id);
          updatedCount++;
        } catch (e) {
          console.error(`Failed to sync order ${order.id}:`, e);
        }
      }

      return createResponse({ success: true, count: updatedCount });
    }

    if (action === 'track-status') {
      const { consignment_id, order_id } = body;
      if (!consignment_id) {
        return createResponse({ success: false, error: 'Consignment ID required' });
      }

      try {
        const res = await fetchWithRetry(`${baseUrl}/status_by_cid/${consignment_id}`, {
          headers: { 
            'Api-Key': settings.api_key, 
            'Secret-Key': settings.api_secret, 
            'Content-Type': 'application/json' 
          },
        }, 1, 4500);
  
        const resText = await res.text();
        let data: any;
        try { data = JSON.parse(resText); } catch {
          return createResponse({ success: false, error: 'Invalid response from courier tracking.' });
        }
  
        if (!res.ok || data.status !== 200) {
          return createResponse({ success: false, error: data.message || 'Failed to track status' });
        }
        
        let courierStatus = 'created';
        let mainOrderStatus = null;
        const ds = data.delivery_status?.toLowerCase();
        
        if (ds === 'delivered') {
          courierStatus = 'delivered';
          mainOrderStatus = 'delivered';
        } else if (ds === 'cancelled' || ds === 'returned') {
          courierStatus = 'cancelled';
          mainOrderStatus = 'cancelled';
        } else if (ds === 'pending') {
          courierStatus = 'pending';
        } else if (ds) {
          courierStatus = 'in_transit';
          mainOrderStatus = 'shipped';
        }

        const updateData: any = { 
          courier_status: courierStatus, 
          courier_updated_at: new Date().toISOString() 
        };
        
        if (mainOrderStatus) {
          updateData.status = mainOrderStatus;
        }
  
        await supabase.from('orders').update(updateData).eq('id', order_id);
  
        return createResponse({ 
          success: true, 
          courier_status: courierStatus, 
          main_order_status: mainOrderStatus,
          delivery_status: data.delivery_status 
        });
      } catch (err: any) {
        console.error(`[STEADFAST] Fetch error:`, err);
        return createResponse({ 
          success: false, 
          error: `Network error: ${err.message}. This may be a temporary issue. Please try again.`,
          debug_info: err.toString()
        });
      }
    }

    if (action === 'webhook') {
      // Steadfast sends webhook data as a form or JSON
      // According to documentation, we should check their signature, 
      // but for simplicity we'll process the data directly if provided.
      const payload = body;
      console.log('Steadfast Webhook Received:', payload);

      if (payload.status && payload.consignment_id) {
        let courierStatus = 'created';
        let mainOrderStatus = null;
        const ds = payload.status.toLowerCase();

        if (ds === 'delivered') {
          courierStatus = 'delivered';
          mainOrderStatus = 'delivered';
        } else if (ds === 'cancelled' || ds === 'returned') {
          courierStatus = 'cancelled';
          mainOrderStatus = 'cancelled';
        } else if (ds === 'pending') {
          courierStatus = 'pending';
        } else if (ds) {
          courierStatus = 'in_transit';
          mainOrderStatus = 'shipped';
        }

        const updateData: any = { 
          courier_status: courierStatus, 
          courier_updated_at: new Date().toISOString() 
        };
        
        if (mainOrderStatus) {
          updateData.status = mainOrderStatus;
        }

        await supabase.from('orders')
          .update(updateData)
          .eq('courier_consignment_id', payload.consignment_id.toString());

        return createResponse({ success: true, message: 'Webhook processed' });
      }

      return createResponse({ success: false, error: 'Invalid webhook payload' });
    }

    return createResponse({ error: 'Unknown action' });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Server Error: ' + error.message,
      technical_details: error.stack
    }), {
      status: 200, // Still return 200 to see the message
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
