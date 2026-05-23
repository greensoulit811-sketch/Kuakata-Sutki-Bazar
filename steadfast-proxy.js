/**
 * Steadfast Courier API Proxy Backend
 * 
 * This is a Node.js/Express backend to proxy Steadfast API calls
 * 
 * Usage:
 * 1. Make sure .env has STEADFAST_API_KEY and STEADFAST_API_SECRET
 * 2. Run: node steadfast-proxy.js
 * 3. Proxy will run on http://localhost:3001
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const STEADFAST_API_BASE = process.env.STEADFAST_API_BASE || 'https://portal.steadfast.com.bd/api/v1';
const STEADFAST_API_KEY = process.env.STEADFAST_API_KEY;
const STEADFAST_API_SECRET = process.env.STEADFAST_API_SECRET;

console.log('===================================');
console.log('🚀 Steadfast Proxy Server');
console.log('===================================');
console.log('');
console.log(`API Base: ${STEADFAST_API_BASE}`);
console.log(`API Key: ${STEADFAST_API_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`API Secret: ${STEADFAST_API_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log('');

if (!STEADFAST_API_KEY || !STEADFAST_API_SECRET) {
  console.error('❌ ERROR: STEADFAST_API_KEY or STEADFAST_API_SECRET is not set in .env');
  console.error('Please update your .env file with your Steadfast credentials');
  process.exit(1);
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Steadfast Proxy is running' });
});

// Diagnostic endpoint - test network connectivity
app.get('/api/diagnostics', async (req, res) => {
  console.log('[DIAGNOSTICS] Testing network connectivity...');
  
  const results = {
    proxy_status: 'ok',
    api_configured: !!(STEADFAST_API_KEY && STEADFAST_API_SECRET),
    api_base_url: STEADFAST_API_BASE,
    api_key_present: !!STEADFAST_API_KEY,
    api_secret_present: !!STEADFAST_API_SECRET,
    tests: {},
  };

  // Test DNS resolution
  try {
    console.log('[DIAGNOSTICS] Testing DNS resolution...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(STEADFAST_API_BASE, { 
      method: 'HEAD',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    results.tests.dns_resolution = { status: 'ok', code: response.status };
  } catch (err) {
    results.tests.dns_resolution = { status: 'failed', error: err.message };
  }

  // Test API connectivity
  try {
    console.log('[DIAGNOSTICS] Testing API connectivity...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${STEADFAST_API_BASE}/get_balance`, {
      headers: {
        'Api-Key': STEADFAST_API_KEY,
        'Secret-Key': STEADFAST_API_SECRET,
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const data = await response.json();
    results.tests.api_connectivity = { 
      status: response.ok ? 'ok' : 'error', 
      code: response.status,
      message: data?.message || 'No message'
    };
  } catch (err) {
    results.tests.api_connectivity = { status: 'failed', error: err.message };
  }

  res.json(results);
});

// Create parcel endpoint
app.post('/api/steadfast/create-parcel', async (req, res) => {
  try {
    const { invoice, recipient_name, recipient_phone, recipient_address, cod_amount, note } = req.body;

    console.log('[PROXY] Creating parcel...');
    console.log('  Invoice:', invoice);
    console.log('  Recipient:', recipient_name);
    
    if (!invoice || !recipient_name || !recipient_phone || !recipient_address) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: invoice, recipient_name, recipient_phone, recipient_address',
      });
    }

    const payload = {
      invoice,
      recipient_name,
      recipient_phone,
      recipient_address,
      cod_amount: cod_amount || 0,
      note: note || '',
    };

    console.log('[PROXY] Sending request to Steadfast...');
    console.log('[PROXY] URL: ' + STEADFAST_API_BASE + '/create_order');
    
    // Add timeout to the fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    try {
      const response = await fetch(`${STEADFAST_API_BASE}/create_order`, {
        method: 'POST',
        headers: {
          'Api-Key': STEADFAST_API_KEY,
          'Secret-Key': STEADFAST_API_SECRET,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        console.error('[PROXY] ❌ Failed to parse response:', parseErr.message);
        return res.status(500).json({
          success: false,
          error: 'Invalid response from Steadfast API',
        });
      }

      console.log('[PROXY] Response status:', response.status);
      console.log('[PROXY] Response data:', JSON.stringify(data).substring(0, 200));

      if (response.ok && data.status === 200) {
        console.log('[PROXY] ✅ Parcel created successfully');
        return res.json({
          success: true,
          tracking_code: data.consignment?.tracking_code,
          consignment_id: data.consignment?.consignment_id,
        });
      }

      console.error('[PROXY] ❌ Parcel creation failed:', data?.message);
      res.status(400).json({
        success: false,
        error: data?.message || 'Failed to create parcel',
        response_status: response.status,
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      console.error('[PROXY] ❌ Fetch error:', fetchErr.message);
      
      // Network error - provide helpful message
      if (fetchErr.name === 'AbortError') {
        res.status(500).json({
          success: false,
          error: 'Request timeout - Steadfast API took too long to respond',
        });
      } else {
        res.status(500).json({
          success: false,
          error: `Network error: ${fetchErr.message}. Check if Steadfast API is accessible from your network.`,
        });
      }
    }
  } catch (err) {
    console.error('[PROXY] ❌ Error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error',
    });
  }
});

// Test connection
app.post('/api/steadfast/test', async (req, res) => {
  try {
    console.log('[PROXY] Testing connection...');
    
    const response = await fetch(`${STEADFAST_API_BASE}/get_balance`, {
      headers: {
        'Api-Key': STEADFAST_API_KEY,
        'Secret-Key': STEADFAST_API_SECRET,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('[PROXY] Test response:', data);

    if (response.ok && data.status === 200) {
      console.log('[PROXY] ✅ Connection test successful');
      return res.json({
        success: true,
        balance: data.current_balance,
      });
    }

    console.error('[PROXY] ❌ Connection test failed:', data?.message);
    res.status(400).json({
      success: false,
      error: data.message || 'Connection test failed',
    });
  } catch (err) {
    console.error('[PROXY] ❌ Test error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message || 'Connection test failed',
    });
  }
});

// Track status
app.post('/api/steadfast/track', async (req, res) => {
  try {
    const { consignment_id } = req.body;
    console.log('[PROXY] Tracking:', consignment_id);
    
    if (!consignment_id) {
      return res.status(400).json({
        success: false,
        error: 'consignment_id is required',
      });
    }

    const response = await fetch(`${STEADFAST_API_BASE}/status_by_cid/${consignment_id}`, {
      headers: {
        'Api-Key': STEADFAST_API_KEY,
        'Secret-Key': STEADFAST_API_SECRET,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok && data.status === 200) {
      console.log('[PROXY] ✅ Track status successful');
      return res.json({
        success: true,
        delivery_status: data.delivery_status,
        data: data,
      });
    }

    console.error('[PROXY] ❌ Track failed:', data?.message);
    res.status(400).json({
      success: false,
      error: data.message || 'Failed to track',
    });
  } catch (err) {
    console.error('[PROXY] ❌ Track error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to track',
    });
  }
});

const PORT = process.env.STEADFAST_PROXY_PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Proxy running on http://localhost:${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  POST http://localhost:${PORT}/api/steadfast/test`);
  console.log(`  POST http://localhost:${PORT}/api/steadfast/create-parcel`);
  console.log(`  POST http://localhost:${PORT}/api/steadfast/track`);
  console.log('');
  console.log('Keep this server running while using your app!');
  console.log('===================================');
});
