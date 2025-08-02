const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const os = require('os');

const app = express();
const PORT = 3001; // Different port from Expo (8081)

// Function to get all non-internal IPv4 addresses
function getActiveIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  
  return ips;
}

// Get active IPs
const activeIPs = getActiveIPs();
console.log('🔍 Detected IP addresses:', activeIPs);

// Try to determine the best backend IP (prefer 10.x.x.x ranges for hotspots)
const bestIP = activeIPs.find(ip => ip.startsWith('10.25.')) || activeIPs.find(ip => ip.startsWith('10.5.')) || activeIPs.find(ip => ip.startsWith('10.')) || activeIPs[0] || '10.5.0.2';
const BACKEND_URL = `http://localhost:8000`;

console.log(`🎯 Using backend IP: ${bestIP}`);

// Enable CORS for all requests
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

// Proxy all requests to the FastAPI backend
app.use('/api', createProxyMiddleware({
  target: BACKEND_URL, // Dynamic backend based on detected IP
  changeOrigin: true,
  pathRewrite: {
    '^/api': '', // Remove /api prefix when forwarding
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message);
    res.status(500).json({ 
      error: 'Backend connection failed', 
      message: err.message,
      suggestion: `Make sure FastAPI server is running on ${bestIP}:8001`,
      detected_ips: activeIPs,
      backend_url: BACKEND_URL
    });
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`🔄 Proxying ${req.method} ${req.url} to FastAPI backend`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`✅ Response ${proxyRes.statusCode} for ${req.method} ${req.url}`);
  },
}));

// Health check for the proxy itself
app.get('/proxy-health', (req, res) => {
  res.json({
    status: 'healthy',
    proxy: 'MediaPipe FastAPI Proxy',
    backend_target: BACKEND_URL,
    detected_ips: activeIPs,
    active_ip: bestIP,
    note: 'This proxy forwards requests to the FastAPI MediaPipe backend'
  });
});

// Endpoint to get current network info
app.get('/network-info', (req, res) => {
  res.json({
    detected_ips: activeIPs,
    backend_ip: bestIP,
    backend_url: BACKEND_URL,
    proxy_urls: activeIPs.map(ip => `http://${ip}:${PORT}/api`)
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MediaPipe Proxy Server running on http://0.0.0.0:${PORT}`);
  console.log(`🔗 Proxying to FastAPI backend: ${BACKEND_URL}`);
  console.log(`💡 Test proxy health: http://${bestIP}:${PORT}/proxy-health`);
  console.log(`📱 React Native connection URLs:`);
  activeIPs.forEach(ip => {
    console.log(`   • http://${ip}:${PORT}/api`);
  });
  console.log(`🌐 Network Info: http://${bestIP}:${PORT}/network-info`);
}); 