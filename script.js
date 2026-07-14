// =========================================================
//  TOWER CLIMBER - main game script
//  This file is split into clearly labeled sections so it's
//  easy to find the part you want to change:
//    1. SETTINGS      - numbers you can tweak for quick fun changes
//    2. SETUP         - canvas + game state
//    3. PLATFORMS     - creating and drawing the platforms
//    4. PLAYER        - the character: movement, jumping, drawing
//    5. GAME LOOP     - runs every frame
//    6. INPUT         - keyboard controls
//    7. WIN / LOSE    - game over and restart logic
// =========================================================


// ---------------------------------------------------------
// 1. SETTINGS  <-- easiest place to start experimenting!
// ---------------------------------------------------------
const SETTINGS = {
  gravity: 0.5,          // how fast the player falls (bigger = falls faster)
  jumpPower: -11,        // how high the player jumps (more negative = higher)
  moveSpeed: 4,          // left/right speed
  platformWidth: 60,
  platformHeight: 14,
  platformGap: 80,       // vertical space between platforms (bigger = harder)
  towerHeight: 4000,     // how tall the tower is in pixels (the "win" height)
  playerColor: "#ff6b6b",
  platformColor: "#6bff95",
};


// ---------------------------------------------------------
// 2. SETUP
// ---------------------------------------------------------
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreDisplay = document.getElementById("scoreDisplay");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayScore = document.getElementById("overlayScore");
const restartBtn = document.getElementById("restartBtn");

let cameraY = 0;       // how far up the "camera" has scrolled
let gameOver = false;
let gameWon = false;
let platforms = [];
let player;

const keys = {}; // tracks which keys are currently held down


// ---------------------------------------------------------
// 3. PLATFORMS
// ---------------------------------------------------------
function createPlatforms() {
  platforms = [];

  // A wide starting platform right under the player
  platforms.push({ x: canvas.width / 2 - 40, y: canvas.height - 30, width: 80, height: SETTINGS.platformHeight });

  // Stack platforms going up to the top of the tower, alternating
  // left/right so the player has to actually move to climb.
  let y = canvas.height - 30 - SETTINGS.platformGap;
  while (y > -SETTINGS.towerHeight) {
    const x = Math.random() * (canvas.width - SETTINGS.platformWidth);
    platforms.push({ x, y, width: SETTINGS.platformWidth, height: SETTINGS.platformHeight });
    y -= SETTINGS.platformGap;
  }
}

function drawPlatforms() {
  ctx.fillStyle = SETTINGS.platformColor;
  for (const p of platforms) {
    const screenY = p.y - cameraY;
    // Only draw platforms that are actually visible (a little optimization)
    if (screenY > -20 && screenY < canvas.height + 20) {
      ctx.fillRect(p.x, screenY, p.width, p.height);
    }
  }
}


// ---------------------------------------------------------
// 4. PLAYER
// ---------------------------------------------------------
function createPlayer() {
  player = {
    x: canvas.width / 2 - 15,
    y: canvas.height - 60,
    width: 30,
    height: 30,
    vx: 0,          // horizontal speed
    vy: 0,          // vertical speed
    onGround: false,
  };
}

function drawPlayer() {
  ctx.fillStyle = SETTINGS.playerColor;
  const screenY = player.y - cameraY;
  ctx.fillRect(player.x, screenY, player.width, player.height);
}

function updatePlayer() {
  // --- horizontal movement ---
  player.vx = 0;
  if (keys["ArrowLeft"] || keys["a"]) player.vx = -SETTINGS.moveSpeed;
  if (keys["ArrowRight"] || keys["d"]) player.vx = SETTINGS.moveSpeed;
  player.x += player.vx;

  // wrap around the sides of the tower (fun optional touch!)
  if (player.x + player.width < 0) player.x = canvas.width;
  if (player.x > canvas.width) player.x = -player.width;

  // --- gravity + jumping ---
  player.vy += SETTINGS.gravity;
  player.y += player.vy;

  // --- platform collision (only when falling downward) ---
  player.onGround = false;
  if (player.vy > 0) {
    for (const p of platforms) {
      const withinX = player.x + player.width > p.x && player.x < p.x + p.width;
      const wasAbove = player.y + player.height - player.vy <= p.y;
      const nowBelowTop = player.y + player.height >= p.y;
      if (withinX && wasAbove && nowBelowTop) {
        player.y = p.y - player.height;
        player.vy = 0;
        player.onGround = true;
      }
    }
  }

  // --- camera follows the player upward ---
  const targetCameraY = player.y - canvas.height * 0.6;
  if (targetCameraY < cameraY) {
    cameraY = targetCameraY;
  }

  // --- win condition: reached the top of the tower ---
  if (player.y < -SETTINGS.towerHeight + 100) {
    endGame(true);
  }

  // --- lose condition: fell below the visible camera view ---
  if (player.y - cameraY > canvas.height + 60) {
    endGame(false);
  }
}

function jump() {
  if (player.onGround) {
    player.vy = SETTINGS.jumpPower;
    player.onGround = false;
  }
}


// ---------------------------------------------------------
// 5. GAME LOOP
// ---------------------------------------------------------
function updateScoreDisplay() {
  const height = Math.max(0, Math.floor(-cameraY / 10)); // arbitrary "meters" for fun
  scoreDisplay.textContent = `Height: ${height}m`;
}

function gameLoop() {
  if (gameOver) return; // stop the loop once the game has ended

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updatePlayer();
  drawPlatforms();
  drawPlayer();
  updateScoreDisplay();

  requestAnimationFrame(gameLoop);
}


// ---------------------------------------------------------
// 6. INPUT
// ---------------------------------------------------------
document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  if (e.key === " " || e.key === "ArrowUp" || e.key === "w") {
    jump();
    e.preventDefault(); // stops the page from scrolling when you hit spacebar
  }
});

document.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});


// ---------------------------------------------------------
// 7. WIN / LOSE
// ---------------------------------------------------------
function endGame(won) {
  gameOver = true;
  gameWon = won;

  const height = Math.max(0, Math.floor(-cameraY / 10));
  overlayTitle.textContent = won ? "You Reached the Top! 🎉" : "You Fell! 💥";
  overlayScore.textContent = `Height: ${height}m`;
  overlay.classList.remove("hidden");
}

function startGame() {
  cameraY = 0;
  gameOver = false;
  gameWon = false;
  overlay.classList.add("hidden");
  createPlatforms();
  createPlayer();
  gameLoop();
}

restartBtn.addEventListener("click", startGame);

// Kick things off!
startGame();
