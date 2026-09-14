(() => {
  "use strict";

  const splashScreen = document.getElementById("splashScreen");
  const splashStartBtn = document.getElementById("splashStartBtn");
  const gameShell = document.getElementById("gameShell");
  const canvas = document.getElementById("game");
  let ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const shotsEl = document.getElementById("shots");
  const savePctEl = document.getElementById("savePct");
  const bestEl = document.getElementById("best");
  const levelEl = document.getElementById("level");
  const overlay = document.getElementById("overlay");
  const overlayEyebrow = document.getElementById("overlayEyebrow");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayCopy = document.getElementById("overlayCopy");
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const pauseOverlay = document.getElementById("pauseOverlay");
  const resumeBtn = document.getElementById("resumeBtn");
  const controlsPad = document.getElementById("controlsPad");
  const soundBtn = document.getElementById("soundBtn");
  const themeMusic = document.getElementById("themeMusic");
  const milestoneStats = document.getElementById("milestoneStats");
  const milestoneSaves = document.getElementById("milestoneSaves");
  const milestoneShots = document.getElementById("milestoneShots");
  const milestoneRate = document.getElementById("milestoneRate");
  const milestoneBadge = document.getElementById("milestoneBadge");
  const milestoneBadgeText = document.getElementById("milestoneBadgeText");
  const milestoneBest = document.getElementById("milestoneBest");
  const nextStage = document.getElementById("nextStage");
  const levelToast = document.getElementById("levelToast");
  const levelToastTitle = document.getElementById("levelToastTitle");
  const levelToastCopy = document.getElementById("levelToastCopy");
  const controlThumb = document.getElementById("controlThumb");

  const W = canvas.width;
  const H = canvas.height;
  const STATIC_LAYER = document.createElement("canvas");
  STATIC_LAYER.width = W;
  STATIC_LAYER.height = H;
  const STATIC_CTX = STATIC_LAYER.getContext("2d");

  // Core gameplay: keep one decisive shot at a time, but let the attack build through passes.
  const BALL_RADIUS = 14;
  const FIELD_LEFT = 18;
  const FIELD_RIGHT = W - 18;
  const GOAL_LINE_Y = H - 52;
  const GOAL_FRONT_Y = GOAL_LINE_Y;
  const START_SPEED = 345;
  const MAX_SPEED = 565;
  const SPEED_GAIN_PER_CATCH = 9;
  const NEXT_PLAY_DELAY_MS = 260;
  const DIRECT_BUILD_MS = 570;
  const PASS_DURATION_MS = 360;
  const RECEIVE_MS = 170;
  const SHOT_WINDUP_MS = 180;
  const WIDE_SHOT_CHANCE = 0.12;
  const SHOTS_PER_LEVEL = 5;
  const MAX_LEVEL = 12;
  const LEVEL_TRANSITION_MS = 1050;
  const ATTACK_RUN_MS = 520;
  const DRIBBLE_CYCLE_MS = 250;
  const DRIBBLE_MIN_LEAD = 5;
  const DRIBBLE_MAX_LEAD = 12;
  const FRAME_INTERVAL_MS = 16.6;

  const PENALTY_AREA_WIDTH = W * 0.72;
  const PENALTY_AREA_TOP = H * 0.58;
  const GOAL_AREA_WIDTH = W * 0.43;
  const GOAL_AREA_TOP = H * 0.79;
  const GOAL_WIDTH = W * 0.50;
  const GOAL_LEFT = W / 2 - GOAL_WIDTH / 2;
  const GOAL_RIGHT = W / 2 + GOAL_WIDTH / 2;

  const KEEPER_Y = GOAL_LINE_Y - 34;
  const KEEPER_HALF_WIDTH = 25;
  const KEEPER_MIN_X = GOAL_LEFT + KEEPER_HALF_WIDTH;
  const KEEPER_MAX_X = GOAL_RIGHT - KEEPER_HALF_WIDTH;
  const KEYBOARD_SPEED = 470;
  const SAVE_CONTACT_Y = KEEPER_Y - 7;


  // Lightweight environment skins: gameplay geometry stays identical while the arena changes by level.
  const LEVEL_THEMES = [
    { name: "CLASSIC GREEN", surface: "grass", backdrop: "classic", top: "#42c936", mid: "#2fac2f", bottom: "#239329", line: "rgba(250,255,237,.92)", goalLine: "rgba(250,255,239,.58)", stripeA: "rgba(190,255,87,.10)", stripeB: "rgba(0,76,31,.13)", accent: "#dfff24", secondary: "#19e6ce" },
    { name: "NIGHT TRAINING", surface: "grass", backdrop: "night", top: "#259c36", mid: "#197b34", bottom: "#105c30", line: "rgba(240,255,241,.90)", goalLine: "rgba(230,255,238,.56)", stripeA: "rgba(173,255,104,.06)", stripeB: "rgba(0,30,28,.12)", accent: "#bfff2a", secondary: "#43dce8" },
    { name: "ROOFTOP CITY", surface: "court", backdrop: "city", top: "#25384b", mid: "#1c2d40", bottom: "#142233", line: "rgba(231,246,255,.92)", goalLine: "rgba(220,241,255,.62)", stripeA: "rgba(255,255,255,.026)", stripeB: "rgba(0,0,0,.07)", accent: "#ff58c7", secondary: "#35e2ff" },
    { name: "CYBER TUNNEL", surface: "lane", backdrop: "tunnel", top: "#183640", mid: "#122c36", bottom: "#0c222b", line: "rgba(222,248,255,.94)", goalLine: "rgba(204,239,255,.68)", stripeA: "rgba(67,225,255,.025)", stripeB: "rgba(0,0,0,.055)", accent: "#dfff24", secondary: "#31dfff" },
    { name: "ORBITAL DECK", surface: "hex", backdrop: "space", top: "#15343b", mid: "#112b32", bottom: "#0b2028", line: "rgba(222,255,192,.92)", goalLine: "rgba(239,255,204,.62)", stripeA: "rgba(255,255,255,.018)", stripeB: "rgba(0,0,0,.05)", accent: "#cfff29", secondary: "#59e7ff" },
    { name: "HYPERGRID", surface: "grid", backdrop: "synth", top: "#102846", mid: "#10203c", bottom: "#10172f", line: "rgba(100,236,255,.95)", goalLine: "rgba(104,233,255,.68)", stripeA: "rgba(0,179,255,.022)", stripeB: "rgba(255,44,196,.025)", accent: "#ff4bd8", secondary: "#27e7ff" },
    { name: "CITY AFTER RAIN", surface: "court", backdrop: "city", top: "#283346", mid: "#1c2939", bottom: "#111d2a", line: "rgba(234,248,255,.92)", goalLine: "rgba(220,244,255,.60)", stripeA: "rgba(51,228,255,.025)", stripeB: "rgba(255,74,189,.024)", accent: "#5ce7ff", secondary: "#ff5abf" },
    { name: "DEEP TUNNEL", surface: "lane", backdrop: "tunnel", top: "#12343c", mid: "#0d2932", bottom: "#081d25", line: "rgba(221,253,255,.94)", goalLine: "rgba(191,240,255,.66)", stripeA: "rgba(223,255,36,.02)", stripeB: "rgba(0,0,0,.06)", accent: "#7dff5a", secondary: "#1fcbe7" },
    { name: "LUNAR STATION", surface: "hex", backdrop: "space", top: "#1b313c", mid: "#142833", bottom: "#0d1e27", line: "rgba(235,255,205,.93)", goalLine: "rgba(228,255,198,.62)", stripeA: "rgba(168,210,255,.018)", stripeB: "rgba(0,0,0,.05)", accent: "#e7ff42", secondary: "#8fc9ff" },
    { name: "NEON SUNSET", surface: "grid", backdrop: "synth", top: "#172449", mid: "#191e3d", bottom: "#16162f", line: "rgba(78,229,255,.96)", goalLine: "rgba(83,228,255,.68)", stripeA: "rgba(255,65,191,.03)", stripeB: "rgba(0,185,255,.02)", accent: "#ff5ac8", secondary: "#38e9ff" },
    { name: "ZERO-G ARENA", surface: "hex", backdrop: "space", top: "#102d35", mid: "#0d252d", bottom: "#081a21", line: "rgba(226,255,190,.94)", goalLine: "rgba(230,255,197,.64)", stripeA: "rgba(223,255,36,.02)", stripeB: "rgba(0,0,0,.055)", accent: "#dfff24", secondary: "#29efff" },
    { name: "FINAL CIRCUIT", surface: "grid", backdrop: "final", top: "#132b3f", mid: "#112235", bottom: "#0a1727", line: "rgba(229,255,217,.96)", goalLine: "rgba(229,255,217,.68)", stripeA: "rgba(223,255,36,.025)", stripeB: "rgba(25,230,206,.018)", accent: "#dfff24", secondary: "#19e6ce" }
  ];

  function currentTheme() {
    return LEVEL_THEMES[Math.min(currentLevel - 1, LEVEL_THEMES.length - 1)];
  }

  let running = false;
  let lastTime = 0;
  let lastRenderTime = 0;
  let score = 0;
  let shotsOnTarget = 0;
  let goalsConceded = 0;
  let balls = [];
  let play = null;
  let nextPlayAt = 0;
  let caughtFlash = [];
  let wideFlash = null;
  let concededFlash = null;
  let netImpact = null;
  let keeperX = W / 2;
  let pointerActive = false;
  let currentLevel = 1;
  let levelStartScore = 0;
  let levelStartShots = 0;
  let bestAtRunStart = 0;
  let musicMuted = false;
  let paused = false;
  let pauseStartedAt = 0;
  let levelTransitionTimer = 0;
  let levelToastTimer = 0;
  let overlayAction = "restart";
  const keys = { left: false, right: false };

  let best = Number(localStorage.getItem("saveTheLineBest") || 0);
  bestEl.textContent = String(best).padStart(3, "0");
  themeMusic.volume = 0.18;

  function setMusicMode(mode) {
    if (musicMuted) return;
    themeMusic.volume = mode === "milestone" ? 0.31 : 0.18;
  }

  function ensureMusic() {
    if (musicMuted) return;
    setMusicMode("game");
    const playPromise = themeMusic.play();
    if (playPromise && typeof playPromise.catch === "function") playPromise.catch(() => {});
  }

  function setMilestoneUi(visible, isFinal = false) {
    overlay.dataset.milestone = visible ? "true" : "false";
    overlay.dataset.final = visible && isFinal ? "true" : "false";
    milestoneStats.hidden = !visible;
    milestoneBadge.hidden = !visible;
    nextStage.hidden = !visible;
    if (!visible) milestoneBest.hidden = true;
  }

  function performanceLabel(savePercentage) {
    if (savePercentage === 100) return "CLEAN SHEET";
    if (savePercentage >= 80) return "WALL MODE";
    if (savePercentage >= 60) return "STILL STANDING";
    return "UNDER PRESSURE";
  }

  function nextStageCopy(completedLevel) {
    if (completedLevel >= MAX_LEVEL) return `${MAX_LEVEL * SHOTS_PER_LEVEL} SHOTS FACED · RUN COMPLETE`;
    if (completedLevel === 1) return "NEXT: FASTER RELEASES";
    if (completedLevel === 2) return "NEXT: MORE CURVE + BUILD-UP";
    if (completedLevel === 3) return "NEXT: MORE ATTACKING VARIETY";
    if (completedLevel < 8) return `NEXT: LEVEL ${completedLevel + 1} · PRESSURE RISING`;
    return `NEXT: LEVEL ${completedLevel + 1} · ELITE PRESSURE`;
  }

  function level() {
    return currentLevel;
  }

  function updateLevel() {
    levelEl.textContent = String(level());
  }


  function hideLevelToast() {
    clearTimeout(levelToastTimer);
    levelToast.dataset.visible = "false";
    levelToastTimer = window.setTimeout(() => { levelToast.hidden = true; }, 180);
  }

  function showLevelToast() {
    clearTimeout(levelToastTimer);
    levelToastTitle.textContent = `LEVEL ${currentLevel}`;
    levelToastCopy.textContent = currentTheme().name;
    levelToast.hidden = false;
    requestAnimationFrame(() => { levelToast.dataset.visible = "true"; });
    levelToastTimer = window.setTimeout(hideLevelToast, 1050);
  }

  function updatePerformanceHud() {
    scoreEl.textContent = String(score).padStart(3, "0");
    shotsEl.textContent = String(shotsOnTarget).padStart(3, "0");
    const savePercentage = shotsOnTarget ? Math.round((score / shotsOnTarget) * 100) : 100;
    savePctEl.textContent = `${savePercentage}%`;
  }

  function currentSpeed() {
    return Math.min(MAX_SPEED, START_SPEED + score * SPEED_GAIN_PER_CATCH);
  }

  function resetGame() {
    clearTimeout(levelTransitionTimer);
    clearTimeout(levelToastTimer);
    running = true;
    paused = false;
    score = 0;
    shotsOnTarget = 0;
    goalsConceded = 0;
    currentLevel = 1;
    levelStartScore = 0;
    levelStartShots = 0;
    bestAtRunStart = best;
    overlayAction = "restart";
    balls = [];
    play = null;
    caughtFlash = [];
    wideFlash = null;
    concededFlash = null;
    netImpact = null;
    keeperX = W / 2;
    controlsPad.style.setProperty("--control-ratio", "0.5");
    pointerActive = false;
    keys.left = false;
    keys.right = false;
    updatePerformanceHud();
    updateLevel();
    buildStaticLayer();
    levelToast.hidden = true;
    levelToast.dataset.visible = "false";
    overlayEyebrow.textContent = "GOALKEEPER ARCADE";
    overlayTitle.textContent = "Save the line!";
    overlayCopy.textContent = "Read the build-up, track the final shot and cover the goal. Every on-target shot counts.";
    startBtn.textContent = "START RUN";
    startBtn.hidden = false;
    pauseBtn.disabled = false;
    pauseBtn.setAttribute("aria-pressed", "false");
    pauseBtn.textContent = "Ⅱ PAUSE";
    pauseOverlay.hidden = true;
    setMilestoneUi(false);
    overlay.hidden = true;
    ensureMusic();

    const now = performance.now();
    nextPlayAt = now + 360;
    lastTime = now;
    lastRenderTime = 0;
    requestAnimationFrame(loop);
  }

  function createAttackers(count) {
    const slots = [
      { x: W * 0.28, y: H * 0.14 },
      { x: W * 0.68, y: H * 0.18 },
      { x: W * 0.47, y: H * 0.27 }
    ];

    // Spawn high enough to let the attack visibly run toward goal before the decisive action.
    slots.sort(() => Math.random() - 0.5);
    return slots.slice(0, count).map((slot, i) => {
      const startY = slot.y + (Math.random() - 0.5) * 14;
      return {
        x: slot.x + (Math.random() - 0.5) * 22,
        y: startY,
        startY,
        runTargetY: 0,
        phase: Math.random() * Math.PI * 2,
        jersey: i === 2 ? "blue" : "white"
      };
    });
  }

  function attackProfile() {
    if (currentLevel === 1) return { passChance: 0, threeChance: 0, runMin: 44, runMax: 76, curveChance: 0, curveMin: 0, curveMax: 0 };
    if (currentLevel === 2) return { passChance: 0.36, threeChance: 0, runMin: 58, runMax: 96, curveChance: 0.12, curveMin: 10, curveMax: 18 };
    if (currentLevel === 3) return { passChance: 0.58, threeChance: 0.26, runMin: 72, runMax: 118, curveChance: 0.28, curveMin: 14, curveMax: 25 };

    const extra = currentLevel - 4;
    return {
      passChance: Math.min(0.88, 0.74 + extra * 0.02),
      threeChance: Math.min(0.60, 0.42 + extra * 0.025),
      runMin: Math.min(110, 86 + extra * 3),
      runMax: Math.min(162, 138 + extra * 3),
      curveChance: Math.min(0.60, 0.44 + extra * 0.02),
      curveMin: Math.min(24, 18 + extra * 0.75),
      curveMax: Math.min(38, 32 + extra * 0.75)
    };
  }

  function assignAttackerRuns(players, shooterIndex) {
    const profile = attackProfile();
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const extra = i === shooterIndex ? 18 : 0;
      player.runTargetY = Math.min(H * 0.61, player.startY + profile.runMin + Math.random() * (profile.runMax - profile.runMin) + extra);
      player.y = player.startY;
    }
  }

  function updateAttackerRuns(now) {
    if (!play || play.phase === "shot" || play.phase === "windup") return;
    const progress = Math.min(1, (now - play.startedAt) / ATTACK_RUN_MS);
    const eased = 1 - Math.pow(1 - progress, 2);
    for (const player of play.players) {
      player.y = player.startY + (player.runTargetY - player.startY) * eased;
    }
  }

  function spawnPlay(now) {
    const profile = attackProfile();
    const usePass = currentLevel > 1 && Math.random() < profile.passChance;
    const count = usePass ? (Math.random() < profile.threeChance ? 3 : 2) : 1;
    const players = createAttackers(count);

    if (!usePass) {
      assignAttackerRuns(players, 0);
      play = {
        players,
        phase: "direct",
        phaseStarted: now,
        startedAt: now,
        passerIndex: 0,
        shooterIndex: 0
      };
      return;
    }

    // Pick the lower player as shooter often: visually reads as progressive build-up toward goal.
    let shooterIndex = 0;
    for (let i = 1; i < players.length; i++) {
      if (players[i].y > players[shooterIndex].y) shooterIndex = i;
    }
    let passerIndex = shooterIndex === 0 ? 1 : 0;
    if (players.length === 3 && Math.random() < 0.45) {
      passerIndex = [0, 1, 2].filter((i) => i !== shooterIndex)[Math.floor(Math.random() * 2)];
    }

    assignAttackerRuns(players, shooterIndex);
    play = {
      players,
      phase: "pass",
      phaseStarted: now,
      startedAt: now,
      passerIndex,
      shooterIndex
    };
  }

  function beginShotWindup(now) {
    if (!play) return;
    play.phase = "windup";
    play.phaseStarted = now;
  }

  function releaseShot(now) {
    if (!play) return;
    const shooter = play.players[play.shooterIndex];
    const spawnX = shooter.x;
    const spawnY = shooter.y + 31;
    const isWide = Math.random() < WIDE_SHOT_CHANCE;

    let targetX;
    if (isWide) {
      const missLeft = Math.random() < 0.5;
      const missDistance = 16 + Math.random() * 28;
      targetX = missLeft ? GOAL_LEFT - missDistance : GOAL_RIGHT + missDistance;
      targetX = Math.max(FIELD_LEFT + BALL_RADIUS, Math.min(FIELD_RIGHT - BALL_RADIUS, targetX));
    } else {
      const targetPadding = KEEPER_HALF_WIDTH + BALL_RADIUS * 0.35;
      targetX = GOAL_LEFT + targetPadding + Math.random() * (GOAL_WIDTH - targetPadding * 2);
    }

    const targetY = GOAL_LINE_Y + BALL_RADIUS + 4;
    const directDistance = Math.hypot(targetX - spawnX, targetY - spawnY);
    const duration = directDistance / currentSpeed();

    // Early levels stay straight; later levels progressively add readable curve.
    const profile = attackProfile();
    let bend = currentLevel === 1 ? 0 : (Math.random() - 0.5) * 5;
    if (Math.random() < profile.curveChance) {
      const side = Math.random() < 0.5 ? -1 : 1;
      bend = side * (profile.curveMin + Math.random() * (profile.curveMax - profile.curveMin));
    }

    balls.push({
      x: spawnX,
      y: spawnY,
      startX: spawnX,
      startY: spawnY,
      controlX: (spawnX + targetX) * 0.5 + bend,
      controlY: (spawnY + targetY) * 0.5,
      targetX,
      targetY,
      t: 0,
      duration,
      isWide,
      saveChecked: false
    });

    play.phase = "shot";
    play.phaseStarted = now;
  }

  function loop(now) {
    if (!running) return;
    if (paused) {
      lastTime = now;
      draw(pauseStartedAt);
      requestAnimationFrame(loop);
      return;
    }
    if (lastRenderTime) {
      const frameElapsed = now - lastRenderTime;
      if (frameElapsed < FRAME_INTERVAL_MS) {
        requestAnimationFrame(loop);
        return;
      }
      lastRenderTime = now - (frameElapsed % FRAME_INTERVAL_MS);
    } else {
      lastRenderTime = now;
    }
    const dt = Math.min((now - lastTime) / 1000, 0.035);
    lastTime = now;
    update(now, dt);
    draw(now);
    if (running) requestAnimationFrame(loop);
  }

  function update(now, dt) {
    updateKeeper(dt);
    updateAttackerRuns(now);

    if (balls.length === 0 && !play && now >= nextPlayAt) spawnPlay(now);

    if (play && balls.length === 0) {
      const elapsed = now - play.phaseStarted;
      if (play.phase === "direct" && elapsed >= Math.max(DIRECT_BUILD_MS, ATTACK_RUN_MS)) {
        beginShotWindup(now);
      } else if (play.phase === "pass" && elapsed >= Math.max(PASS_DURATION_MS, ATTACK_RUN_MS * 0.72)) {
        play.phase = "receive";
        play.phaseStarted = now;
      } else if (play.phase === "receive" && elapsed >= RECEIVE_MS) {
        beginShotWindup(now);
      } else if (play.phase === "windup" && elapsed >= SHOT_WINDUP_MS) {
        releaseShot(now);
      }
    }

    for (let i = balls.length - 1; i >= 0; i--) {
      const ball = balls[i];
      const previousY = ball.y;
      ball.t = Math.min(1, ball.t + dt / ball.duration);
      const point = quadraticPoint(ball, ball.t);
      ball.x = point.x;
      ball.y = point.y;

      if (!ball.saveChecked && previousY < SAVE_CONTACT_Y && ball.y >= SAVE_CONTACT_Y) {
        ball.saveChecked = true;
        if (keeperCanSave(ball)) {
          catchBall(ball, now);
          continue;
        }
      }

      if (ball.t >= 1 || ball.y - BALL_RADIUS > GOAL_LINE_Y + 9) {
        if (ball.isWide || ball.x < GOAL_LEFT - BALL_RADIUS * 0.2 || ball.x > GOAL_RIGHT + BALL_RADIUS * 0.2) {
          letWideShotGo(ball, now);
        } else {
          concedeGoal(ball, now);
          continue;
        }
      }
    }

    caughtFlash = caughtFlash.filter((f) => now - f.started < 290);
    if (wideFlash && now - wideFlash.started >= 430) wideFlash = null;
    if (concededFlash && now - concededFlash.started >= 430) concededFlash = null;
    if (netImpact && now - netImpact.started >= 360) netImpact = null;
  }

  function updateKeeper(dt) {
    if (pointerActive) return;
    let direction = 0;
    if (keys.left && !keys.right) direction = -1;
    if (keys.right && !keys.left) direction = 1;
    keeperX += direction * KEYBOARD_SPEED * dt;
    keeperX = Math.max(KEEPER_MIN_X, Math.min(KEEPER_MAX_X, keeperX));
  }

  function quadraticPoint(ball, t) {
    const mt = 1 - t;
    return {
      x: mt * mt * ball.startX + 2 * mt * t * ball.controlX + t * t * ball.targetX,
      y: mt * mt * ball.startY + 2 * mt * t * ball.controlY + t * t * ball.targetY
    };
  }

  function keeperCanSave(ball) {
    return Math.abs(ball.x - keeperX) <= KEEPER_HALF_WIDTH + BALL_RADIUS * 0.5;
  }

  function stopControls() {
    pointerActive = false;
    controlsPad.dataset.active = "false";
    keys.left = false;
    keys.right = false;
  }

  function showLevelOverlay(completedLevel) {
    clearTimeout(levelTransitionTimer);
    running = false;
    stopControls();
    balls = [];
    play = null;

    const isFinal = completedLevel >= MAX_LEVEL;
    const savePercentage = shotsOnTarget ? Math.round((score / shotsOnTarget) * 100) : 100;
    const levelSaves = score - levelStartScore;
    const levelShots = shotsOnTarget - levelStartShots;
    const levelRate = levelShots ? Math.round((levelSaves / levelShots) * 100) : 100;

    overlayEyebrow.textContent = isFinal ? "GOALKEEPER CHALLENGE" : `LEVEL ${completedLevel} COMPLETE`;
    overlayTitle.textContent = isFinal ? "Challenge complete!" : "Level up!";
    overlayCopy.textContent = isFinal
      ? `${performanceLabel(savePercentage)} · You faced the full run.`
      : `${performanceLabel(levelRate)} · ${levelSaves} saves from ${levelShots} shots in this stage.`;

    milestoneSaves.textContent = String(score).padStart(2, "0");
    milestoneShots.textContent = String(shotsOnTarget).padStart(2, "0");
    milestoneRate.textContent = `${savePercentage}%`;
    milestoneBadgeText.textContent = savePercentage === 100 ? "PERFECT WALL" : (isFinal ? "SUCCESS" : "CHECKPOINT");
    milestoneBest.hidden = !(score > bestAtRunStart);
    nextStage.textContent = nextStageCopy(completedLevel);

    startBtn.textContent = isFinal ? "PLAY AGAIN" : `CONTINUE · LEVEL ${completedLevel + 1}`;
    startBtn.hidden = !isFinal;
    pauseBtn.disabled = true;
    overlayAction = isFinal ? "restart" : "next";
    setMilestoneUi(true, isFinal);
    setMusicMode("milestone");
    overlay.hidden = false;

    if (!isFinal) {
      levelTransitionTimer = window.setTimeout(startNextLevel, LEVEL_TRANSITION_MS);
    }
  }

  function startNextLevel() {
    clearTimeout(levelTransitionTimer);
    if (currentLevel >= MAX_LEVEL) return;
    currentLevel += 1;
    levelStartScore = score;
    levelStartShots = shotsOnTarget;
    updateLevel();
    buildStaticLayer();
    showLevelToast();
    setMusicMode("game");
  }

  function checkLevelComplete(now) {
    if (shotsOnTarget - levelStartShots < SHOTS_PER_LEVEL) return false;
    if (currentLevel >= MAX_LEVEL) {
      showLevelOverlay(currentLevel);
      return true;
    }
    startNextLevel();
    nextPlayAt = now + NEXT_PLAY_DELAY_MS;
    return false;
  }

  function finishPlay(now) {
    play = null;
    nextPlayAt = now + NEXT_PLAY_DELAY_MS;
  }

  function letWideShotGo(ball, now) {
    const index = balls.indexOf(ball);
    if (index === -1) return;
    balls.splice(index, 1);
    wideFlash = { started: now };
    finishPlay(now);
  }

  function catchBall(ball, now) {
    const index = balls.indexOf(ball);
    if (index === -1) return;
    balls.splice(index, 1);
    caughtFlash.push({ x: ball.x, y: KEEPER_Y - 8, started: now });
    score += 1;
    shotsOnTarget += 1;
    if (score > best) {
      best = score;
      localStorage.setItem("saveTheLineBest", String(best));
      bestEl.textContent = String(best).padStart(3, "0");
    }
    updatePerformanceHud();
    if (!checkLevelComplete(now)) finishPlay(now);
  }

  function concedeGoal(ball, now) {
    const index = balls.indexOf(ball);
    if (index === -1) return;
    balls.splice(index, 1);
    shotsOnTarget += 1;
    goalsConceded += 1;
    concededFlash = { x: ball.x, started: now };
    netImpact = { x: ball.x, started: now, strength: 1 };
    updatePerformanceHud();
    if (!checkLevelComplete(now)) finishPlay(now);
  }

  function setKeeperFromPointer(event) {
    const rect = controlsPad.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    keeperX = KEEPER_MIN_X + ratio * (KEEPER_MAX_X - KEEPER_MIN_X);
    controlsPad.style.setProperty("--control-ratio", ratio.toFixed(3));
  }

  controlsPad.addEventListener("pointerdown", (event) => {
    if (!running || paused) return;
    pointerActive = true;
    controlsPad.dataset.active = "true";
    controlsPad.setPointerCapture(event.pointerId);
    setKeeperFromPointer(event);
    event.preventDefault();
  });
  controlsPad.addEventListener("pointermove", (event) => {
    if (!running || paused || !pointerActive) return;
    setKeeperFromPointer(event);
    event.preventDefault();
  });
  controlsPad.addEventListener("pointerup", (event) => {
    pointerActive = false;
    controlsPad.dataset.active = "false";
    if (controlsPad.hasPointerCapture(event.pointerId)) controlsPad.releasePointerCapture(event.pointerId);
  });
  controlsPad.addEventListener("pointercancel", () => {
    pointerActive = false;
    controlsPad.dataset.active = "false";
  });


  function setPaused(nextPaused) {
    if (!running || paused === nextPaused) return;

    if (nextPaused) {
      paused = true;
      pauseStartedAt = performance.now();
      stopControls();
      controlsPad.dataset.active = "false";
      pauseOverlay.hidden = false;
      pauseBtn.setAttribute("aria-pressed", "true");
      pauseBtn.setAttribute("aria-label", "Resume game");
      pauseBtn.textContent = "▶ RESUME";
      return;
    }

    const now = performance.now();
    const pausedFor = now - pauseStartedAt;
    paused = false;
    pauseOverlay.hidden = true;
    pauseBtn.setAttribute("aria-pressed", "false");
    pauseBtn.setAttribute("aria-label", "Pause game");
    pauseBtn.textContent = "Ⅱ PAUSE";

    if (play) {
      play.phaseStarted += pausedFor;
      play.startedAt += pausedFor;
    }
    nextPlayAt += pausedFor;
    for (const flash of caughtFlash) flash.started += pausedFor;
    if (wideFlash) wideFlash.started += pausedFor;
    if (concededFlash) concededFlash.started += pausedFor;
    lastTime = now;
    lastRenderTime = 0;
  }

  window.addEventListener("keydown", (event) => {
    if ((event.key === "p" || event.key === "P" || event.key === "Escape") && running) {
      setPaused(!paused);
      event.preventDefault();
      return;
    }
    if (!paused && event.key === "ArrowLeft") { keys.left = true; event.preventDefault(); }
    if (!paused && event.key === "ArrowRight") { keys.right = true; event.preventDefault(); }
    if ((event.key === " " || event.key === "Enter") && !running) {
      if (overlayAction === "next") startNextLevel(); else resetGame();
      event.preventDefault();
    }
  });
  window.addEventListener("keyup", (event) => {
    if (event.key === "ArrowLeft") keys.left = false;
    if (event.key === "ArrowRight") keys.right = false;
  });
  pauseBtn.addEventListener("click", () => setPaused(!paused));
  resumeBtn.addEventListener("click", () => setPaused(false));

  soundBtn.addEventListener("click", () => {
    musicMuted = !musicMuted;
    soundBtn.setAttribute("aria-pressed", String(musicMuted));
    soundBtn.setAttribute("aria-label", musicMuted ? "Turn music on" : "Mute music");
    soundBtn.textContent = musicMuted ? "♪ OFF" : "♪ ON";
    if (musicMuted) {
      themeMusic.pause();
    } else {
      const playPromise = themeMusic.play();
      if (playPromise && typeof playPromise.catch === "function") playPromise.catch(() => {});
      setMusicMode(running ? "game" : "milestone");
    }
  });

  splashStartBtn.addEventListener("click", () => {
    splashScreen.hidden = true;
    document.body.classList.remove("splash-open");
    gameShell.inert = false;
    resetGame();
  });

  startBtn.addEventListener("click", () => {
    if (overlayAction === "next") startNextLevel(); else resetGame();
  });

  function buildStaticLayer() {
    const liveCtx = ctx;
    ctx = STATIC_CTX;
    ctx.clearRect(0, 0, W, H);
    drawPitch();
    drawFieldMarkings();
    drawArenaAccents();
    ctx = liveCtx;
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(STATIC_LAYER, 0, 0);
    drawAmbientBackdrop(now);
    drawGoal(now);
    if (play) drawPlay(now);

    for (const ball of balls) {
      drawShotTrail(ball);
      drawBall(ball.x, ball.y, 1, 1, ball.t * Math.PI * 10);
    }

    drawKeeper(now);
    if (wideFlash) drawWideFeedback(now);
    if (concededFlash) drawConcededFeedback(now);
    for (const flash of caughtFlash) drawSaveFeedback(flash, now);
  }

  function drawPitch() {
    const theme = currentTheme();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, theme.top);
    g.addColorStop(0.55, theme.mid);
    g.addColorStop(1, theme.bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const stripeW = 50;
    for (let x = FIELD_LEFT; x < FIELD_RIGHT; x += stripeW) {
      ctx.fillStyle = ((x - FIELD_LEFT) / stripeW) % 2 < 1 ? theme.stripeA : theme.stripeB;
      ctx.fillRect(x, 0, stripeW, H);
    }

    if (theme.surface === "grass") drawGrassTexture();
    if (theme.surface === "court") drawCourtTexture();
    if (theme.surface === "lane") drawLaneTexture(theme);
    if (theme.surface === "hex") drawHexTexture(theme);
    if (theme.surface === "grid") drawGridTexture(theme);
  }

  function drawGrassTexture() {
    ctx.fillStyle = "rgba(216,255,161,.035)";
    for (let y = 7; y < H; y += 17) {
      for (let x = FIELD_LEFT + ((y / 17) % 2) * 7; x < FIELD_RIGHT; x += 19) ctx.fillRect(x, y, 2, 2);
    }
  }

  function drawCourtTexture() {
    ctx.save();
    ctx.strokeStyle = "rgba(222,244,255,.055)";
    ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 58) { ctx.beginPath(); ctx.moveTo(FIELD_LEFT, y); ctx.lineTo(FIELD_RIGHT, y); ctx.stroke(); }
    for (let x = FIELD_LEFT; x < FIELD_RIGHT; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    ctx.restore();
  }

  function drawLaneTexture(theme) {
    ctx.save();
    ctx.fillStyle = rgba(theme.secondary, .055);
    const laneW = (FIELD_RIGHT - FIELD_LEFT) / 5;
    for (let i = 0; i < 5; i += 2) ctx.fillRect(FIELD_LEFT + i * laneW, 0, laneW, H);
    ctx.fillStyle = rgba(theme.secondary, .12);
    for (let y = 82; y < H - 90; y += 118) {
      for (const side of [-1, 1]) {
        const x = W / 2 + side * 90;
        ctx.beginPath();
        ctx.moveTo(x - 10, y); ctx.lineTo(x, y + 12); ctx.lineTo(x + 10, y); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 7); ctx.lineTo(x - 6, y);
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawHexTexture(theme) {
    ctx.save();
    ctx.strokeStyle = rgba(theme.secondary, .075);
    ctx.lineWidth = 1;
    const r = 26;
    const h = Math.sin(Math.PI / 3) * r;
    let row = 0;
    for (let y = -h; y < H + h; y += h) {
      for (let x = FIELD_LEFT - r; x < FIELD_RIGHT + r; x += r * 1.5) drawHex(x + (row % 2 ? r * .75 : 0), y, r);
      row += 1;
    }
    ctx.restore();
  }

  function drawHex(x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 3 * i;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }

  function drawGridTexture(theme) {
    ctx.save();
    ctx.strokeStyle = rgba(theme.secondary, .12);
    ctx.lineWidth = 1;
    for (let x = FIELD_LEFT; x <= FIELD_RIGHT; x += 38) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 38) { ctx.beginPath(); ctx.moveTo(FIELD_LEFT, y); ctx.lineTo(FIELD_RIGHT, y); ctx.stroke(); }
    ctx.restore();
  }

  function rgba(hex, alpha) {
    const clean = hex.replace("#", "");
    const n = parseInt(clean, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  }

  function drawFieldMarkings() {
    const theme = currentTheme();
    const penaltyLeft = (W - PENALTY_AREA_WIDTH) / 2;
    const goalAreaLeft = (W - GOAL_AREA_WIDTH) / 2;
    ctx.save();
    ctx.strokeStyle = theme.line;
    ctx.fillStyle = theme.line;
    ctx.lineWidth = 3;

    ctx.strokeRect(penaltyLeft, PENALTY_AREA_TOP, PENALTY_AREA_WIDTH, GOAL_LINE_Y - PENALTY_AREA_TOP);
    ctx.strokeRect(goalAreaLeft, GOAL_AREA_TOP, GOAL_AREA_WIDTH, GOAL_LINE_Y - GOAL_AREA_TOP);

    ctx.beginPath();
    ctx.arc(W / 2, PENALTY_AREA_TOP, 57, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W / 2, PENALTY_AREA_TOP + 70, 3.4, 0, Math.PI * 2);
    ctx.fill();

    // Hint of center-circle at the very top, as in the mockup composition.
    ctx.beginPath();
    ctx.arc(W / 2, -22, 72, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  function drawArenaAccents() {
    const theme = currentTheme();
    ctx.save();
    ctx.fillStyle = "rgba(0,18,23,.82)";
    ctx.fillRect(0, 0, FIELD_LEFT, H);
    ctx.fillRect(FIELD_RIGHT, 0, W - FIELD_RIGHT, H);

    ctx.strokeStyle = rgba(theme.accent, .58);
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const y = 48 + i * 72;
      ctx.beginPath();
      ctx.moveTo(FIELD_LEFT + 1, y);
      ctx.lineTo(FIELD_LEFT + 12, y + 22);
      ctx.moveTo(FIELD_RIGHT - 1, y + 4);
      ctx.lineTo(FIELD_RIGHT - 12, y + 26);
      ctx.stroke();
    }

    ctx.strokeStyle = rgba(theme.secondary, .40);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(FIELD_LEFT + 3, 0); ctx.lineTo(FIELD_LEFT + 3, H);
    ctx.moveTo(FIELD_RIGHT - 3, 0); ctx.lineTo(FIELD_RIGHT - 3, H);
    ctx.stroke();
    drawBackdrop(theme);
    ctx.restore();
  }

  function drawBackdrop(theme) {
    if (theme.backdrop === "classic") return;
    ctx.save();
    if (theme.backdrop === "night") {
      ctx.fillStyle = "rgba(1,13,29,.20)";
      ctx.fillRect(FIELD_LEFT, 0, FIELD_RIGHT - FIELD_LEFT, 54);
      ctx.fillStyle = "rgba(207,255,226,.24)";
      for (let x = FIELD_LEFT + 22; x < FIELD_RIGHT; x += 68) ctx.fillRect(x, 10, 18, 2);
    } else if (theme.backdrop === "city") {
      ctx.fillStyle = "rgba(4,10,28,.44)";
      ctx.fillRect(FIELD_LEFT, 0, FIELD_RIGHT - FIELD_LEFT, 72);
      for (let i = 0; i < 10; i++) {
        const x = FIELD_LEFT + 8 + i * 39;
        const h = 15 + (i % 4) * 9;
        ctx.fillStyle = i % 2 ? rgba(theme.secondary, .18) : rgba(theme.accent, .18);
        ctx.fillRect(x, 70 - h, 16, h);
      }
      ctx.strokeStyle = "rgba(230,245,255,.18)";
      ctx.beginPath(); ctx.moveTo(FIELD_LEFT, 71); ctx.lineTo(FIELD_RIGHT, 71); ctx.stroke();
    } else if (theme.backdrop === "tunnel") {
      ctx.strokeStyle = rgba(theme.secondary, .22);
      ctx.lineWidth = 3;
      for (let r = 52; r <= 132; r += 26) { ctx.beginPath(); ctx.arc(W / 2, 18, r, 0, Math.PI); ctx.stroke(); }
    } else if (theme.backdrop === "space" || theme.backdrop === "final") {
      ctx.fillStyle = "rgba(3,9,20,.52)";
      ctx.fillRect(FIELD_LEFT, 0, FIELD_RIGHT - FIELD_LEFT, 62);
      ctx.fillStyle = "rgba(255,255,255,.38)";
      for (let i = 0; i < 20; i++) {
        const x = FIELD_LEFT + 9 + (i * 31) % (FIELD_RIGHT - FIELD_LEFT - 18);
        const y = 7 + (i * 19) % 46;
        ctx.fillRect(x, y, 1.3, 1.3);
      }
      ctx.fillStyle = rgba(theme.secondary, theme.backdrop === "final" ? .18 : .12);
      ctx.beginPath(); ctx.arc(FIELD_LEFT + 54, 26, theme.backdrop === "final" ? 28 : 21, 0, Math.PI * 2); ctx.fill();
    } else if (theme.backdrop === "synth") {
      const g = ctx.createLinearGradient(0, 0, 0, 80);
      g.addColorStop(0, rgba(theme.accent, .18));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(FIELD_LEFT, 0, FIELD_RIGHT - FIELD_LEFT, 80);
      ctx.strokeStyle = rgba(theme.secondary, .16);
      ctx.beginPath(); ctx.moveTo(FIELD_LEFT, 67); ctx.lineTo(FIELD_RIGHT, 67); ctx.stroke();
    }
    ctx.restore();
  }

  function drawAmbientBackdrop(now) {
    const theme = currentTheme();
    const pulse = (Math.sin(now / 430) + 1) * .5;
    ctx.save();
    if (theme.backdrop === "city" || theme.backdrop === "synth") {
      ctx.globalAlpha = .12 + pulse * .12;
      ctx.fillStyle = theme.accent;
      ctx.fillRect(FIELD_LEFT + 4, 42, 2, 92);
      ctx.fillRect(FIELD_RIGHT - 6, 92, 2, 102);
    } else if (theme.backdrop === "tunnel") {
      ctx.globalAlpha = .12 + pulse * .08;
      ctx.strokeStyle = theme.secondary;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(W / 2, 18, 96 + pulse * 5, 0, Math.PI); ctx.stroke();
    } else if (theme.backdrop === "space" || theme.backdrop === "final") {
      ctx.globalAlpha = .13;
      ctx.fillStyle = theme.secondary;
      const drift = (now / 45) % (FIELD_RIGHT - FIELD_LEFT);
      for (let i = 0; i < 4; i++) {
        const x = FIELD_LEFT + ((drift + i * 96) % (FIELD_RIGHT - FIELD_LEFT));
        ctx.fillRect(x, 28 + i * 9, 1.5, 1.5);
      }
    }
    ctx.restore();
  }

  function drawGoal(now) {
    const theme = currentTheme();
    ctx.save();

    // The front frame now sits on the same level as the field goal line.
    ctx.strokeStyle = theme.goalLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(FIELD_LEFT, GOAL_LINE_Y);
    ctx.lineTo(FIELD_RIGHT, GOAL_LINE_Y);
    ctx.stroke();

    const netDepth = 34;
    const backY = Math.min(H - 4, GOAL_FRONT_Y + netDepth);
    const backLeft = GOAL_LEFT + 12;
    const backRight = GOAL_RIGHT - 12;

    ctx.fillStyle = "rgba(0,38,25,.08)";
    ctx.beginPath();
    ctx.moveTo(GOAL_LEFT, GOAL_FRONT_Y + 1);
    ctx.lineTo(GOAL_RIGHT, GOAL_FRONT_Y + 1);
    ctx.lineTo(backRight, backY);
    ctx.lineTo(backLeft, backY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = rgba(theme.secondary, .34);
    ctx.lineWidth = 0.8;
    for (let i = 1; i < 17; i++) {
      const t = i / 17;
      const frontX = GOAL_LEFT + GOAL_WIDTH * t;
      const backX = backLeft + (backRight - backLeft) * t;
      const bulge = netBulge(frontX, now);
      ctx.beginPath();
      ctx.moveTo(frontX, GOAL_FRONT_Y + 2);
      ctx.quadraticCurveTo((frontX + backX) * .5, GOAL_FRONT_Y + 17 + bulge * .45, backX, backY + bulge);
      ctx.stroke();
    }
    for (let i = 1; i <= 7; i++) {
      const t = i / 7;
      const y = GOAL_FRONT_Y + 2 + (backY - GOAL_FRONT_Y - 2) * t;
      const leftX = GOAL_LEFT + 12 * t;
      const rightX = GOAL_RIGHT - 12 * t;
      const centerBulge = netBulge(W / 2, now) * (.25 + t * .75);
      ctx.beginPath();
      ctx.moveTo(leftX, y);
      ctx.quadraticCurveTo(W / 2, y + centerBulge, rightX, y);
      ctx.stroke();
    }

    ctx.strokeStyle = theme.line;
    ctx.lineWidth = 4;
    ctx.lineCap = "square";
    ctx.beginPath();
    ctx.moveTo(GOAL_LEFT, GOAL_FRONT_Y - 1);
    ctx.lineTo(GOAL_LEFT, GOAL_FRONT_Y + 11);
    ctx.moveTo(GOAL_RIGHT, GOAL_FRONT_Y - 1);
    ctx.lineTo(GOAL_RIGHT, GOAL_FRONT_Y + 11);
    ctx.moveTo(GOAL_LEFT + 1, GOAL_FRONT_Y);
    ctx.lineTo(GOAL_RIGHT - 1, GOAL_FRONT_Y);
    ctx.stroke();

    ctx.strokeStyle = rgba(theme.secondary, .66);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(backLeft, backY);
    ctx.lineTo(backRight, backY);
    ctx.stroke();
    if (netImpact) {
      const age = now - netImpact.started;
      const t = Math.min(1, age / 300);
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.strokeStyle = rgba(theme.accent, .75);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(netImpact.x, GOAL_FRONT_Y + 14, 7 + t * 19, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function netBulge(x, now) {
    if (!netImpact) return 0;
    const age = now - netImpact.started;
    const t = Math.min(1, age / 340);
    const decay = 1 - t;
    const wave = Math.sin(t * Math.PI * 3.2) * decay;
    const influence = Math.max(0, 1 - Math.abs(x - netImpact.x) / 95);
    return (15 * decay + wave * 5) * influence * netImpact.strength;
  }

  function dribbleBallPose(player, now) {
    const cycle = ((now + player.phase * 80) % DRIBBLE_CYCLE_MS) / DRIBBLE_CYCLE_MS;
    const lead = (DRIBBLE_MIN_LEAD + DRIBBLE_MAX_LEAD) * 0.5;
    return {
      x: player.x,
      y: player.y + 24 + lead,
      rotation: cycle * Math.PI * 2
    };
  }

  function drawPlay(now) {
    const activeBallOwner = play.phase === "pass" ? play.passerIndex : play.shooterIndex;
    const windupProgress = play.phase === "windup"
      ? Math.min(1, (now - play.phaseStarted) / SHOT_WINDUP_MS)
      : null;
    for (let i = 0; i < play.players.length; i++) {
      const player = play.players[i];
      drawAttackerSprite(
        player,
        now,
        i === play.shooterIndex,
        i === activeBallOwner,
        i === play.shooterIndex ? windupProgress : null
      );
    }

    if (play.phase === "windup") {
      const p = play.players[play.shooterIndex];
      const t = windupProgress || 0;
      const plant = Math.sin(Math.min(1, t * 1.35) * Math.PI * 0.5);
      drawBall(p.x + 5 + plant * 2, p.y + 31 - plant * 2, 0.62, 1, t * Math.PI * 0.8);
      drawKickAccent(p, t);
      return;
    }

    if (play.phase === "direct") {
      const p = play.players[play.shooterIndex];
      const ball = dribbleBallPose(p, now);
      drawBall(ball.x, ball.y, 0.62, 1, ball.rotation);
      return;
    }

    if (play.phase === "pass") {
      const a = play.players[play.passerIndex];
      const b = play.players[play.shooterIndex];
      const t = Math.min(1, (now - play.phaseStarted) / PASS_DURATION_MS);
      drawPassGuide(a, b, t);
      const passBall = {
        startX: a.x + 5,
        startY: a.y + 30,
        controlX: (a.x + b.x) / 2,
        controlY: (a.y + b.y) / 2 - 9,
        targetX: b.x + 4,
        targetY: b.y + 29
      };
      const p = quadraticPoint(passBall, t);
      drawBall(p.x, p.y, 0.62, 1, t * Math.PI * 7);
      return;
    }

    if (play.phase === "receive") {
      const p = play.players[play.shooterIndex];
      const settle = Math.min(1, (now - play.phaseStarted) / RECEIVE_MS);
      const ball = dribbleBallPose(p, now);
      drawBall(
        p.x + (ball.x - p.x) * settle,
        p.y + 27 + (ball.y - (p.y + 27)) * settle,
        0.62,
        1,
        ball.rotation
      );
    }
  }

  function drawKickAccent(player, progress) {
    if (progress < 0.52) return;
    const t = (progress - 0.52) / 0.48;
    ctx.save();
    ctx.globalAlpha = (1 - t) * 0.72;
    ctx.strokeStyle = "#dfff24";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      const offset = i * 5;
      ctx.beginPath();
      ctx.moveTo(player.x - 18 - offset, player.y + 17 + offset * 0.25);
      ctx.lineTo(player.x - 7 - offset, player.y + 20 + offset * 0.25);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPassGuide(a, b, progress) {
    ctx.save();
    ctx.strokeStyle = "rgba(245,255,232,.56)";
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 7]);
    ctx.beginPath();
    ctx.moveTo(a.x + 8, a.y + 18);
    ctx.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 - 9, b.x + 7, b.y + 18);
    ctx.stroke();
    ctx.setLineDash([]);

    // Brighten only the already-completed segment, making the pass sequence instantly legible.
    if (progress > 0.06) {
      ctx.strokeStyle = "rgba(211,255,75,.72)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      const samples = 10;
      for (let i = 0; i <= samples; i++) {
        const t = progress * (i / samples);
        const q = quadraticPoint({
          startX: a.x + 8, startY: a.y + 18,
          controlX: (a.x + b.x) / 2, controlY: (a.y + b.y) / 2 - 9,
          targetX: b.x + 7, targetY: b.y + 18
        }, t);
        if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function attackerGait(player) {
    const travel = player.runTargetY - player.startY;
    if (travel <= 0) return 0;
    const progress = Math.max(0, Math.min(1, (player.y - player.startY) / travel));
    if (progress >= 0.995) return 0;
    return Math.sin(progress * Math.PI * 8 + player.phase);
  }

  function drawAttackerSprite(player, now, isShooter, hasBall, windupProgress = null) {
    const isWinding = windupProgress !== null;
    const run = isWinding ? 0 : attackerGait(player);
    const wind = isWinding ? Math.sin(Math.min(1, windupProgress * 1.18) * Math.PI * 0.5) : 0;
    const bob = isWinding ? -wind * 1.2 : Math.abs(run) * -0.7;
    const lean = isWinding ? -0.10 * wind : (hasBall ? 0.025 : 0.01);
    const shirt = player.jersey === "blue" ? "#1554a5" : "#f4f5ee";
    const trim = player.jersey === "blue" ? "#f3f5ec" : "#d8322c";

    ctx.save();
    ctx.translate(player.x, player.y + bob);
    ctx.rotate(lean);

    // Compact Kick Off-like shadow/readability.
    ctx.fillStyle = "rgba(0,45,20,.24)";
    ctx.beginPath();
    ctx.ellipse(2, 19, 11.5, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arms counter the stride without rocking the whole body left/right.
    ctx.strokeStyle = "#d6a57b";
    ctx.lineWidth = 3.3;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (isWinding) {
      ctx.moveTo(-6, -1); ctx.lineTo(-11 - wind * 2, 4);
      ctx.moveTo(6, -1); ctx.lineTo(10 + wind * 4, -4);
    } else {
      ctx.moveTo(-6, -1); ctx.lineTo(-9, 5 - run * 2.2);
      ctx.moveTo(6, -1); ctx.lineTo(9, 5 + run * 2.2);
    }
    ctx.stroke();

    // Body block: intentionally simple and compact for top-down readability.
    ctx.fillStyle = shirt;
    ctx.strokeStyle = "#182228";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-7, -3, 14, 15, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = trim;
    ctx.fillRect(-7, 5, 14, 4);
    ctx.fillStyle = "#182329";
    ctx.fillRect(-6, 11, 12, 3);

    // Head + hair cap.
    ctx.fillStyle = "#d9a87c";
    ctx.beginPath();
    ctx.arc(0, -7.5, 5.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1d2126";
    ctx.beginPath();
    ctx.arc(0, -9, 5.4, Math.PI, Math.PI * 2);
    ctx.lineTo(4.5, -6.8);
    ctx.lineTo(1.3, -8.4);
    ctx.lineTo(-0.9, -7.2);
    ctx.lineTo(-4.5, -7.8);
    ctx.closePath();
    ctx.fill();

    // Legs move fore/aft with the run instead of swinging laterally across the pitch.
    ctx.strokeStyle = "#151e22";
    ctx.lineWidth = 3.8;
    ctx.beginPath();
    if (isWinding) {
      const swing = windupProgress < 0.62
        ? windupProgress / 0.62
        : 1 - ((windupProgress - 0.62) / 0.38) * 1.55;
      ctx.moveTo(-3, 12); ctx.lineTo(-5, 21);
      ctx.moveTo(3, 12); ctx.lineTo(7 + swing * 4, 18 - swing * 6);
    } else {
      ctx.moveTo(-3, 12); ctx.lineTo(-4.5, 20 + run * 3.2);
      ctx.moveTo(3, 12); ctx.lineTo(4.5, 20 - run * 3.2);
    }
    ctx.stroke();

    ctx.strokeStyle = "#eef2e9";
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    if (isWinding) {
      const swing = windupProgress < 0.62
        ? windupProgress / 0.62
        : 1 - ((windupProgress - 0.62) / 0.38) * 1.55;
      ctx.moveTo(-5, 21); ctx.lineTo(-7.2, 22.3);
      ctx.moveTo(7 + swing * 4, 18 - swing * 6); ctx.lineTo(9.5 + swing * 4, 19 - swing * 6);
    } else {
      ctx.moveTo(-4.5, 20 + run * 3.2); ctx.lineTo(-6.8, 21.3 + run * 3.2);
      ctx.moveTo(4.5, 20 - run * 3.2); ctx.lineTo(6.8, 21.3 - run * 3.2);
    }
    ctx.stroke();

    if (isShooter) {
      ctx.textAlign = "center";
      ctx.font = "900 6px Arial";
      ctx.fillStyle = player.jersey === "blue" ? "#f4f5ed" : "#172329";
      ctx.fillText("10", 0, 4);
    }

    if (isShooter && !hasBall) {
      ctx.strokeStyle = "rgba(216,255,36,.68)";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 1.5, 14, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawShotTrail(ball) {
    if (ball.t <= 0.015) return;
    const trailLength = 0.13;
    const startT = Math.max(0, ball.t - trailLength);
    ctx.save();
    ctx.lineCap = "round";

    // Soft neon sheath.
    ctx.strokeStyle = "rgba(190,255,65,.22)";
    ctx.lineWidth = 9;
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const t = startT + (ball.t - startT) * (i / 12);
      const p = quadraticPoint(ball, t);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    // Crisp white core: direction is readable at a glance.
    ctx.strokeStyle = "rgba(250,255,241,.82)";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const t = startT + (ball.t - startT) * (i / 12);
      const p = quadraticPoint(ball, t);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawWideFeedback(now) {
    const t = Math.min(1, (now - wideFlash.started) / 430);
    ctx.save();
    ctx.globalAlpha = 1 - Math.max(0, (t - 0.45) / 0.55);
    ctx.textAlign = "center";
    ctx.font = "900 18px Arial";
    ctx.fillStyle = "#eaffd5";
    ctx.strokeStyle = "rgba(0,44,25,.55)";
    ctx.lineWidth = 3;
    ctx.strokeText("WIDE!", W / 2, H * 0.25);
    ctx.fillText("WIDE!", W / 2, H * 0.25);
    ctx.restore();
  }

  function drawConcededFeedback(now) {
    const t = Math.min(1, (now - concededFlash.started) / 430);
    ctx.save();
    ctx.globalAlpha = 1 - Math.max(0, (t - 0.45) / 0.55);
    ctx.textAlign = "center";
    ctx.font = "1000 18px Arial";
    ctx.fillStyle = "#ffe08a";
    ctx.strokeStyle = "rgba(0,36,24,.72)";
    ctx.lineWidth = 4;
    ctx.strokeText("GOAL!", concededFlash.x, KEEPER_Y - 53);
    ctx.fillText("GOAL!", concededFlash.x, KEEPER_Y - 53);
    ctx.restore();
  }

  function drawSaveFeedback(flash, now) {
    const age = now - flash.started;
    const side = flash.x < keeperX ? -1 : 1;
    const gloveX = keeperX + side * 24;
    const gloveY = KEEPER_Y - 8;
    ctx.save();

    if (age < 110) {
      const settle = Math.min(1, age / 75);
      drawBall(
        flash.x + (gloveX - flash.x) * settle,
        flash.y + (gloveY - flash.y) * settle,
        0.82,
        1 - Math.max(0, age - 78) / 45
      );
    }

    if (age < 150) {
      const t = age / 150;
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = "#dfff24";
      ctx.lineWidth = 3 - t;
      ctx.beginPath();
      ctx.arc(gloveX, gloveY, 11 + t * 17, 0, Math.PI * 2);
      ctx.stroke();
    }

    const alpha = age < 85 ? age / 85 : Math.max(0, 1 - (age - 85) / 205);
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.font = "1000 18px Arial";
    ctx.fillStyle = "#e4ff21";
    ctx.strokeStyle = "rgba(0,36,24,.72)";
    ctx.lineWidth = 4;
    ctx.strokeText("SAVE!", keeperX, KEEPER_Y - 53);
    ctx.fillText("SAVE!", keeperX, KEEPER_Y - 53);
    ctx.restore();
  }

  function drawKeeper(now) {
    const idle = (now % 1400) / 1400;
    const open = (1 + Math.cos(idle * Math.PI * 2)) * 0.5;
    const cross = 1 - open;
    const sway = Math.sin(idle * Math.PI * 2) * 1.0;
    const torsoLift = Math.sin(idle * Math.PI * 2) * 0.65;
    const handX = 8 + open * 17;
    const handY = -11 - cross * 8;

    ctx.save();
    ctx.translate(keeperX + sway, KEEPER_Y + torsoLift);

    ctx.fillStyle = "rgba(0,45,18,.28)";
    ctx.beginPath();
    ctx.ellipse(2, 18, 16.5, 4.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Leaner keeper body while preserving the existing gameplay reach.
    ctx.fillStyle = "#151b1d";
    ctx.fillRect(-9, 10, 18, 7);
    ctx.fillRect(-9.5, 17, 5.5, 7);
    ctx.fillRect(4, 17, 5.5, 7);

    ctx.strokeStyle = "#d8aa7d";
    ctx.lineWidth = 4.1;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-8, 0); ctx.lineTo(-handX + 3.5, handY + 4);
    ctx.moveTo(8, 0); ctx.lineTo(handX - 3.5, handY + 4);
    ctx.stroke();

    ctx.fillStyle = "#dfff24";
    ctx.strokeStyle = "#14241e";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-10.5, -4, 21, 18, 5);
    ctx.fill();
    ctx.stroke();

    drawGlove(-handX, handY, -0.12 + cross * 0.30);
    drawGlove(handX, handY, 0.12 - cross * 0.30);

    ctx.fillStyle = "#d6a276";
    ctx.beginPath();
    ctx.arc(0, -7, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#202526";
    ctx.beginPath();
    ctx.arc(0, -8.5, 6.1, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = "center";
    ctx.font = "900 9px Arial";
    ctx.fillStyle = "#17221c";
    ctx.fillText("1", 0, 8.5);
    ctx.restore();
  }

  function drawGlove(x, y, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = "#f8fff5";
    ctx.strokeStyle = "#28333a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-5.5, -5, 11, 10, 3);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#7d8b8d";
    ctx.lineWidth = 1.1;
    for (let i = -2.5; i <= 2.5; i += 2.5) {
      ctx.beginPath(); ctx.moveTo(i, -3.5); ctx.lineTo(i, 2.2); ctx.stroke();
    }
    ctx.restore();
  }

  function drawBall(x, y, scale = 1, alpha = 1, rotation = 0) {
    const r = BALL_RADIUS * scale;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);

    ctx.fillStyle = "rgba(0,38,18,.25)";
    ctx.beginPath();
    ctx.ellipse(3, r * 0.8, r * 0.76, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(rotation);

    ctx.fillStyle = "#f7f7ef";
    ctx.strokeStyle = "#1c282b";
    ctx.lineWidth = Math.max(1.4, 1.8 * scale);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const centerR = r * 0.28;
    ctx.fillStyle = "#1b2529";
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
      const px = Math.cos(a) * centerR;
      const py = Math.sin(a) * centerR;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Five partial outer panels: reads as a classic football even at small scale.
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
      const px = Math.cos(a) * r * 0.72;
      const py = Math.sin(a) * r * 0.72;
      ctx.beginPath();
      ctx.arc(px, py, r * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#4b5657";
      ctx.lineWidth = Math.max(0.8, scale);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.34, Math.sin(a) * r * 0.34);
      ctx.lineTo(px, py);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Static first frame: show a readable two-player build-up rather than an unexplained loose ball.
  buildStaticLayer();
  ctx.drawImage(STATIC_LAYER, 0, 0);
  drawGoal(performance.now());
  play = {
    players: [
      { x: W * 0.29, y: H * 0.19, startY: H * 0.19, runTargetY: H * 0.31, phase: 0, jersey: "white" },
      { x: W * 0.66, y: H * 0.29, startY: H * 0.29, runTargetY: H * 0.43, phase: 1.4, jersey: "white" }
    ],
    phase: "pass",
    phaseStarted: performance.now() - PASS_DURATION_MS * 0.46,
    startedAt: performance.now() - ATTACK_RUN_MS * 0.46,
    passerIndex: 0,
    shooterIndex: 1
  };
  drawPlay(performance.now());
  drawKeeper(performance.now());
  play = null;
  updateLevel();
})();
