#!/bin/bash
# Steadfast Proxy Server Startup Script
# This runs the proxy backend that handles Steadfast API calls

echo "===== Steadfast Proxy Server ====="
echo ""
echo "⚠️  BEFORE RUNNING:"
echo "1. Open .env file"
echo "2. Update these values:"
echo "   - STEADFAST_API_KEY=your_actual_key"
echo "   - STEADFAST_API_SECRET=your_actual_secret"
echo ""
echo "Then run: node steadfast-proxy.js"
echo ""
echo "The proxy will start on http://localhost:3001"
echo "Check that VITE_STEADFAST_PROXY_URL=http://localhost:3001 is set in .env"
echo ""
echo "====================================="
