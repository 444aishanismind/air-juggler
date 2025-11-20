// Game configuration
const config = {
  ballCount: 1,
  ballSize: 32,      // pixel block size
  gravity: 0.18,
  bounceVelocity: -7.5,
  handSize: 48,
  countdownTime: 3,
};

// Game state
let gameState = {
  balls: [],
  hands: [],
  score: 0,
  gameOver: false,
  startTime: null,
  animationId: null,
  countdown: 0,
  isCountingDown: false,
};

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const startButton = document.getElementById("startButton");
const scoreDisplay = document.getElementById("score");
const overlayMessage = document.getElementById("overlayMessage");
const loadingOverlay = document.getElementById("loadingOverlay");
const loadingStatus = document.getElementById("loadingStatus");

function initBalls() {
  gameState.balls = [];
  for (let i = 0; i < config.ballCount; i++) {
    gameState.balls.push({
      x: canvas.width / 2,
      y: 120,
      vx: 0,
      vy: 0,
      size: config.ballSize,
      color: "#ffd700", // gold pixel
    });
  }
}

// Pixel-style rectangle for "blocky ball"
function drawPixelBlock(x, y, size, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
  ctx.strokeStyle = "#888888";
  ctx.lineWidth = 3;
  ctx.strokeRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
}

function updateBalls() {
  gameState.balls.forEach((ball) => {
    ball.vy += config.gravity;
    ball.x += ball.vx;
    ball.y += ball.vy;
    // Bounce off walls
    if (ball.x - ball.size / 2 < 0 || ball.x + ball.size / 2 > canvas.width) {
      ball.vx *= -1;
      ball.x = ball.x < canvas.width / 2 ? ball.size / 2 : canvas.width - ball.size / 2;
    }
    // Bounce off top
    if (ball.y - ball.size / 2 < 0) {
      ball.vy *= -1;
      ball.y = ball.size / 2;
    }
  });
}

function checkCollisions() {
  gameState.balls.forEach((ball) => {
    gameState.hands.forEach((hand) => {
      const dx = ball.x - hand.x;
      const dy = ball.y - hand.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < ball.size / 2 + config.handSize / 2) {
        ball.vy = config.bounceVelocity;
        ball.vx += dx * 0.14;
        // Prevent ball from getting stuck inside hand zone (push outward)
        const angle = Math.atan2(dy, dx);
        const targetX = hand.x + Math.cos(angle) * (ball.size / 2 + config.handSize / 2);
        const targetY = hand.y + Math.sin(angle) * (ball.size / 2 + config.handSize / 2);
        ball.x = targetX;
        ball.y = targetY;
      }
    });
  });
}

function checkGameOver() {
  return gameState.balls.some((ball) => ball.y - ball.size / 2 > canvas.height);
}

function updateScore() {
  if (gameState.startTime && !gameState.gameOver) {
    gameState.score = Math.floor((Date.now() - gameState.startTime) / 1000);
    scoreDisplay.textContent = gameState.score;
  }
}

function render() {
  const webcam = document.getElementById("webcam");

  // 1. Draw live webcam as the canvas background, mirrored for selfie feel!
  if (webcam && webcam.readyState === webcam.HAVE_ENOUGH_DATA) {
    // Disable smoothing for blocky "Minecraft" video (pixel vibe)
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.scale(-1, 1); // Mirror horizontally
    ctx.drawImage(webcam, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();
  } else {
    // If webcam not ready, show Minecraft sky-blue background
    ctx.fillStyle = "#73b7ff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // 2. Draw pixel balls (blocks)
  gameState.balls.forEach((ball) => {
    drawPixelBlock(ball.x, ball.y, ball.size, ball.color);
  });

  // 3. Draw hand paddles (pixel blocks)
  gameState.hands.forEach((hand, idx) => {
    drawPixelBlock(hand.x, hand.y, config.handSize, "#5eaa46");
    ctx.fillStyle = "#fff";
    ctx.font = "16px 'Press Start 2P', Courier, monospace";
    ctx.fillText(`Hand ${idx + 1}`, hand.x - config.handSize / 2, hand.y - config.handSize / 2 - 8);
  });

  // 4. Draw countdown overlay if counting down
  if (gameState.isCountingDown) {
    ctx.fillStyle = "rgba(0,0,0,0.43)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 54px 'Press Start 2P', Courier, monospace";
    ctx.textAlign = "center";
    ctx.fillText(Math.ceil(gameState.countdown), canvas.width / 2, canvas.height / 2);
    ctx.font = "bold 22px 'Press Start 2P', Courier, monospace";
    ctx.fillStyle = "#e5d8ab";
    ctx.fillText("Get Ready!", canvas.width / 2, canvas.height / 2 + 40);
  }
}


function gameLoop() {
  if (gameState.gameOver) return;
  if (gameState.isCountingDown) {
    gameState.countdown -= 1 / 60;
    if (gameState.countdown <= 0) {
      gameState.isCountingDown = false;
      gameState.startTime = Date.now();
    }
  } else {
    updateBalls();
    checkCollisions();
    updateScore();
    if (checkGameOver()) {
      endGame();
      return;
    }
  }
  render();
  gameState.animationId = requestAnimationFrame(gameLoop);
}

// --- Leaderboard ---
function saveScore(score) {
  let scores = getLeaderboard();
  scores.push({ score: score, date: new Date().toLocaleString() });
  scores = scores.sort((a, b) => b.score - a.score).slice(0, 5);
  localStorage.setItem("airJugglerLeaderboard", JSON.stringify(scores));
}
function getLeaderboard() {
  const scores = localStorage.getItem("airJugglerLeaderboard");
  return scores ? JSON.parse(scores) : [];
}
function leaderboardHTML() {
  const leaderboard = getLeaderboard();
  let html = "<div style='margin-top:1rem'><strong>Leaderboard</strong><ol style='text-align:left;'>";
  leaderboard.forEach((entry, i) => {
    html += `<li>#${i + 1}: ${entry.score}s <span style='color:#888;font-size:0.92em;'>(${entry.date})</span></li>`;
  });
  html += "</ol></div>";
  return html;
}

// --- Game Control ---
async function startGame() {
  gameState.gameOver = false;
  gameState.startTime = null;
  gameState.score = 0;
  gameState.hands = [];
  gameState.countdown = config.countdownTime;
  gameState.isCountingDown = true;
  initBalls();

  if (!window.handTrackingInitialized) {
    loadingOverlay.classList.remove("hidden");
    loadingStatus.textContent = "Requesting to see thou beautiful face...";
    const webcam = document.getElementById("webcam");
    loadingStatus.textContent = "Loading ...";
    const success = await window.handTracking.setupHandTracking(webcam, function receiveHands(hands) {
      gameState.hands = hands;
    });
    loadingOverlay.classList.add("hidden");
    if (!success) {
      endGame();
      overlayMessage.textContent = "Camera access required to play!";
      return;
    }
    window.handTracking.startDetection();
    window.handTrackingInitialized = true;
  }
  overlay.classList.add("hidden");
  gameLoop();
}

function endGame() {
  gameState.gameOver = true;
  cancelAnimationFrame(gameState.animationId);
  saveScore(gameState.score);
  const emoji = gameState.score > 30 ? "🎉" : gameState.score > 15 ? "👏" : "💪";
  const message = gameState.score > 30
    ? "Amazing!"
    : gameState.score > 15
      ? "Great Job!"
      : "Game Over!";
  overlayMessage.innerHTML = `
    <div style="font-size: 3rem; margin-bottom: 0.5rem;">${emoji}</div>
    <div style="font-size: 2rem; margin-bottom: 0.5rem;">${message}</div>
    <div style="font-size: 1.05rem; color: #666; font-family: 'Press Start 2P', Courier, monospace;">
      You survived ${gameState.score} seconds
    </div>
    ${leaderboardHTML()}
  `;
  startButton.textContent = "Play Again";
  overlay.classList.remove("hidden");
}

startButton.addEventListener("click", startGame);

document.getElementById("clearLeaderboard").onclick = function() {
  localStorage.removeItem("airJugglerLeaderboard");
  alert("Leaderboard cleared! Play again to set new high scores.");
};

// Checks if TensorFlow.js is loaded before game starts
function checkTensorFlowLoaded() {
  if (typeof tf !== "undefined" && typeof handPoseDetection !== "undefined") {
    loadingOverlay.classList.add("hidden");
  } else {
    setTimeout(checkTensorFlowLoaded, 100);
  }
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", checkTensorFlowLoaded);
} else {
  checkTensorFlowLoaded();
}
render();
