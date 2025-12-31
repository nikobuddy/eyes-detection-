let stream = null;
const video = document.getElementById('video');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const cameraContainer = document.querySelector('.camera-container');
const gazeDot = document.getElementById('gazeDot');
const outputCanvas = document.getElementById('output_canvas');
const overlayCanvas = document.getElementById('overlay_canvas');
const leftEyeMarker = document.getElementById('leftEyeMarker');
const rightEyeMarker = document.getElementById('rightEyeMarker');

// Eye tracking variables
let faceMesh = null;
let isEyeTrackingActive = false;
let currentGazePoint = { x: 0, y: 0 };
let overlayCtx = null;
let calibrationData = {
    centerEyeX: 0.5,
    centerEyeY: 0.5,
    eyeWidth: 0.1,
    eyeHeight: 0.1
};
let calibrationFrames = 0;

// Load texts from backend
async function loadTexts() {
    try {
        const response = await fetch('/api/texts');
        const data = await response.json();
        
        document.getElementById('topLeftText').textContent = data.topLeft;
        document.getElementById('topRightText').textContent = data.topRight;
        document.getElementById('bottomLeftText').textContent = data.bottomLeft;
        document.getElementById('bottomRightText').textContent = data.bottomRight;
    } catch (error) {
        console.error('Error loading texts:', error);
    }
}

// Start camera
async function startCamera() {
    try {
        // Show loading indicator
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'flex';
        }
        
        // Check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Your browser does not support camera access. Please use Chrome, Firefox, or Safari.');
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            return;
        }

        // Stop any existing stream first
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        // Request camera access - simplified constraints
        stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });
        
        console.log('Stream obtained:', stream);
        console.log('Video tracks:', stream.getVideoTracks());
        
        // Verify we have video tracks
        const videoTracks = stream.getVideoTracks();
        if (videoTracks.length === 0) {
            throw new Error('No video tracks found in stream');
        }
        
        // Ensure video element is visible
        video.style.display = 'block';
        video.style.visibility = 'visible';
        video.style.opacity = '1';
        video.style.zIndex = '1';
        
        // Set the stream to video element
        video.srcObject = stream;
        
        // Show status
        const statusDiv = document.getElementById('videoStatus');
        const statusText = document.getElementById('statusText');
        if (statusDiv && statusText) {
            statusDiv.style.display = 'block';
            statusText.textContent = 'Stream attached, waiting for video...';
        }
        
        // Wait for video metadata to load
        await new Promise((resolve) => {
            if (video.readyState >= 2) {
                console.log('Video already ready');
                resolve();
            } else {
                const timeout = setTimeout(() => {
                    console.log('Timeout waiting for metadata');
                    resolve();
                }, 3000);
                
                video.onloadedmetadata = () => {
                    clearTimeout(timeout);
                    console.log('Video metadata loaded');
                    if (statusText) statusText.textContent = 'Metadata loaded, playing...';
                    resolve();
                };
            }
        });
        
        // Play the video
        try {
            if (statusText) statusText.textContent = 'Playing video...';
            await video.play();
            console.log('Video playing successfully');
            console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
            console.log('Video paused?', video.paused);
            console.log('Video currentTime:', video.currentTime);
            
            // Verify video is actually showing
            setTimeout(() => {
                if (video.videoWidth > 0 && video.videoHeight > 0) {
                    console.log('✓ Video is displaying correctly');
                    if (statusText) statusText.textContent = 'Camera active!';
                    setTimeout(() => {
                        if (statusDiv) statusDiv.style.display = 'none';
                    }, 1000);
                } else {
                    console.warn('⚠ Video dimensions are 0 - video may not be displaying');
                    if (statusText) statusText.textContent = 'Warning: Video dimensions are 0';
                }
            }, 500);
            
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            startBtn.disabled = true;
            stopBtn.disabled = false;
            
            // Initialize eye tracking after video starts
            setTimeout(() => {
                initializeEyeTracking();
            }, 1000);
            
            // Auto-enter fullscreen when camera starts
            setTimeout(() => {
                enterFullscreen();
            }, 500);
        } catch (playError) {
            console.error('Error playing video:', playError);
            if (statusText) statusText.textContent = 'Error: ' + playError.message;
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            alert('Error playing video: ' + playError.message);
        }
        
    } catch (error) {
        console.error('Error accessing camera:', error);
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        
        let errorMessage = 'Error accessing camera. ';
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage += 'Please grant camera permissions in your browser settings.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorMessage += 'No camera found. Please connect a camera and try again.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            errorMessage += 'Camera is being used by another application. Please close other apps using the camera.';
        } else {
            errorMessage += error.message || 'Please check your camera settings.';
        }
        
        alert(errorMessage);
    }
}

// Stop camera
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        video.srcObject = null;
        startBtn.disabled = false;
        stopBtn.disabled = true;
    }
    // Stop eye tracking
    stopEyeTracking();
}

// Initialize Eye Tracking
async function initializeEyeTracking() {
    try {
        console.log('Initializing eye tracking...');
        
        // Initialize overlay canvas
        if (overlayCanvas) {
            overlayCanvas.width = window.innerWidth;
            overlayCanvas.height = window.innerHeight;
            overlayCtx = overlayCanvas.getContext('2d');
            
            // Update canvas size on window resize
            window.addEventListener('resize', () => {
                overlayCanvas.width = window.innerWidth;
                overlayCanvas.height = window.innerHeight;
            });
        }
        
        // Use TensorFlow.js face landmarks detection
        await initializeEyeTrackingWithTensorFlow();
        
    } catch (error) {
        console.error('Error initializing eye tracking:', error);
        alert('Eye tracking initialization failed. Please check console for details.');
    }
}

// Eye tracking using face-api.js
let faceApiLoaded = false;
async function initializeEyeTrackingWithTensorFlow() {
    try {
        console.log('Initializing eye tracking with face-api.js...');
        
        // Wait for face-api.js to load
        let retries = 0;
        while (typeof faceapi === 'undefined' && retries < 20) {
            console.log(`Waiting for face-api.js library... (attempt ${retries + 1})`);
            await new Promise(resolve => setTimeout(resolve, 300));
            retries++;
        }
        
        if (typeof faceapi === 'undefined') {
            console.error('face-api.js library failed to load after 6 seconds');
            throw new Error('face-api.js library not loaded. Please check your internet connection and refresh the page.');
        }
        
        console.log('face-api.js library loaded successfully');
        
        // Load face-api models
        console.log('Loading face-api models...');
        // Use GitHub raw content URL - this is the most reliable source
        const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
        
        console.log(`Loading models from: ${MODEL_URL}`);
        console.log('Note: This may take a moment on first load as models are downloaded...');
        
        try {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
            ]);
            console.log('✓ Models loaded successfully');
        } catch (modelError) {
            console.error('Failed to load models from GitHub:', modelError);
            console.log('If this persists, you may need to download models locally.');
            throw new Error('Failed to load face-api.js models. Please ensure you have internet access to download the models from GitHub. Error: ' + modelError.message);
        }
        
        console.log('Face-api models loaded successfully');
        faceApiLoaded = true;
        isEyeTrackingActive = true;
        
        // Start processing
        processVideoFrameAlternative();
        console.log('Eye tracking initialized and running');
        
    } catch (error) {
        console.error('Error initializing eye tracking:', error);
        throw error;
    }
}

// Process video frames for eye tracking (MediaPipe) - not used, kept for compatibility
function processVideoFrame() {
    // This function is not used, using TensorFlow.js instead
}

// Process video frames for eye tracking (face-api.js)
async function processVideoFrameAlternative() {
    if (!isEyeTrackingActive || !video || video.readyState !== 4 || !faceApiLoaded) {
        if (isEyeTrackingActive) {
            requestAnimationFrame(processVideoFrameAlternative);
        }
        return;
    }
    
    if (video.videoWidth > 0 && video.videoHeight > 0) {
        try {
            const detections = await faceapi
                .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks();
            
            if (detections && detections.landmarks) {
                onFaceApiResults(detections);
            } else {
                // No face detected
                if (gazeDot) gazeDot.style.display = 'none';
                if (leftEyeMarker) leftEyeMarker.style.display = 'none';
                if (rightEyeMarker) rightEyeMarker.style.display = 'none';
            }
        } catch (error) {
            console.error('Error processing frame:', error);
        }
    }
    
    // Continue processing
    requestAnimationFrame(processVideoFrameAlternative);
}

// Handle face-api.js results
function onFaceApiResults(detection) {
    if (!detection || !detection.landmarks) {
        if (gazeDot) gazeDot.style.display = 'none';
        if (leftEyeMarker) leftEyeMarker.style.display = 'none';
        if (rightEyeMarker) rightEyeMarker.style.display = 'none';
        return;
    }
    
    const landmarks = detection.landmarks;
    
    // face-api.js landmark indices
    // Left eye: 36, 37, 38, 39, 40, 41
    // Right eye: 42, 43, 44, 45, 46, 47
    // Left eye center is average of left eye points
    // Right eye center is average of right eye points
    
    const leftEyePoints = landmarks.getLeftEye();
    const rightEyePoints = landmarks.getRightEye();
    
    if (!leftEyePoints || !rightEyePoints || leftEyePoints.length === 0 || rightEyePoints.length === 0) {
        if (gazeDot) gazeDot.style.display = 'none';
        if (leftEyeMarker) leftEyeMarker.style.display = 'none';
        if (rightEyeMarker) rightEyeMarker.style.display = 'none';
        return;
    }
    
    // Calculate eye centers
    const leftEyeCenter = {
        x: leftEyePoints.reduce((sum, p) => sum + p.x, 0) / leftEyePoints.length,
        y: leftEyePoints.reduce((sum, p) => sum + p.y, 0) / leftEyePoints.length
    };
    
    const rightEyeCenter = {
        x: rightEyePoints.reduce((sum, p) => sum + p.x, 0) / rightEyePoints.length,
        y: rightEyePoints.reduce((sum, p) => sum + p.y, 0) / rightEyePoints.length
    };
    
    // Convert pixel coordinates to normalized (0-1) based on video dimensions
    const videoWidth = video.videoWidth || video.clientWidth;
    const videoHeight = video.videoHeight || video.clientHeight;
    
    // Normalize eye positions
    const leftEyeNorm = {
        x: leftEyeCenter.x / videoWidth,
        y: leftEyeCenter.y / videoHeight
    };
    
    const rightEyeNorm = {
        x: rightEyeCenter.x / videoWidth,
        y: rightEyeCenter.y / videoHeight
    };
    
    // Update eye markers position
    updateEyeMarkers(leftEyeNorm, rightEyeNorm);
    
    // Calculate eye bounding boxes for more accurate gaze estimation
    const leftEyeBounds = {
        left: Math.min(...leftEyePoints.map(p => p.x)),
        right: Math.max(...leftEyePoints.map(p => p.x)),
        top: Math.min(...leftEyePoints.map(p => p.y)),
        bottom: Math.max(...leftEyePoints.map(p => p.y))
    };
    
    const rightEyeBounds = {
        left: Math.min(...rightEyePoints.map(p => p.x)),
        right: Math.max(...rightEyePoints.map(p => p.x)),
        top: Math.min(...rightEyePoints.map(p => p.y)),
        bottom: Math.max(...rightEyePoints.map(p => p.y))
    };
    
    // Calculate eye width and height
    const leftEyeWidth = leftEyeBounds.right - leftEyeBounds.left;
    const leftEyeHeight = leftEyeBounds.bottom - leftEyeBounds.top;
    const rightEyeWidth = rightEyeBounds.right - rightEyeBounds.left;
    const rightEyeHeight = rightEyeBounds.bottom - rightEyeBounds.top;
    
    // Calculate iris/pupil position relative to eye center
    // The iris is typically near the center, but shifts when looking around
    // We'll use the eye center as a reference and calculate offset
    
    // Get eye corners for better direction calculation
    const leftEyeLeftCorner = leftEyePoints[0];  // Leftmost point
    const leftEyeRightCorner = leftEyePoints[3]; // Rightmost point
    const leftEyeTop = leftEyePoints[1];         // Top point
    const leftEyeBottom = leftEyePoints[4];      // Bottom point
    
    const rightEyeLeftCorner = rightEyePoints[0];
    const rightEyeRightCorner = rightEyePoints[3];
    const rightEyeTop = rightEyePoints[1];
    const rightEyeBottom = rightEyePoints[4];
    
    // Calculate eye direction based on iris position relative to eye center
    // When looking right, iris moves right relative to eye center
    // When looking left, iris moves left relative to eye center
    // We'll estimate this from the eye shape and position
    
    // Calculate horizontal gaze direction (left-right)
    // Use the eye corners to determine if looking left or right
    // Enhanced calculation for better sensitivity
    const leftEyeHorizontalOffset = ((leftEyeCenter.x - leftEyeBounds.left) / leftEyeWidth) - 0.5;
    const rightEyeHorizontalOffset = ((rightEyeCenter.x - rightEyeBounds.left) / rightEyeWidth) - 0.5;
    const avgHorizontalOffset = (leftEyeHorizontalOffset + rightEyeHorizontalOffset) / 2;
    
    // Calculate vertical gaze direction (up-down)
    // Use the eye top/bottom to determine if looking up or down
    // Enhanced calculation for better sensitivity
    const leftEyeVerticalOffset = ((leftEyeCenter.y - leftEyeBounds.top) / leftEyeHeight) - 0.5;
    const rightEyeVerticalOffset = ((rightEyeCenter.y - rightEyeBounds.top) / rightEyeHeight) - 0.5;
    const avgVerticalOffset = (leftEyeVerticalOffset + rightEyeVerticalOffset) / 2;
    
    // Amplify the offsets for more responsive movement
    const amplifiedHorizontalOffset = avgHorizontalOffset * 1.2;
    const amplifiedVerticalOffset = avgVerticalOffset * 1.2;
    
    // Calculate average eye center position on screen (normalized 0-1)
    const eyeCenterX = (leftEyeNorm.x + rightEyeNorm.x) / 2;
    const eyeCenterY = (leftEyeNorm.y + rightEyeNorm.y) / 2;
    
    // Calibration: Store initial eye position as center reference (faster calibration)
    if (calibrationFrames < 15) {
        calibrationData.centerEyeX = (calibrationData.centerEyeX * calibrationFrames + eyeCenterX) / (calibrationFrames + 1);
        calibrationData.centerEyeY = (calibrationData.centerEyeY * calibrationFrames + eyeCenterY) / (calibrationFrames + 1);
        calibrationData.eyeWidth = (calibrationData.eyeWidth * calibrationFrames + Math.abs(leftEyeWidth / videoWidth)) / (calibrationFrames + 1);
        calibrationData.eyeHeight = (calibrationData.eyeHeight * calibrationFrames + Math.abs(leftEyeHeight / videoHeight)) / (calibrationFrames + 1);
        calibrationFrames++;
    }
    
    // Calculate relative position from calibrated center
    const relativeX = eyeCenterX - calibrationData.centerEyeX;
    const relativeY = eyeCenterY - calibrationData.centerEyeY;
    
    // Map eye offset to screen position
    // The offset indicates where the iris is within the eye socket
    // Combine head movement (relativeX/Y) with eye movement (avgHorizontal/VerticalOffset)
    const horizontalSensitivity = 6.0; // Increased for faster horizontal movement
    const verticalSensitivity = 6.0;    // Increased for faster vertical movement
    const headMovementScale = 1.5;      // Increased for better head movement tracking
    
    // Calculate gaze point
    // Combine head position and eye direction with amplified offsets
    const gazeX = 0.5 + (relativeX * headMovementScale) + (amplifiedHorizontalOffset * horizontalSensitivity);
    const gazeY = 0.5 + (relativeY * headMovementScale) + (amplifiedVerticalOffset * verticalSensitivity);
    
    // Clamp to screen bounds (0-1)
    const clampedX = Math.max(0, Math.min(1, gazeX));
    const clampedY = Math.max(0, Math.min(1, gazeY));
    
    // Update gaze dot
    updateGazeDot(clampedX, clampedY);
}

// Handle Face Mesh results (MediaPipe) - not used, kept for compatibility
function onFaceMeshResults(results) {
    // This function is not used, using TensorFlow.js instead
}

// Update eye markers position
function updateEyeMarkers(leftEye, rightEye) {
    if (!leftEyeMarker || !rightEyeMarker) return;
    
    // Convert normalized coordinates (0-1) to screen pixels
    const leftEyeX = leftEye.x * window.innerWidth;
    const leftEyeY = leftEye.y * window.innerHeight;
    const rightEyeX = rightEye.x * window.innerWidth;
    const rightEyeY = rightEye.y * window.innerHeight;
    
    // Update left eye marker
    leftEyeMarker.style.left = leftEyeX + 'px';
    leftEyeMarker.style.top = leftEyeY + 'px';
    leftEyeMarker.style.display = 'block';
    
    // Update right eye marker
    rightEyeMarker.style.left = rightEyeX + 'px';
    rightEyeMarker.style.top = rightEyeY + 'px';
    rightEyeMarker.style.display = 'block';
}

// Update gaze dot position
function updateGazeDot(x, y) {
    if (!gazeDot) return;
    
    // Convert normalized coordinates (0-1) to screen pixels
    const screenX = x * window.innerWidth;
    const screenY = y * window.innerHeight;
    
    // Smooth movement (easing) - lower value = more responsive, higher = smoother
    // Reduced smoothing for faster, more responsive movement
    // 0.1 = very responsive/fast, 0.5 = very smooth/slow
    const smoothing = 0.19; // Reduced from 0.3 for faster response
    
    currentGazePoint.x += (screenX - currentGazePoint.x) * smoothing;
    currentGazePoint.y += (screenY - currentGazePoint.y) * smoothing;
    
    // Update dot position
    gazeDot.style.left = currentGazePoint.x + 'px';
    gazeDot.style.top = currentGazePoint.y + 'px';
    gazeDot.style.display = 'block';
}

// Stop eye tracking
function stopEyeTracking() {
    isEyeTrackingActive = false;
    faceApiLoaded = false;
    if (gazeDot) {
        gazeDot.style.display = 'none';
    }
    if (leftEyeMarker) {
        leftEyeMarker.style.display = 'none';
    }
    if (rightEyeMarker) {
        rightEyeMarker.style.display = 'none';
    }
    if (overlayCtx) {
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }
    if (faceMesh) {
        try {
            faceMesh.close();
        } catch (e) {
            console.log('Error closing faceMesh:', e);
        }
        faceMesh = null;
    }
}

// Enter fullscreen
function enterFullscreen() {
    const element = cameraContainer;
    
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    }
}

// Exit fullscreen
function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}

// Toggle fullscreen
function toggleFullscreen() {
    if (!document.fullscreenElement && 
        !document.webkitFullscreenElement && 
        !document.mozFullScreenElement && 
        !document.msFullscreenElement) {
        enterFullscreen();
    } else {
        exitFullscreen();
    }
}

// Event listeners
startBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    startCamera();
});

stopBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    stopCamera();
});

fullscreenBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFullscreen();
});

// Handle fullscreen change
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        // User exited fullscreen
    }
});

document.addEventListener('webkitfullscreenchange', () => {
    if (!document.webkitFullscreenElement) {
        // User exited fullscreen
    }
});

// Initialize video element
function initializeVideo() {
    // Ensure video element is properly configured
    video.setAttribute('autoplay', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('muted', '');
    video.setAttribute('webkit-playsinline', '');
    video.style.display = 'block';
    video.style.zIndex = '1';
    video.style.visibility = 'visible';
    video.style.opacity = '1';
    
    // Add event listeners for debugging
    video.addEventListener('play', () => {
        console.log('✓ Video play event fired');
    });
    
    video.addEventListener('playing', () => {
        console.log('✓ Video is now playing');
    });
    
    video.addEventListener('loadeddata', () => {
        console.log('✓ Video data loaded');
    });
    
    console.log('Video element initialized');
}

// Load texts on page load
loadTexts();

// Initialize video when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeVideo);
} else {
    initializeVideo();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopCamera();
});

