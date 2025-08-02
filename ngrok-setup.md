# ngrok Setup for MediaPipe Backend Testing

## Quick Setup Steps:

### 1. Download ngrok
- Go to: https://ngrok.com/download
- Download the Windows version
- Extract the zip file to a folder (e.g., `C:\ngrok\`)

### 2. Create Free Account
- Sign up at: https://ngrok.com/signup
- Get your auth token from the dashboard

### 3. Setup ngrok
```bash
# Add to PATH or run from ngrok folder
ngrok config add-authtoken YOUR_TOKEN_HERE

# Test installation
ngrok version
```

### 4. Expose Our Servers

#### Option A: Expose Proxy Server (Recommended)
```bash
ngrok http 3001
```
This will give you a public URL like: `https://abc123.ngrok.io`

#### Option B: Expose FastAPI Backend Directly
```bash
ngrok http 8001
```

### 5. Update React Native App
Once ngrok is running, update the backend URL in your app:

```javascript
// In RealMediaPipeCamera.js
const BACKEND_URLS = [
  'https://abc123.ngrok.io/api',  // Replace with your ngrok URL
  'http://10.25.159.31:3001/api', // Keep local as fallback
];
```

### 6. Test the Connection
- ngrok will show you the public URL
- Test in browser: `https://abc123.ngrok.io/proxy-health`
- If it works, your React Native app should connect!

## Why This Works:
- ✅ Bypasses all network/firewall issues
- ✅ Works from any device/network
- ✅ Provides HTTPS automatically
- ✅ Free tier available
- ✅ No VPN interference

## Next Steps:
1. Download ngrok
2. Sign up and get auth token
3. Run: `ngrok http 3001`
4. Update app with the ngrok URL
5. Test your MediaPipe processing! 