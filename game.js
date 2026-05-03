(() => {
  /*
    Hex Rush V4.0
    2026 eriselizabeth.com
    Updated: 2026-05-03 12:58:59 -04:00

    This is the main game file. It is intentionally plain JavaScript so it can
    be embedded on a website without a build step. I sorta know what I am doing:
    one state object, one animation loop, and a few helper functions that each
    try to do one thing.

    V2.0 changes:
    - got rid of the blue and yellow hexagons
    - the black hexagons now travel in a linear fasion, only on the x and y axis
    - all hexagons entering are 25% faster
    - the main collecter hexagone moves without mouseclicks, it becomes the cursor

    V3 changes:
    - added sound
    - "Digital Adrenaline" Top-Flow pixabay.com
    - hex_audio_intro.mp3 plays first
    - hex_audio_loop.ogg plays in a continuous loop after that

    V3.1 changes:
    - audio skips a bit, how do I fix this?
    - cleaned up the sound into a music controller
    - Web Audio schedules the loop right after the intro when the browser lets me
    - HTML audio is still here as the backup plan because file paths can be picky

    V3.2 changes:
    - reduce volume by 40%
    - increase speed of black hexagons entering another 25%

    V4 changes:
    - I don't even know if this is possable lol
    - if the player looses the game while normal audio is playing, jump to lost audio
    - the lost file starts at the same time position as the file it replaces
    - hex_audio_intro_lost.mp3 leads into hex_audio_loop_lost.ogg
    - play again swaps back to normal audio at the same time on the file
    - fingers crossed let's see
  */

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const scoreNode = document.getElementById("score");
  const bestNode = document.getElementById("best");
  const overlay = document.getElementById("overlay");
  const startButton = document.getElementById("startButton");
  const pauseButton = document.getElementById("pauseButton");
  const introAudio = document.getElementById("introAudio");
  const loopAudio = document.getElementById("loopAudio");
  const introLostAudio = document.getElementById("introLostAudio");
  const loopLostAudio = document.getElementById("loopLostAudio");
  const music = createMusicController(introAudio, loopAudio, introLostAudio, loopLostAudio);

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
    startAudio();
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
    music.lose();
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
      pauseAudio();
      overlay.querySelector("h1").textContent = "Paused";
      overlay.querySelector("p").textContent = "Take a breath. The hexagons will wait.";
      startButton.textContent = "Resume";
      overlay.hidden = false;
    } else {
      resumeAudio();
      overlay.hidden = true;
    }
  }

  function startAudio() {
    // V4: play again swaps back to normal audio at the same time on the file.
    music.playNormal();
  }

  function pauseAudio() {
    // Keep pause simple: the music controller remembers what it was doing.
    music.pause();
  }

  function resumeAudio() {
    music.resume();
  }

  function createMusicController(normalIntro, normalLoop, lostIntro, lostLoop) {
    /*
      V4 music thinking:
      This is the "is this possable lol" part. The answer is yes-ish: if the
      normal and lost files are musically lined up, I can read the current time
      position and start the replacement file at that same position. A tiny
      crossfade hides the switch better than a hard cut.
    */
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const tracks = {
      normal: { intro: normalIntro, loop: normalLoop },
      lost: { intro: lostIntro, loop: lostLoop }
    };
    const buffers = { normal: {}, lost: {} };
    const active = [];
    let context = null;
    let master = null;
    let started = false;
    let paused = false;
    let usingWebAudio = false;
    let mode = "normal";
    let section = "intro";
    let sectionStart = 0;
    let loaded = loadBuffers();

    for (const trackMode of Object.keys(tracks)) {
      tracks[trackMode].intro.volume = 0.6;
      tracks[trackMode].loop.volume = 0.6;
      tracks[trackMode].loop.loop = true;
      tracks[trackMode].intro.addEventListener("ended", () => {
        if (usingWebAudio || mode !== trackMode) return;
        playHtml(trackMode, "loop", 0);
      });
    }

    async function loadBuffers() {
      if (!AudioContextClass) return false;

      try {
        context = new AudioContextClass();
        master = context.createGain();
        master.gain.value = 0.6;
        master.connect(context.destination);

        const entries = [
          ["normal", "intro", normalIntro],
          ["normal", "loop", normalLoop],
          ["lost", "intro", lostIntro],
          ["lost", "loop", lostLoop]
        ];
        const decoded = await Promise.all(entries.map(async ([trackMode, trackSection, element]) => {
          const data = await fetch(element.currentSrc || element.src).then((response) => response.arrayBuffer());
          const buffer = await context.decodeAudioData(data);
          return [trackMode, trackSection, buffer];
        }));
        for (const [trackMode, trackSection, buffer] of decoded) {
          buffers[trackMode][trackSection] = buffer;
        }
        return true;
      } catch {
        // Local file pages can block fetch. The HTML audio fallback is less fancy, but still works.
        context = null;
        return false;
      }
    }

    function currentPosition() {
      if (!started) return { section: "intro", offset: 0 };
      if (!usingWebAudio || !context) {
        const introElement = tracks[mode].intro;
        const loopElement = tracks[mode].loop;
        return introElement.paused && !loopElement.paused
          ? { section: "loop", offset: loopElement.currentTime }
          : { section: "intro", offset: introElement.currentTime };
      }

      const elapsed = Math.max(0, context.currentTime - sectionStart);
      const buffer = buffers[mode][section];
      if (section === "loop" && buffer?.duration) {
        return { section, offset: elapsed % buffer.duration };
      }
      return { section, offset: Math.min(elapsed, buffer?.duration || elapsed) };
    }

    function stopSource(item, when = context?.currentTime || 0) {
      if (!item) return;
      try {
        item.source.stop(when);
      } catch {}
    }

    function clearActive() {
      while (active.length) stopSource(active.pop());
    }

    function makeSource(trackMode, trackSection, offset, when, gainValue) {
      const buffer = buffers[trackMode][trackSection];
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.loop = trackSection === "loop";
      gain.gain.setValueAtTime(gainValue, when);
      source.connect(gain);
      gain.connect(master);
      source.start(when, Math.min(offset, Math.max(0, buffer.duration - 0.01)));
      const item = { source, gain, mode: trackMode, section: trackSection, startTime: when, offset };
      active.push(item);
      source.addEventListener("ended", () => {
        const index = active.indexOf(item);
        if (index >= 0) active.splice(index, 1);
      });
      return item;
    }

    function scheduleWebAudio(trackMode, trackSection, offset, shouldCrossfade) {
      const now = context.currentTime;
      const fade = shouldCrossfade ? 0.22 : 0.01;
      const when = now + 0.02;

      for (const item of active) {
        item.gain.gain.cancelScheduledValues(now);
        item.gain.gain.setValueAtTime(item.gain.gain.value, now);
        item.gain.gain.linearRampToValueAtTime(0, now + fade);
        stopSource(item, now + fade + 0.04);
      }
      active.length = 0;

      const first = makeSource(trackMode, trackSection, offset, when, shouldCrossfade ? 0 : 1);
      first.gain.gain.linearRampToValueAtTime(1, now + fade);
      mode = trackMode;
      section = trackSection;
      sectionStart = when - offset;

      if (trackSection === "intro") {
        const introBuffer = buffers[trackMode].intro;
        const remaining = Math.max(0.01, introBuffer.duration - offset);
        const loopWhen = when + remaining;
        makeSource(trackMode, "loop", 0, loopWhen, 1);
        first.source.addEventListener("ended", () => {
          if (mode === trackMode) {
            section = "loop";
            sectionStart = loopWhen;
          }
        });
      }
    }

    function pauseAllHtml() {
      for (const trackMode of Object.keys(tracks)) {
        tracks[trackMode].intro.pause();
        tracks[trackMode].loop.pause();
      }
    }

    function playHtml(trackMode, trackSection, offset) {
      usingWebAudio = false;
      pauseAllHtml();
      const element = tracks[trackMode][trackSection];
      element.currentTime = Math.min(offset, Math.max(0, (element.duration || offset + 1) - 0.01));
      element.play().catch(() => {
        started = false;
      });
      mode = trackMode;
      section = trackSection;
    }

    async function switchTo(trackMode) {
      const position = currentPosition();
      const targetSection = position.section;
      const targetElement = tracks[trackMode][targetSection];
      const offset = targetElement.duration
        ? position.offset % targetElement.duration
        : position.offset;

      if (!(await loaded) || !context || !buffers[trackMode].intro || !buffers[trackMode].loop) {
        playHtml(trackMode, targetSection, offset);
        return;
      }

      usingWebAudio = true;
      await context.resume();
      pauseAllHtml();
      scheduleWebAudio(trackMode, targetSection, offset, started);
    }

    async function playNormal() {
      if (!started) {
        started = true;
        paused = false;
        await switchTo("normal");
        return;
      }
      paused = false;
      await switchTo("normal");
    }

    async function lose() {
      if (!started || mode === "lost") return;
      await switchTo("lost");
    }

    function pause() {
      if (!started || paused) return;
      paused = true;
      if (usingWebAudio && context) {
        context.suspend();
        return;
      }
      tracks[mode][section].pause();
    }

    function resume() {
      if (!started || !paused) return;
      paused = false;
      if (usingWebAudio && context) {
        context.resume();
        return;
      }
      tracks[mode][section].play().catch(() => {});
    }

    return { playNormal, lose, pause, resume };
  }

  function spawn(type) {
    // New hexagons enter from an edge. V2.0 makes them 25% faster.
    const edge = Math.floor(Math.random() * 4);
    const margin = 40;
    const speedMultiplier = 1.25;
    const blackHexagonSpeedMultiplier = 1.25;
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
      // V3.2: black hexagons entering are another 25% faster.
      const blackBaseSpeed = baseSpeed * blackHexagonSpeedMultiplier;
      // V2.0: black hexagons travel in a linear fasion, only on the x and y axis.
      const speed = rand(blackBaseSpeed * 0.65, blackBaseSpeed);
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
      resumeAudio();
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
