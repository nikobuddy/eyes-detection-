# Full Screen Camera with Text Overlays

A web application that displays your camera feed in full screen with customizable text overlays at four corners.

## Features

- Full-screen camera view
- Text overlays at four corners:
  - Top Left
  - Top Right
  - Bottom Left
  - Bottom Right
- Python Flask backend
- Responsive design

## Installation

1. Create a virtual environment (recommended):
```bash
python3 -m venv venv
```

2. Activate the virtual environment:
```bash
source venv/bin/activate
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
```

## Running the Application

**Option 1: Using the startup script (easiest)**
```bash
chmod +x start.sh
./start.sh
```

**Option 2: Manual start**
1. Activate the virtual environment:
```bash
source venv/bin/activate
```

2. Start the Flask server:
```bash
python3 app.py
```

**Note:** On macOS, use `python3` instead of `python`.

2. Open your browser and navigate to:
```
http://localhost:5001
```

**Note:** Port 5000 is typically used by macOS AirPlay service, so the app runs on port 5001 to avoid conflicts.

3. Click "Start Camera" to begin the camera feed
4. The camera will automatically enter fullscreen mode
5. Use the controls at the bottom to manage the camera

## Customizing Text Overlays

Edit the `/api/texts` endpoint in `app.py` to change the text content for each overlay position.

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari (may require additional permissions)

## Permissions

The application requires camera permissions. Make sure to grant camera access when prompted by your browser.
# eyes-detection-
