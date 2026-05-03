(() => {
  /*
    Hex Rush V2.0
    2026 eriselizabeth.com
    Updated: 2026-05-03 11:32:59 -04:00

    This is the main game file. It is intentionally plain JavaScript so it can
    be embedded on a website without a build step. I sorta know what I am doing:
    one state object, one animation loop, and a few helper functions that each
    try to do one thing.

    V2.0 changes:
    - got rid of the blue and yellow hexagons
    - the black hexagons now travel in a linear fasion, only on the x and y axis
    - all hexagons entering are 25% faster
    - the main collecter hexagone moves without mouseclicks, it becomes the cursor
  */

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const scoreNode = document.getElementById("score");
  const bestNode = document.getElementById("best");
  const overlay = document.getElementById("overlay");
  const startButton = document.getElementById("startButton");
  const pauseButton = document.getElementById("pauseButton");

  const STORAGE_KEY = "hex-rush-best";
  const TAU = Math.PI * 2;

  // Everything the game needs to remember lives here so I can find it again.
  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    running: false,
    paused: false,
    gameOver: false,
    score: 0,
    best: Number(localStorage.getItem(STORAGE_KEY) || 0),
    time: 0,
    spawnTimer: 0,
    hazardTimer: 0,
    pointerReady: false,
    keys: new Set(),
    target: { x: 0, y: 0 },
    player: { x: 0, y: 0, radius: 22, angle: 0, speed: 760 },
    entities: [],
    particles: []
  };

  bestNode.textContent = state.best;

  function resize() {
    // Match canvas pixels to the visible size so the game does not look blurry.
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = Math.max(320, Math.floor(canvas.clientWidth));
    state.height = Math.max(320, Math.floor(canvas.clientHeight));
    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    state.target.x ||= state.width / 2;
    state.target.y ||= state.height / 2;
  }

  function start() {
    // Reset all the moving parts back to a fresh run.
    state.running = true;
    state.paused = false;
    state.gameOver = false;
    state.score = 0;
    state.time = 0;
    state.spawnTimer = 0;
    state.hazardTimer = 0.7;
    state.entities.length = 0;
    state.particles.length = 0;
    state.player.x = state.width / 2;
    state.player.y = state.height / 2;
    state.player.angle = 0;
    state.target.x = state.player.x;
    state.target.y = state.player.y;
    scoreNode.textContent = "0";
    pauseButton.textContent = "II";
    pauseButton.setAttribute("aria-label", "Pause game");
    overlay.hidden = true;
  }

  function endGame() {
    // Save best score locally in this browser, then show the replay screen.
    state.gameOver = true;
    state.running = false;
    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem(STORAGE_KEY, String(state.best));
      bestNode.textContent = state.best;
    }
    overlay.querySelector("h1").textContent = "Game Over";
    overlay.querySelector("p").textContent = `Score ${state.score}. Collect dark hexagons and avoid crimson ones.`;
    startButton.textContent = "Play Again";
    overlay.hidden = false;
    burst(state.player.x, state.player.y, "#ff4c66", 42);
  }

  function togglePause() {
    // Same overlay as the title screen, just with pause text swapped in.
    if (!state.running && !state.paused) return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? ">" : "II";
    pauseButton.setAttribute("aria-label", state.paused ? "Resume game" : "Pause game");
    if (state.paused) {
      overlay.querySelector("h1").textContent = "Paused";
      overlay.querySelector("p").textContent = "Take a breath. The hexagons will wait.";
      startButton.textContent = "Resume";
      overlay.hidden = false;
    } else {
      overlay.hidden = true;
    }
  }

  function spawn(type) {
    // New hexagons enter from an edge. V2.0 makes them 25% faster.
    const edge = Math.floor(Math.random() * 4);
    const margin = 40;
    const speedMultiplier = 1.25;
    const size = type === "hazard" ? rand(15, 28) : rand(13, 23);
    let x = rand(-margin, state.width + margin);
    let y = rand(-margin, state.height + margin);
    if (edge === 0) y = -margin;
    if (edge === 1) x = state.width + margin;
    if (edge === 2) y = state.height + margin;
    if (edge === 3) x = -margin;

    const baseSpeed = (70 + Math.min(170, state.time * 4)) * speedMultiplier;
    let vx = 0;
    let vy = 0;

    if (type === "score") {
      // V2.0: black hexagons travel in a linear fasion, only on the x and y axis.
      const speed = rand(baseSpeed * 0.65, baseSpeed);
      const direction = edge === 0 || edge === 3 ? 1 : -1;
      if (edge === 0 || edge === 2) {
        vy = speed * direction;
      } else {
        vx = speed * direction;
      }
    } else {
      const angle = Math.atan2(state.height / 2 - y + rand(-160, 160), state.width / 2 - x + rand(-160, 160));
      vx = Math.cos(angle) * rand(baseSpeed * 0.65, baseSpeed);
      vy = Math.sin(angle) * rand(baseSpeed * 0.65, baseSpeed);
    }

    state.entities.push({
      type,
      x,
      y,
      radius: size,
      vx,
      vy,
      angle: rand(0, TAU),
      spin: rand(-2.8, 2.8)
    });
  }

  function update(dt) {
    // dt means "delta time": how many seconds passed since the last frame.
    if (!state.running || state.paused) return;
    state.time += dt;
    state.player.angle += dt * (3.5 + state.score * 0.015);

    movePlayer(dt);

    state.spawnTimer -= dt;
    state.hazardTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawn("score");
      state.spawnTimer = Math.max(0.18, 0.62 - state.time * 0.008);
    }
    if (state.hazardTimer <= 0) {
      spawn("hazard");
      state.hazardTimer = Math.max(0.38, 1.15 - state.time * 0.01);
    }

    updateEntities(dt);
    updateParticles(dt);
  }

  function movePlayer(dt) {
    // V2.0: the main collecter hexagone becomes the cursor, no mouseclick needed.
    const player = state.player;
    let dx = 0;
    let dy = 0;

    if (state.pointerReady) {
      dx = state.target.x - player.x;
      dy = state.target.y - player.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 1) {
        const speed = player.speed;
        const step = Math.min(distance, speed * dt);
        player.x += (dx / distance) * step;
        player.y += (dy / distance) * step;
      }
    } else {
      dx = Number(state.keys.has("ArrowRight") || state.keys.has("KeyD")) - Number(state.keys.has("ArrowLeft") || state.keys.has("KeyA"));
      dy = Number(state.keys.has("ArrowDown") || state.keys.has("KeyS")) - Number(state.keys.has("ArrowUp") || state.keys.has("KeyW"));
      const distance = Math.hypot(dx, dy) || 1;
      const speed = 390;
      player.x += (dx / distance) * speed * dt;
      player.y += (dy / distance) * speed * dt;
    }

    player.x = clamp(player.x, player.radius, state.width - player.radius);
    player.y = clamp(player.y, player.radius, state.height - player.radius);
  }

  function updateEntities(dt) {
    // Move every collectible/hazard, remove old ones, and check collisions.
    const player = state.player;
    for (let i = state.entities.length - 1; i >= 0; i -= 1) {
      const entity = state.entities[i];
      entity.x += entity.vx * dt;
      entity.y += entity.vy * dt;
      entity.angle += entity.spin * dt;

      if (entity.x < -80 || entity.x > state.width + 80 || entity.y < -80 || entity.y > state.height + 80) {
        state.entities.splice(i, 1);
        continue;
      }

      if (Math.hypot(entity.x - player.x, entity.y - player.y) < entity.radius + player.radius * 0.72) {
        if (entity.type === "hazard") {
          endGame();
          return;
        }
        state.score += 10 + Math.floor(state.time / 12);
        scoreNode.textContent = state.score;
        burst(entity.x, entity.y, "#d7dde7", 12);
        state.entities.splice(i, 1);
      }
    }
  }

  function updateParticles(dt) {
    // Tiny visual sparks after collecting something or crashing.
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
  }

  function draw() {
    // Draw order matters: background first, then objects, then player on top.
    ctx.clearRect(0, 0, state.width, state.height);
    drawGrid();

    for (const entity of state.entities) {
      const color = entity.type === "hazard" ? "#ff4c66" : "#20242d";
      drawHex(entity.x, entity.y, entity.radius, entity.angle, color, entity.type === "score" ? "#eef2f7" : "rgba(255,255,255,0.72)");
    }

    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      drawHex(p.x, p.y, p.radius, p.angle, p.color, "transparent");
      ctx.globalAlpha = 1;
    }

    drawHex(state.player.x, state.player.y, state.player.radius, state.player.angle, "#05070a", "#ffffff", 3);
  }

  function drawGrid() {
    // A quiet background grid so the screen has motion without being loud.
    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    const gap = 42;
    for (let x = -gap; x < state.width + gap; x += gap) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + state.height * 0.34, state.height);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHex(x, y, radius, angle, fill, stroke, lineWidth = 2) {
    // Six points around a circle makes a hexagon. Simple enough, thankfully.
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const pointAngle = angle + TAU * (i / 6);
      const px = x + Math.cos(pointAngle) * radius;
      const py = y + Math.sin(pointAngle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke !== "transparent") {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }

  function burst(x, y, color, count) {
    // Particle burst. Not physics-perfect, just enough juice to feel responsive.
    for (let i = 0; i < count; i += 1) {
      const angle = rand(0, TAU);
      const speed = rand(60, 250);
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: rand(2, 6),
        angle,
        color,
        life: rand(0.25, 0.75),
        maxLife: 0.75
      });
    }
  }

  function pointerPosition(event) {
    // Browser pointer coordinates need to become canvas coordinates.
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  let lastFrame = performance.now();
  function loop(now) {
    // requestAnimationFrame keeps the game synced with the browser's refresh.
    const dt = Math.min(0.033, (now - lastFrame) / 1000);
    lastFrame = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", resize);
  // Pointer events cover mouse, touch, and stylus in one set of handlers.
  canvas.addEventListener("pointerdown", (event) => {
    canvas.setPointerCapture(event.pointerId);
    state.pointerReady = true;
    Object.assign(state.target, pointerPosition(event));
    if (!state.running && !state.paused) start();
  });
  canvas.addEventListener("pointermove", (event) => {
    // V2.0: movement updates even without pressing, so the player becomes the cursor.
    state.pointerReady = true;
    Object.assign(state.target, pointerPosition(event));
    if (!state.running && !state.paused) start();
  });
  canvas.addEventListener("pointerup", () => {
    state.pointerReady = true;
  });
  canvas.addEventListener("pointercancel", () => {
    state.pointerReady = false;
  });

  window.addEventListener("keydown", (event) => {
    // Space starts/pauses, arrows and WASD steer when no pointer is active.
    state.keys.add(event.code);
    if (event.code === "Space") {
      event.preventDefault();
      if (!state.running && !state.paused) start();
      else togglePause();
    }
  });
  window.addEventListener("keyup", (event) => state.keys.delete(event.code));

  startButton.addEventListener("click", () => {
    if (state.paused) {
      state.paused = false;
      overlay.hidden = true;
      pauseButton.textContent = "II";
      pauseButton.setAttribute("aria-label", "Pause game");
    } else {
      overlay.querySelector("h1").textContent = "Hex Rush";
      startButton.textContent = "Play";
      start();
    }
  });
  pauseButton.addEventListener("click", togglePause);

  resize();
  requestAnimationFrame(loop);
})();
