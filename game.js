// Game Setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 500;

const player = {
  x: canvas.width / 2,
  y: canvas.height - 80,
  width: 60,
  height: 50
};

const bullets = [];
const enemies = [];
const particles = [];

let score = 0;
let level = 1;
let lives = 3;
let gameIsOver = false;
let spawnRate = 120;
let frameCount = 0;

const playerImg = new Image();
playerImg.src = "assets/player_ship.png";

const enemyImg = new Image();
enemyImg.src = "assets/enemy_ship.png";

document.getElementById("typedWord").addEventListener("input", handleInput);

function toggleScreen(id, show) {
  const screen = document.getElementById(id);
  if (!screen) return;
  screen.classList.toggle("hidden", !show);
  screen.classList.toggle("visible", show);
}

function startGame() {
  toggleScreen("startScreen", false);
  toggleScreen("gameOverScreen", false);
  document.querySelector(".game-container").classList.remove("hidden");
  document.querySelector(".game-container").classList.add("visible");
  document.getElementById("typedWord").focus();

  score = 0;
  level = 1;
  lives = 3;
  gameIsOver = false;
  spawnRate = 120;

  bullets.length = 0;
  enemies.length = 0;
  particles.length = 0;

  fetchWordsFromAPI();

  updateScoreDisplay();
  updateLivesDisplay();
  document.getElementById("bgMusic")?.play();
  gameLoop();
}

function resetHighScore() {
  localStorage.removeItem("highScore");
  updateScoreDisplay();
}

function gameLoop() {
  if (gameIsOver) return;
  update();
  render();
  requestAnimationFrame(gameLoop);
}

function update() {
  frameCount++;

  if (frameCount % spawnRate === 0) {
    spawnEnemy();
    if (frameCount % (spawnRate * 10) === 0 && level > 2) {
      spawnBoss();
    }
  }

  bullets.forEach((bullet, i) => {
    bullet.x += bullet.dx;
    bullet.y += bullet.dy;
    if (
      bullet.x < 0 ||
      bullet.x > canvas.width ||
      bullet.y < 0 ||
      bullet.y > canvas.height
    ) {
      bullets.splice(i, 1);
    }
  });

  enemies.forEach((enemy, eIndex) => {
    enemy.y += enemy.speed;

    bullets.forEach((bullet, bIndex) => {
      if (checkCollision(bullet, enemy)) {
        bullets.splice(bIndex, 1);
        enemy.health--;
        if (enemy.health <= 0) {
          createExplosion(enemy.x, enemy.y);
          playSound("explosionSound");
          score += enemy.points;
          enemies.splice(eIndex, 1);
        }
      }
    });

    if (enemy.y > canvas.height) {
      lives--;
      updateLivesDisplay();
      if (lives <= 0) gameOver();
      enemies.splice(eIndex, 1);
    }
  });

  particles.forEach((p, i) => {
    p.x += p.speedX;
    p.y += p.speedY;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  });

  updateScoreDisplay();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(playerImg, player.x - player.width / 2, player.y, player.width, player.height);

  ctx.fillStyle = "#FFFF00";
  bullets.forEach((b) => {
    ctx.fillRect(b.x, b.y, b.width, b.height);
  });

  enemies.forEach((e) => {
    ctx.drawImage(enemyImg, e.x, e.y, e.width, e.height);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(e.word, e.x + e.width / 2, e.y - 10);

    if (e.isBoss) {
      ctx.fillStyle = "red";
      ctx.fillRect(e.x, e.y - 20, e.width * (e.health / e.maxHealth), 5);
    }
  });

  particles.forEach((p) => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / 60;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });
  ctx.globalAlpha = 1;
}

let apiWords = [];

async function fetchWordsFromAPI() {
  try {
    const response = await fetch("https://api.datamuse.com/words?rel_trg=war&max=100");
    const data = await response.json();
    apiWords = data.map(w => w.word).filter(word => word.length <= 12);
  } catch (e) {
    console.error("Failed to fetch words from API", e);
  }
}

function spawnEnemy() {
  if (apiWords.length < 1) return;
  const word = apiWords[Math.floor(Math.random() * apiWords.length)];

  enemies.push({
    x: Math.random() * (canvas.width - 50),
    y: -50,
    width: 50,
    height: 40,
    word,
    speed: 0.5 + level * 0.15,
    health: 1,
    points: word.length * 10
  });
}

function spawnBoss() {
  const word = "annihilation";
  enemies.push({
    x: Math.random() * (canvas.width - 80),
    y: -80,
    width: 80,
    height: 60,
    word,
    speed: 0.5,
    health: 5,
    maxHealth: 5,
    points: 500,
    isBoss: true
  });
}

function shoot(targetX, targetY, targetSpeedY) {
  const speed = 8;
  const startX = player.x;
  const startY = player.y;
  const distY = targetY - startY;
  const estimatedTime = Math.abs(distY / speed);
  const leadY = targetY + targetSpeedY * estimatedTime;
  const angle = Math.atan2(leadY - startY, targetX - startX);

  bullets.push({
    x: startX,
    y: startY,
    width: 8,
    height: 8,
    dx: Math.cos(angle) * speed,
    dy: Math.sin(angle) * speed
  });

  playSound("shootSound");
}

function handleInput(e) {
  const typed = e.target.value.toLowerCase().trim();

  for (let i = 0; i < enemies.length; i++) {
    if (typed === enemies[i].word.toLowerCase()) {
      const enemy = enemies[i];
      shoot(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.speed);
      e.target.value = "";
      break;
    }
  }
}

function checkCollision(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function createExplosion(x, y) {
  for (let i = 0; i < 20; i++) {
    particles.push({
      x: x + Math.random() * 20,
      y: y + Math.random() * 20,
      size: Math.random() * 6 + 2,
      color: `hsl(${Math.random() * 60}, 100%, 50%)`,
      speedX: (Math.random() - 0.5) * 4,
      speedY: (Math.random() - 0.5) * 4,
      life: 60
    });
  }
}

function updateScoreDisplay() {
  document.getElementById("scoreDisplay").textContent = `Score: ${score}`;
  document.getElementById("levelDisplay").textContent = `Level: ${level}`;

  const storedHighScore = parseInt(localStorage.getItem("highScore") || "0");
  if (score > storedHighScore) {
    localStorage.setItem("highScore", score);
  }

  const highScore = Math.max(score, storedHighScore);
  document.getElementById("highScoreDisplay").textContent = `High Score: ${highScore}`;

  if (score >= level * 700) {
    level++;
    spawnRate = Math.max(30, spawnRate - 10);
    showLevelUpFlash();
  }
}

function updateLivesDisplay() {
  document.getElementById("livesDisplay").innerHTML = "Lives: " + "❤️".repeat(lives);
}

function gameOver() {
  gameIsOver = true;
  document.querySelector(".game-container").classList.remove("visible");
  document.querySelector(".game-container").classList.add("hidden");

  toggleScreen("gameOverScreen", true);
  document.getElementById("finalScore").textContent = score;
}

function playSound(id) {
  const sfx = document.getElementById(id);
  sfx.currentTime = 0;
  sfx.play();
}

function createVirtualKeyboard() {
  const keyboard = document.getElementById("virtualKeyboard");
  const letters = "abcdefghijklmnopqrstuvwxyz";
  letters.split("").forEach((letter) => {
    const key = document.createElement("button");
    key.textContent = letter;
    key.onclick = () => {
      const input = document.getElementById("typedWord");
      input.value += letter;
      input.focus();
    };
    keyboard.appendChild(key);
  });

  const back = document.createElement("button");
  back.textContent = "⌫";
  back.onclick = () => {
    const input = document.getElementById("typedWord");
    input.value = input.value.slice(0, -1);
    input.focus();
  };
  keyboard.appendChild(back);
}

function showLevelUpFlash() {
  const flash = document.getElementById("levelUpFlash");
  flash.style.display = "block";
  setTimeout(() => {
    flash.style.display = "none";
  }, 1000);
}

createVirtualKeyboard();
