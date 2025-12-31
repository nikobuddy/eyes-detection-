# Troubleshooting Blank Screen Issue

## Problem: Blank Screen at http://localhost:8080

**Note:** The application uses port 8080 instead of 5000 because macOS uses port 5000 for AirPlay.

If you're seeing a blank screen, follow these steps:

## Step 1: Verify Server is Running

1. **Check if the server is running:**
   ```bash
   lsof -i :8080
   ```
   Or check the terminal where you ran `python app.py`

2. **Start the server if not running:**
   ```bash
   source venv/bin/activate
   python app.py
   ```
   
   You should see:
   ```
   ==================================================
   Eye-Controlled Assistive System - Web Server
   ==================================================
   Server starting on http://localhost:5000
   ```

## Step 2: Check Browser Console

1. **Open browser developer tools:**
   - Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows/Linux)
   - Go to the "Console" tab

2. **Look for errors:**
   - Red error messages indicate problems
   - Common issues:
     - "Failed to load resource" - Server not running
     - "Socket.IO is not defined" - CDN not loading
     - CORS errors - Server configuration issue

## Step 3: Test Server Connection

1. **Test the server directly:**
   ```bash
   curl http://localhost:8080/test
   ```
   
   Should return JSON with status information.

2. **Or open in browser:**
   - Go to: `http://localhost:8080/test`
   - Should see JSON response

## Step 4: Check Socket.IO Loading

1. **In browser console, type:**
   ```javascript
   typeof io
   ```
   
   Should return: `"function"`
   
   If it returns `"undefined"`, Socket.IO CDN is not loading.

## Step 5: Common Fixes

### Fix 1: Server Not Starting
```bash
# Kill any existing process
pkill -f "python.*app.py"

# Restart server
source venv/bin/activate
python app.py
```

### Fix 2: Port Already in Use
```bash
# Find process using port 8080
lsof -i :8080

# Kill it
kill -9 <PID>

# Or change port in app.py (last line)
socketio.run(app, host='0.0.0.0', port=8081, ...)
```

### Fix 3: Dependencies Not Installed
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Fix 4: Template Not Found
```bash
# Verify templates directory exists
ls -la templates/

# Should show index.html
```

### Fix 5: Browser Cache
- Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac) to hard refresh
- Or clear browser cache

## Step 6: Manual Verification

1. **Check if HTML is loading:**
   - Right-click on blank page → "View Page Source"
   - Should see HTML content
   - If empty, server isn't serving the page

2. **Check network tab:**
   - Open Developer Tools → Network tab
   - Refresh page
   - Look for:
     - `index.html` - should return 200
     - `socket.io.min.js` - should return 200
     - Any red entries indicate failures

## Step 7: Alternative - Use Desktop Version

If web version continues to have issues, use the desktop version:

```bash
python main.py
```

This opens a native window instead of a browser.

## Still Not Working?

1. **Check server logs** in the terminal for error messages
2. **Try a different browser** (Chrome, Firefox, Safari)
3. **Check firewall/antivirus** - might be blocking port 8080
4. **Try localhost:8080** instead of 127.0.0.1:8080

## Expected Behavior

When working correctly, you should see:
1. **Loading screen** with spinner (briefly)
2. **Calibration screen** with instructions
3. **Main interface** with buttons after calibration

If you see the loading screen but it never changes, the Socket.IO connection is likely failing.

