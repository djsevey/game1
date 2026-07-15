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
  jumpPower: -12,        // how high the player jumps (more negative = higher)
  moveSpeed: 4,          // left/right speed
  platformWidth: 70,
  platformHeight: 14,
  platformGap: 60,       // vertical space between platforms (bigger = harder)
  towerHeight: 4000,     // how tall the tower is in pixels (the "win" height)
  platformColor: "#430cdb",
  lavaRiseSpeed: 0.6,     // how fast the lava rises each frame (bigger = less time to dawdle)
  lavaColor: "#d4350e",
  crackedChance: 0.3,     // chance (0 to 1) that a platform is cracked
  crackTime: 45,          // frames you can stand on a cracked platform before it breaks (60 frames = 1 second)
  crackedColor: "#ff0000",
  brokenColor: "#000000",
  fireballInterval: 90,   // frames between fireball spawns (smaller = more frequent)
  fireballSpeed: 3,       // how fast fireballs fly across the screen
  fireballSize: 16,       // radius of each fireball
  fireballColor: "#ff9900"
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
let lavaY = 0;          // world y-position of the lava's surface (rises over time)
let fireballs = [];     // list of fireballs currently flying across the tower
let fireballTimer = 0;  // counts frames until the next fireball spawns

const keys = {}; // tracks which keys are currently held down

// The frog sprite image - loaded once here so it's ready to draw.
// If you rename the file or move it into a folder, update this path
// (e.g. "assets/frog.png").
const frogImage = new Image();
frogImage.src = "frog.png";


// ---------------------------------------------------------
// 3. PLATFORMS
// ---------------------------------------------------------
function createPlatforms() {
  platforms = [];

  // A wide starting platform right under the player - always solid,
  // so the player has a safe place to begin.
  platforms.push({
    x: canvas.width / 2 - 40, y: canvas.height - 30, width: 80, height: SETTINGS.platformHeight,
    type: "normal", standTime: 0, broken: false,
  });

  // Stack platforms going up to the top of the tower, alternating
  // left/right so the player has to actually move to climb.
  let y = canvas.height - 30 - SETTINGS.platformGap;
  while (y > -SETTINGS.towerHeight) {
    const x = Math.random() * (canvas.width - SETTINGS.platformWidth);
    const type = Math.random() < SETTINGS.crackedChance ? "cracked" : "normal";
    platforms.push({ x, y, width: SETTINGS.platformWidth, height: SETTINGS.platformHeight, type, standTime: 0, broken: false });
    y -= SETTINGS.platformGap;
  }
}

function drawPlatforms() {
  for (const p of platforms) {
    if (p.broken) continue; // broken platforms are gone - don't draw them

    const screenY = p.y - cameraY;
    if (screenY > -20 && screenY < canvas.height + 20) {
      if (p.type === "cracked") {
        // Gets darker/redder the longer the player has stood on it
        const pctToBreaking = p.standTime / SETTINGS.crackTime;
        ctx.fillStyle = pctToBreaking > 0.6 ? SETTINGS.brokenColor : SETTINGS.crackedColor;
      } else {
        ctx.fillStyle = SETTINGS.platformColor;
      }
      ctx.fillRect(p.x, screenY, p.width, p.height);
    }
  }
}


// ---------------------------------------------------------
// 3b. LAVA
// ---------------------------------------------------------
// The lava's y-position steadily decreases (which means it rises,
// since smaller y = higher up in our world). If the player doesn't
// keep climbing, the lava eventually catches up to them.
function updateLava() {
  lavaY -= SETTINGS.lavaRiseSpeed;
}

function drawLava() {
  const screenY = lavaY - cameraY;
  if (screenY < canvas.height) {
    const gradient = ctx.createLinearGradient(0, screenY, 0, screenY + 40);
    gradient.addColorStop(0, "#ffcc00");
    gradient.addColorStop(1, SETTINGS.lavaColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, screenY, canvas.width, canvas.height - screenY);
  }
}


// ---------------------------------------------------------
// 3c. FIREBALLS
// ---------------------------------------------------------
// Every SETTINGS.fireballInterval frames, a fireball spawns from a
// random wall (left or right) at a random height within view, and
// flies straight across toward the opposite wall.
function updateFireballs() {
  fireballTimer++;
  if (fireballTimer > SETTINGS.fireballInterval) {
    fireballTimer = 0;
    spawnFireball();
  }

  for (const f of fireballs) {
    f.x += f.vx;
  }

  // remove fireballs that have flown off the screen
  fireballs = fireballs.filter((f) => f.x > -50 && f.x < canvas.width + 50);
}

function spawnFireball() {
  const fromLeft = Math.random() < 0.5;
  const worldY = cameraY + Math.random() * canvas.height; // somewhere in view
  fireballs.push({
    x: fromLeft ? -SETTINGS.fireballSize : canvas.width + SETTINGS.fireballSize,
    y: worldY,
    vx: fromLeft ? SETTINGS.fireballSpeed : -SETTINGS.fireballSpeed,
  });
}

function drawFireballs() {
  ctx.fillStyle = SETTINGS.fireballColor;
  for (const f of fireballs) {
    const screenY = f.y - cameraY;
    ctx.beginPath();
    ctx.arc(f.x, screenY, SETTINGS.fireballSize, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Simple circle-vs-box check between a fireball and the player.
function hitsPlayer(f) {
  const closestX = Math.max(player.x, Math.min(f.x, player.x + player.width));
  const closestY = Math.max(player.y, Math.min(f.y, player.y + player.height));
  const dx = f.x - closestX;
  const dy = f.y - closestY;
  return dx * dx + dy * dy < SETTINGS.fireballSize * SETTINGS.fireballSize;
}


// ---------------------------------------------------------
// 4. PLAYER
// ---------------------------------------------------------
function createPlayer() {
  player = {
    x: canvas.width / 2 - 15,
    y: canvas.height - 80,
    width: 50,
    height: 50,
    vx: 0,          // horizontal speed
    vy: 0,          // vertical speed
    onGround: false,
    facing: 1,      // 1 = facing right, -1 = facing left (used to flip the frog sprite)
  };
}

function drawPlayer() {
  const screenY = player.y - cameraY;

  // If the frog image hasn't finished loading yet, fall back to a
  // plain square so the game still works while it loads.
  if (!frogImage.complete || frogImage.naturalWidth === 0) {
    ctx.fillStyle = "#8405be";
    ctx.fillRect(player.x, screenY, player.width, player.height);
    return;
  }

  ctx.save();
  if (player.facing === -1) {
    // Flip the sprite horizontally when facing left
    ctx.translate(player.x + player.width, screenY);
    ctx.scale(-1, 1);
    ctx.drawImage(frogImage, 0, 0, player.width, player.height);
  } else {
    ctx.drawImage(frogImage, player.x, screenY, player.width, player.height);
  }
  ctx.restore();
}

function updatePlayer() {
  // --- horizontal movement ---
  player.vx = 0;
  if (keys["ArrowLeft"] || keys["a"]) player.vx = -SETTINGS.moveSpeed;
  if (keys["ArrowRight"] || keys["d"]) player.vx = SETTINGS.moveSpeed;
  player.x += player.vx;

  // remember which way the frog is facing so drawPlayer can flip the sprite
  if (player.vx > 0) player.facing = 1;
  if (player.vx < 0) player.facing = -1;

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
      if (p.broken) continue; // can't land on a platform that's already gone

      const withinX = player.x + player.width > p.x && player.x < p.x + p.width;
      const wasAbove = player.y + player.height - player.vy <= p.y;
      const nowBelowTop = player.y + player.height >= p.y;
      if (withinX && wasAbove && nowBelowTop) {
        player.y = p.y - player.height;
        player.vy = 0;
        player.onGround = true;

        // Cracked platforms start counting down the moment you land.
        // Stand too long and they crumble away beneath you!
        if (p.type === "cracked") {
          p.standTime++;
          if (p.standTime > SETTINGS.crackTime) {
            p.broken = true;
            player.onGround = false; // the floor just vanished - start falling again
          }
        }
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

  // --- lose condition: the lava caught up to the player ---
  if (player.y + player.height > lavaY) {
    endGame(false, true); // true = died in lava
  }

  // --- lose condition: hit by a fireball ---
  for (const f of fireballs) {
    if (hitsPlayer(f)) {
      endGame(false, false, true); // third true = died in fire
    }
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
  updateLava();
  updateFireballs();
  drawPlatforms();
  drawLava();
  drawFireballs();
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
function endGame(won, diedInLava, diedInFire) {
  gameOver = true;
  gameWon = won;

  const height = Math.max(0, Math.floor(-cameraY / 10));
  if (won) {
    overlayTitle.textContent = "You Reached the Top! 🎉";
  } else if (diedInLava) {
    overlayTitle.textContent = "Swallowed by Lava! 🌋";
  } else if (diedInFire) {
    overlayTitle.textContent = "Roasted by a Fireball! 🔥";
  } else {
    overlayTitle.textContent = "You Fell! 💥";
  }
  overlayScore.textContent = `Height: ${height}m`;
  overlay.classList.remove("hidden");
}

function startGame() {
  cameraY = 0;
  gameOver = false;
  gameWon = false;
  // Start the lava a bit below the bottom of the screen, giving the
  // player a few seconds' head start before it becomes a threat.
  lavaY = canvas.height + 150;
  fireballs = [];
  fireballTimer = 0;
  overlay.classList.add("hidden");
  createPlatforms();
  createPlayer();
  gameLoop();
}

restartBtn.addEventListener("click", startGame);

// Kick things off!ad
startGame();