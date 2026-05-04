(() => {
  /*
    Hex Rush V6.9
    2026 eriselizabeth.com
    Updated: 2026-05-03 21:52:28 -04:00

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

    V4.1 changes:
    - game automatically restarts on mobil without tapping anything
    - need to fix this so that it only restarts after clicking
    - ohh, I'm dumb, it must be about the "no need to click" to move the cursur function

    V4.2 changes:
    - if the screen isn't being touched, acts like it should upon game over
    - if the screen is being touched, automatically restarts
    - how to get this to behave on a touchscreen???
    - block the old touch release from becoming a Play Again click

    V5.0 changes:
    - added very muted score in the middle of the screen #8A8A8A
    - changed the texture of the background to a dark honeycomb hex patern muted tones, not overwhelming
    - background #0A0A0A boarders #303030
    - change colors on "play" button and "play again" buttons to #252525
    - changed "play again" to "Again?"

    V5.1 changes:
    - changed center score to #d9d9d9
    - eliminated "score" "best" and "Pause" (you're in or you're out, lol)
    - eliminate "game over" the center score becomes #f5f5f5
    - added a 20% zoom on center score upon a loss
    - added high score: [high_score] below the score on the loss screen, 50% size of actual score
    - moved "Again?" button lower
    - eliminated capital letters throughout the whole thing
    - increased background hexagon size by 300%

    V5.2 changes:
    - upon restarting the game from the "loss" screen
    - the cursor dipped down to the bottom of the screen
    - patched the error by restarting in the middle of the screen

    V6.0 changes:
    - added red circles that slow game play down 25% very 1 for every 22 red hexagon
    - gameplay speeds back up as before from the new point
    - circle hitbox is 50% size of collector hex

    V6.1 changes:
    - changed red circles to dark circles
    - collecttor hexagon spin is increasing too fast, reduced to 7% of before
    - changed entrence screen text to collect dark hexagons / avoid red ones
    - changed all font to Garamond for shits and giggles
    - increased frequency of circles from 1:22 to 1:14
    - dialed down the speed up by 335%

    V6.2 changes:
    - the 35% decrease was a mistake, fixing it

    V6.3 changes:
    - forced mobile devices into landscape (trust me)
    - from the first second of game play, in addition to collecting hexagons, the score automatically goes up 1 point
    - then another point every 5 secons after that
    - increase speed of that score going up by 10% for every 100 poins scored
    - garamond wasnt working, back to the origanal font
    - mobile rotate prompt removed, restored normal mobile behavior
    - mobile landscape browser bar was messing with the game, try fullscreen on play

    V6.5 changes:
    - added a smaller text under high score with the high score person's name
    - added if a person beats the high score, can enter their name in the loss screen
    - will be displayed on the loss screen under [high score]
    - limit 40 charactors, allow all letters, numbers,  and @_():/"'-=+$%#!.,;*&[]{}

    V6.6 changes:
    - high score can load/save from Supabase so all users see the same score
    - localStorage stays as the fallback if database is not available

    V6.7 changes:
    - high score actively retreives from Supabase on load, play, loss, and after saving a name
    - this should stop phone and desktop from living in two seperate high score worlds

    V6.8 changes:
    - database high score/name now displays on the opening screen too
    - added console notes so I can see if Supabase is loading, saving, or failing

    V6.9 changes:
    - moved shared high score into the actual start screen overlay because behind the overlay was dumb, lol
    - added clearer database status notes for when Supabase has no row or is blocked
  */

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const gameShell = document.querySelector(".game-shell");
  const centerScoreNode = document.getElementById("centerScore");
  const highScoreNode = document.getElementById("highScore");
  const highScoreNameNode = document.getElementById("highScoreName");
  const overlay = document.getElementById("overlay");
  const overlayHighScoreNode = document.getElementById("overlayHighScore");
  const overlayHighScoreValueNode = document.getElementById("overlayHighScoreValue");
  const overlayHighScoreNameNode = document.getElementById("overlayHighScoreName");
  const startButton = document.getElementById("startButton");
  const nameForm = document.getElementById("nameForm");
  const nameInput = document.getElementById("nameInput");
  const introAudio = document.getElementById("introAudio");
  const loopAudio = document.getElementById("loopAudio");
  const introLostAudio = document.getElementById("introLostAudio");
  const loopLostAudio = document.getElementById("loopLostAudio");
  const music = createMusicController(introAudio, loopAudio, introLostAudio, loopLostAudio);

  const STORAGE_KEY = "hex-rush-best";
  const NAME_STORAGE_KEY = "hex-rush-best-name";
  const SUPABASE_URL = "https://jurpddzoprhuboxyghau.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1cnBkZHpvcHJodWJveHlnaGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NDcxNzUsImV4cCI6MjA5MzQyMzE3NX0.gAQAYN5Pizs5Hiet9hviGQ16Ph1MDif-uDs1mhFpJvA";
  const SUPABASE_SCORE_ENDPOINT = `${SUPABASE_URL}/rest/v1/hex_rush_score`;
  const SUPABASE_SCORE_ROW = 1;
  const NAME_ALLOWED_PATTERN = /[^A-Za-z0-9 @_():/"'\-=+$%#!.,;*&[\]{}]/g;
  const TAU = Math.PI * 2;
  const SPIN_SCALE = 0.07;
  const SPEED_RAMP_SCALE = 1;
  const SLOW_CIRCLE_FREQUENCY = 14;
  const PASSIVE_SCORE_START = 1;
  const PASSIVE_SCORE_INTERVAL = 5;
  const PASSIVE_SCORE_SPEEDUP = 0.9;
  let lastButtonPointerType = "mouse";

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
    bestName: localStorage.getItem(NAME_STORAGE_KEY) || "",
    usingRemoteScore: false,
    pendingHighScoreName: false,
    time: 0,
    passiveScoreTimer: PASSIVE_SCORE_START,
    gameSpeed: 1,
    redHexagonsSpawned: 0,
    spawnTimer: 0,
    hazardTimer: 0,
    pointerReady: false,
    activePointers: new Set(),
    restartBlockedUntil: 0,
    relativePointer: false,
    lastPointerPosition: null,
    pointerLocked: false,
    keys: new Set(),
    target: { x: 0, y: 0 },
    player: { x: 0, y: 0, radius: 22, angle: 0, speed: 760 },
    entities: [],
    particles: []
  };

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

  function start(options = {}) {
    // Reset all the moving parts back to a fresh run.
    const restartX = state.width / 2;
    const restartY = state.height / 2;
    startAudio();
    state.running = true;
    state.paused = false;
    state.gameOver = false;
    state.score = 0;
    state.time = 0;
    state.passiveScoreTimer = PASSIVE_SCORE_START;
    state.gameSpeed = 1;
    state.redHexagonsSpawned = 0;
    state.spawnTimer = 0;
    state.hazardTimer = 0.7;
    state.entities.length = 0;
    state.particles.length = 0;
    state.player.x = restartX;
    state.player.y = restartY;
    state.player.angle = 0;
    state.target.x = state.player.x;
    state.target.y = state.player.y;
    state.pointerReady = true;
    state.relativePointer = Boolean(options.relativePointer);
    state.lastPointerPosition = options.pointerPosition || null;
    if (options.lockPointer && canvas.requestPointerLock) {
      canvas.requestPointerLock();
    }
    centerScoreNode.textContent = "0";
    highScoreNode.hidden = true;
    highScoreNameNode.hidden = true;
    nameForm.hidden = true;
    state.pendingHighScoreName = false;
    gameShell.classList.remove("is-lost");
    overlay.hidden = true;
  }

  async function endGame() {
    // V6.7: before deciding if this is a new high score, ask the database what it knows.
    if (document.pointerLockElement === canvas) {
      document.exitPointerLock();
    }
    music.lose();
    state.gameOver = true;
    state.running = false;
    if (state.activePointers.size > 0) {
      state.restartBlockedUntil = Infinity;
    }
    await loadRemoteHighScore();
    const beatHighScore = state.score > state.best;
    if (beatHighScore) {
      state.best = state.score;
      saveLocalHighScore();
      state.pendingHighScoreName = true;
    }
    centerScoreNode.textContent = state.score;
    highScoreNode.hidden = false;
    updateHighScoreDisplay();
    nameForm.hidden = !beatHighScore;
    if (beatHighScore) {
      nameInput.value = "";
      setTimeout(() => nameInput.focus({ preventScroll: true }), 0);
    }
    gameShell.classList.add("is-lost");
    overlay.querySelector("h1").textContent = "";
    overlay.querySelector("p").textContent = "";
    startButton.textContent = "again?";
    overlay.hidden = false;
    burst(state.player.x, state.player.y, "#ff4c66", 42);
  }

  function startAudio() {
    // V4: play again swaps back to normal audio at the same time on the file.
    music.playNormal();
  }

  function isTouchDevice() {
    return window.matchMedia?.("(pointer: coarse)").matches;
  }

  function requestFullscreenPlay() {
    // Mobile browser chrome can cover the game in landscape; fullscreen is the best web-safe ask.
    if (!isTouchDevice() || document.fullscreenElement || !gameShell.requestFullscreen) return;
    gameShell.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
  }

  function addScore(points) {
    state.score += points;
    centerScoreNode.textContent = state.score;
  }

  function saveLocalHighScore() {
    localStorage.setItem(STORAGE_KEY, String(state.best));
    localStorage.setItem(NAME_STORAGE_KEY, state.bestName);
  }

  function updateHighScoreDisplay() {
    highScoreNode.textContent = `high score: ${state.best}`;
    highScoreNameNode.textContent = state.bestName;
    highScoreNameNode.hidden = !state.bestName;
    overlayHighScoreValueNode.textContent = `high score: ${state.best}`;
    overlayHighScoreNameNode.textContent = state.bestName;
    overlayHighScoreNameNode.hidden = !state.bestName;
  }

  function showHighScoreDisplay() {
    if (state.gameOver) {
      highScoreNode.hidden = false;
    }
    overlayHighScoreNode.hidden = false;
    updateHighScoreDisplay();
  }

  function supabaseHeaders() {
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    };
  }

  async function loadRemoteHighScore() {
    try {
      const response = await fetch(`${SUPABASE_SCORE_ENDPOINT}?id=eq.${SUPABASE_SCORE_ROW}&select=high_score,player_name`, {
        headers: supabaseHeaders()
      });
      if (!response.ok) throw new Error("score load failed");
      const rows = await response.json();
      const row = rows[0];
      if (!row) {
        state.usingRemoteScore = false;
        console.warn("[hex rush] Supabase connected, but row id 1 was not found in hex_rush_score");
        showHighScoreDisplay();
        return;
      }
      state.best = Number(row.high_score || 0);
      state.bestName = row.player_name || "";
      state.usingRemoteScore = true;
      saveLocalHighScore();
      console.info("[hex rush] Supabase high score loaded", {
        highScore: state.best,
        playerName: state.bestName || "(no name yet)"
      });
      if (!state.running || state.gameOver || !highScoreNode.hidden) {
        showHighScoreDisplay();
      }
    } catch (error) {
      state.usingRemoteScore = false;
      console.warn("[hex rush] Supabase high score could not load, using this browser's saved score", error);
      if (!state.running || state.gameOver || !highScoreNode.hidden) {
        showHighScoreDisplay();
      }
    }
  }

  async function saveRemoteHighScore() {
    if (!state.usingRemoteScore) {
      await loadRemoteHighScore();
      if (!state.usingRemoteScore) {
        console.warn("[hex rush] Supabase save skipped because the database is not connected right now");
        return;
      }
    }
    try {
      const response = await fetch(`${SUPABASE_SCORE_ENDPOINT}?id=eq.${SUPABASE_SCORE_ROW}&high_score=lt.${state.best}`, {
        method: "PATCH",
        headers: supabaseHeaders(),
        body: JSON.stringify({
          high_score: state.best,
          player_name: state.bestName,
          updated_at: new Date().toISOString()
        })
      });
      if (!response.ok) throw new Error("score save failed");
      console.info("[hex rush] Supabase high score save attempted", {
        highScore: state.best,
        playerName: state.bestName || "(no name yet)"
      });
      await loadRemoteHighScore();
    } catch (error) {
      state.usingRemoteScore = false;
      console.warn("[hex rush] Supabase high score could not save", error);
    }
  }

  function cleanHighScoreName(value) {
    return value.replace(NAME_ALLOWED_PATTERN, "").slice(0, 40);
  }

  function saveHighScoreName() {
    if (!state.pendingHighScoreName) return;
    const cleaned = cleanHighScoreName(nameInput.value);
    if (!cleaned) return;
    state.bestName = cleaned;
    saveLocalHighScore();
    updateHighScoreDisplay();
    nameForm.hidden = true;
    state.pendingHighScoreName = false;
    saveRemoteHighScore();
  }

  function passiveScoreInterval() {
    const steps = Math.floor(state.score / 100);
    return PASSIVE_SCORE_INTERVAL * (PASSIVE_SCORE_SPEEDUP ** steps);
  }

  function canAutoStart() {
    // V4.1: pointer movement can start the first game, but Play Again needs an actual click/tap.
    return !state.running && !state.paused && !state.gameOver;
  }

  function canClickRestart() {
    // V4.2: if game over happens while a finger is still down, ignore that old release/click.
    return performance.now() >= state.restartBlockedUntil;
  }

  function releasePointer(pointerId) {
    state.activePointers.delete(pointerId);
    if (state.gameOver && state.activePointers.size === 0) {
      state.restartBlockedUntil = performance.now() + 450;
    }
  }

  function updatePointerTarget(event) {
    const position = pointerPosition(event);
    if (state.pointerLocked) {
      state.player.x = clamp(state.player.x + event.movementX, state.player.radius, state.width - state.player.radius);
      state.player.y = clamp(state.player.y + event.movementY, state.player.radius, state.height - state.player.radius);
      state.target.x = state.player.x;
      state.target.y = state.player.y;
      state.pointerReady = true;
      return;
    }
    if (state.relativePointer) {
      if (state.lastPointerPosition) {
        const dx = position.x - state.lastPointerPosition.x;
        const dy = position.y - state.lastPointerPosition.y;
        state.target.x = clamp(state.target.x + dx, state.player.radius, state.width - state.player.radius);
        state.target.y = clamp(state.target.y + dy, state.player.radius, state.height - state.player.radius);
      }
      state.lastPointerPosition = position;
      state.pointerReady = true;
      return;
    }
    state.pointerReady = true;
    Object.assign(state.target, position);
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
    const size = type === "hazard" ? rand(15, 28) : type === "slowCircle" ? rand(15, 24) : rand(13, 23);
    let x = rand(-margin, state.width + margin);
    let y = rand(-margin, state.height + margin);
    if (edge === 0) y = -margin;
    if (edge === 1) x = state.width + margin;
    if (edge === 2) y = state.height + margin;
    if (edge === 3) x = -margin;

    const baseSpeed = (70 + Math.min(170, state.time * 4 * SPEED_RAMP_SCALE)) * speedMultiplier;
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
      hitRadius: type === "slowCircle" ? state.player.radius * 0.5 : size,
      vx,
      vy,
      angle: rand(0, TAU),
      spin: rand(-2.8, 2.8)
    });
  }

  function update(dt) {
    // dt means "delta time": how many seconds passed since the last frame.
    if (!state.running || state.paused) return;
    const gameDt = dt * state.gameSpeed;
    state.time += gameDt;
    state.player.angle += gameDt * (3.5 + state.score * 0.015) * SPIN_SCALE;

    movePlayer(gameDt);
    updatePassiveScore(gameDt);

    state.spawnTimer -= gameDt;
    state.hazardTimer -= gameDt;
    if (state.spawnTimer <= 0) {
      spawn("score");
      state.spawnTimer = Math.max(0.18, 0.62 - state.time * 0.008 * SPEED_RAMP_SCALE);
    }
    if (state.hazardTimer <= 0) {
      spawn("hazard");
      state.redHexagonsSpawned += 1;
      if (state.redHexagonsSpawned % SLOW_CIRCLE_FREQUENCY === 0) {
        spawn("slowCircle");
      }
      state.hazardTimer = Math.max(0.38, 1.15 - state.time * 0.01 * SPEED_RAMP_SCALE);
    }

    updateEntities(gameDt);
    updateParticles(gameDt);
  }

  function updatePassiveScore(dt) {
    state.passiveScoreTimer -= dt;
    while (state.passiveScoreTimer <= 0) {
      addScore(1);
      state.passiveScoreTimer += passiveScoreInterval();
    }
  }

  function movePlayer(dt) {
    // V2.0: the main collecter hexagone becomes the cursor, no mouseclick needed.
    if (state.pointerLocked) return;

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

      const distance = Math.hypot(entity.x - player.x, entity.y - player.y);
      if (entity.type === "slowCircle" && distance < entity.hitRadius) {
        state.gameSpeed *= 0.75;
        burst(entity.x, entity.y, "#20242d", 18);
        state.entities.splice(i, 1);
        continue;
      }

      if (distance < entity.hitRadius + player.radius * 0.72) {
        if (entity.type === "hazard") {
          endGame();
          return;
        }
        addScore(10 + Math.floor(state.time / 12));
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
      if (entity.type === "slowCircle") {
        drawCircle(entity.x, entity.y, entity.radius, "#20242d", "rgba(255,255,255,0.72)");
      } else {
        drawHex(entity.x, entity.y, entity.radius, entity.angle, color, entity.type === "score" ? "#eef2f7" : "rgba(255,255,255,0.72)");
      }
    }

    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      drawHex(p.x, p.y, p.radius, p.angle, p.color, "transparent");
      ctx.globalAlpha = 1;
    }

    drawHex(state.player.x, state.player.y, state.player.radius, state.player.angle, "#05070a", "#ffffff", 3);
  }

  function drawGrid() {
    // V5.1: background hexagon size increased by 300%.
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.strokeStyle = "#303030";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#0A0A0A";
    ctx.fillRect(0, 0, state.width, state.height);

    const radius = 96;
    const hexWidth = Math.sqrt(3) * radius;
    const rowHeight = radius * 1.5;
    for (let y = -radius; y < state.height + radius; y += rowHeight) {
      const row = Math.round((y + radius) / rowHeight);
      const offset = row % 2 === 0 ? 0 : hexWidth / 2;
      for (let x = -hexWidth; x < state.width + hexWidth; x += hexWidth) {
        drawHexOutline(x + offset, y, radius);
      }
    }
    ctx.restore();
  }

  function drawHexOutline(x, y, radius) {
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const pointAngle = Math.PI / 6 + TAU * (i / 6);
      const px = x + Math.cos(pointAngle) * radius;
      const py = y + Math.sin(pointAngle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
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

  function drawCircle(x, y, radius, fill, stroke) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
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
  document.addEventListener("fullscreenchange", resize);
  document.addEventListener("webkitfullscreenchange", resize);
  document.addEventListener("pointerlockchange", () => {
    state.pointerLocked = document.pointerLockElement === canvas;
    state.relativePointer = state.pointerLocked || state.relativePointer;
  });
  // Pointer events cover mouse, touch, and stylus in one set of handlers.
  canvas.addEventListener("pointerdown", (event) => {
    canvas.setPointerCapture(event.pointerId);
    state.activePointers.add(event.pointerId);
    updatePointerTarget(event);
    if (canAutoStart()) start();
  });
  canvas.addEventListener("pointermove", (event) => {
    // V2.0: movement updates even without pressing, so the player becomes the cursor.
    // V4.1: after losing, this can move the cursor but cannot restart the game by itself.
    updatePointerTarget(event);
    if (canAutoStart()) start();
  });
  canvas.addEventListener("pointerup", (event) => {
    releasePointer(event.pointerId);
    state.pointerReady = true;
  });
  canvas.addEventListener("pointercancel", (event) => {
    releasePointer(event.pointerId);
    state.pointerReady = false;
  });

  window.addEventListener("keydown", (event) => {
    // Space starts, arrows and WASD steer when no pointer is active.
    state.keys.add(event.code);
    if (event.code === "Space") {
      event.preventDefault();
      if (canAutoStart() || state.gameOver) start();
    }
  });
  window.addEventListener("keyup", (event) => state.keys.delete(event.code));

  startButton.addEventListener("pointerdown", (event) => {
    lastButtonPointerType = event.pointerType || "mouse";
  });
  nameInput.addEventListener("input", () => {
    const cleaned = cleanHighScoreName(nameInput.value);
    if (nameInput.value !== cleaned) nameInput.value = cleaned;
  });
  nameForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveHighScoreName();
  });
  startButton.addEventListener("click", (event) => {
    saveHighScoreName();
    if (state.gameOver && !canClickRestart()) return;
    requestFullscreenPlay();
    const pointerStart = pointerPosition(event);
    const useRelativePointer = lastButtonPointerType === "mouse";
    overlay.querySelector("h1").textContent = "hex rush";
    overlay.querySelector("p").innerHTML = "collect dark hexagons<br>avoid red ones";
    startButton.textContent = "play";
    start({
      relativePointer: useRelativePointer,
      pointerPosition: pointerStart,
      lockPointer: useRelativePointer
    });
    loadRemoteHighScore();
  });

  resize();
  loadRemoteHighScore();
  requestAnimationFrame(loop);
})();
