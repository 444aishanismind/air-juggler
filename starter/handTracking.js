// Hand tracking state
let detector = null;
let video = null;
let isDetecting = false;
let sendHandsCallback = null;

async function setupHandTracking(videoElement, sendHands) {
  video = videoElement;
  sendHandsCallback = sendHands;
  try {
    // Request webcam access
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
    });
    video.srcObject = stream;
    await video.play();
    // Load MediaPipe Hands model
    const model = window.handPoseDetection.SupportedModels.MediaPipeHands;
    const detectorConfig = {
      runtime: "mediapipe",
      solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands",
      maxHands: 2,
      modelType: "full",
    };
    detector = await window.handPoseDetection.createDetector(model, detectorConfig);
    console.log("Hand tracking initialized successfully");
    return true;
  } catch (error) {
    console.error("Error setting up hand tracking:", error);
    alert(
      "Could not access webcam. Please ensure you have granted camera permissions.",
    );
    return false;
  }
}

function startDetection() {
  if (!detector || !video) {
    console.error("Hand tracking not initialized");
    return;
  }
  isDetecting = true;
  detectHands();
}

function stopDetection() {
  isDetecting = false;
}

async function detectHands() {
  if (!isDetecting) return;
  try {
    const hands = await detector.estimateHands(video);
    const handPositions = hands.map((hand) => {
      // Get palm center (average of wrist and four finger bases)
      const palmBase = [0, 5, 9, 13, 17].map((i) => hand.keypoints[i]);
      const avgX = palmBase.reduce((sum, kp) => sum + kp.x, 0) / palmBase.length;
      const avgY = palmBase.reduce((sum, kp) => sum + kp.y, 0) / palmBase.length;
      return {
        x: 640 - avgX, // Mirror x coordinate for webcam
        y: avgY,
      };
    });
    if (sendHandsCallback) {
      sendHandsCallback(handPositions);
    }
  } catch (error) {
    console.error("Error detecting hands:", error);
  }
  setTimeout(() => detectHands(), 33); // ~30fps
}

window.handTracking = {
  setupHandTracking,
  startDetection,
  stopDetection,
};
