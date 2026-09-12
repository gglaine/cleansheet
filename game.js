(() => {
  "use strict";

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
  const SAVES_PER_LEVEL = 5;
  const MAX_LEVEL = 4;
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
  let keeperX = W / 2;
  let pointerActive = false;
  let currentLevel = 1;
  let levelStartScore = 0;
  let overlayAction = "restart";
  const keys = { left: false, right: false };

  let best = Number(localStorage.getItem("saveTheLineBest") || 0);
  bestEl.textContent = String(best).padStart(3, "0");

  function level() {
    return currentLevel;
  }

  function updateLevel() {
    levelEl.textContent = String(level());
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
    running = true;
    score = 0;
    shotsOnTarget = 0;
    goalsConceded = 0;
    currentLevel = 1;
    levelStartScore = 0;
    overlayAction = "restart";
    balls = [];
    play = null;
    caughtFlash = [];
    wideFlash = null;
    concededFlash = null;
    keeperX = W / 2;
    pointerActive = false;
    keys.left = false;
    keys.right = false;
    updatePerformanceHud();
    updateLevel();
    overlayEyebrow.textContent = "GOALKEEPER ARCADE";
    overlayTitle.textContent = "Save the line!";
    overlayCopy.textContent = "Read the build-up, track the final shot and cover the goal. Every on-target shot counts.";
    startBtn.textContent = "START RUN";
    overlay.hidden = true;

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
    return { passChance: 0.74, threeChance: 0.42, runMin: 86, runMax: 138, curveChance: 0.44, curveMin: 18, curveMax: 32 };
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
    keys.left = false;
    keys.right = false;
  }

  function showLevelOverlay(completedLevel) {
    running = false;
    stopControls();
    balls = [];
    play = null;
    overlayEyebrow.textContent = `LEVEL ${completedLevel} COMPLETE`;
    overlayTitle.textContent = completedLevel >= MAX_LEVEL ? "Run complete!" : "Line held!";
    const savePercentage = shotsOnTarget ? Math.round((score / shotsOnTarget) * 100) : 100;
    overlayCopy.textContent = completedLevel >= MAX_LEVEL
      ? `${score} saves from ${shotsOnTarget} shots on target · ${savePercentage}% save rate.`
      : `${SAVES_PER_LEVEL} saves secured. Next level brings a more complex attack.`;
    startBtn.textContent = completedLevel >= MAX_LEVEL ? "PLAY AGAIN" : `START LEVEL ${completedLevel + 1}`;
    overlayAction = completedLevel >= MAX_LEVEL ? "restart" : "next";
    overlay.hidden = false;
  }

  function startNextLevel() {
    currentLevel += 1;
    levelStartScore = score;
    running = true;
    balls = [];
    play = null;
    caughtFlash = [];
    wideFlash = null;
    concededFlash = null;
    keeperX = W / 2;
    stopControls();
    updateLevel();
    overlay.hidden = true;
    const now = performance.now();
    nextPlayAt = now + 340;
    lastTime = now;
    lastRenderTime = 0;
    requestAnimationFrame(loop);
  }

  function checkLevelComplete() {
    if (score - levelStartScore < SAVES_PER_LEVEL) return false;
    const completedLevel = currentLevel;
    showLevelOverlay(completedLevel);
    return true;
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
    if (!checkLevelComplete()) finishPlay(now);
  }

  function concedeGoal(ball, now) {
    const index = balls.indexOf(ball);
    if (index === -1) return;
    balls.splice(index, 1);
    shotsOnTarget += 1;
    goalsConceded += 1;
    concededFlash = { x: ball.x, started: now };
    updatePerformanceHud();
    finishPlay(now);
  }

  function pointerX(event) {
    const rect = canvas.getBoundingClientRect();
    return ((event.clientX - rect.left) / rect.width) * W;
  }

  function setKeeperFromPointer(event) {
    const x = pointerX(event);
    keeperX = Math.max(KEEPER_MIN_X, Math.min(KEEPER_MAX_X, x));
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (!running) return;
    pointerActive = true;
    canvas.setPointerCapture(event.pointerId);
    setKeeperFromPointer(event);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!running || !pointerActive) return;
    setKeeperFromPointer(event);
  });
  canvas.addEventListener("pointerup", (event) => {
    pointerActive = false;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointercancel", () => { pointerActive = false; });

  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") { keys.left = true; event.preventDefault(); }
    if (event.key === "ArrowRight") { keys.right = true; event.preventDefault(); }
    if ((event.key === " " || event.key === "Enter") && !running) {
      if (overlayAction === "next") startNextLevel(); else resetGame();
      event.preventDefault();
    }
  });
  window.addEventListener("keyup", (event) => {
    if (event.key === "ArrowLeft") keys.left = false;
    if (event.key === "ArrowRight") keys.right = false;
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
    drawGoal();
    ctx = liveCtx;
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(STATIC_LAYER, 0, 0);
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
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#42c936");
    g.addColorStop(0.55, "#2fac2f");
    g.addColorStop(1, "#239329");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Stronger broadcast-style mowing bands to match the revamp reference.
    const stripeW = 50;
    for (let x = FIELD_LEFT; x < FIELD_RIGHT; x += stripeW) {
      ctx.fillStyle = ((x - FIELD_LEFT) / stripeW) % 2 < 1
        ? "rgba(190,255,87,.10)"
        : "rgba(0,76,31,.13)";
      ctx.fillRect(x, 0, stripeW, H);
    }

    // Lightweight grass texture, deliberately regular so it stays crisp rather than noisy.
    ctx.fillStyle = "rgba(216,255,161,.035)";
    for (let y = 7; y < H; y += 17) {
      for (let x = FIELD_LEFT + ((y / 17) % 2) * 7; x < FIELD_RIGHT; x += 19) {
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }

  function drawFieldMarkings() {
    const penaltyLeft = (W - PENALTY_AREA_WIDTH) / 2;
    const goalAreaLeft = (W - GOAL_AREA_WIDTH) / 2;
    ctx.save();
    ctx.strokeStyle = "rgba(250,255,237,.92)";
    ctx.fillStyle = "rgba(250,255,237,.92)";
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
    ctx.save();
    ctx.fillStyle = "rgba(0,22,23,.82)";
    ctx.fillRect(0, 0, FIELD_LEFT, H);
    ctx.fillRect(FIELD_RIGHT, 0, W - FIELD_RIGHT, H);

    // Lean diagonal speed streaks echo the arcade/manga framing without entering play space.
    ctx.strokeStyle = "rgba(204,255,34,.62)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const y = 50 + i * 72;
      ctx.beginPath();
      ctx.moveTo(FIELD_LEFT + 1, y);
      ctx.lineTo(FIELD_LEFT + 15, y + 25);
      ctx.moveTo(FIELD_RIGHT - 1, y + 4);
      ctx.lineTo(FIELD_RIGHT - 15, y + 29);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(24,229,206,.36)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(FIELD_LEFT + 3, 0); ctx.lineTo(FIELD_LEFT + 3, H);
    ctx.moveTo(FIELD_RIGHT - 3, 0); ctx.lineTo(FIELD_RIGHT - 3, H);
    ctx.stroke();
    ctx.restore();
  }

  function drawGoal() {
    ctx.save();

    // The front frame now sits on the same level as the field goal line.
    ctx.strokeStyle = "rgba(250,255,239,.58)";
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

    ctx.strokeStyle = "rgba(243,255,236,.34)";
    ctx.lineWidth = 0.8;
    for (let i = 1; i < 17; i++) {
      const t = i / 17;
      ctx.beginPath();
      ctx.moveTo(GOAL_LEFT + GOAL_WIDTH * t, GOAL_FRONT_Y + 2);
      ctx.lineTo(backLeft + (backRight - backLeft) * t, backY);
      ctx.stroke();
    }
    for (let i = 1; i <= 7; i++) {
      const t = i / 7;
      const y = GOAL_FRONT_Y + 2 + (backY - GOAL_FRONT_Y - 2) * t;
      ctx.beginPath();
      ctx.moveTo(GOAL_LEFT + 12 * t, y);
      ctx.lineTo(GOAL_RIGHT - 12 * t, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "#fbfff2";
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

    ctx.strokeStyle = "rgba(246,255,240,.66)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(backLeft, backY);
    ctx.lineTo(backRight, backY);
    ctx.stroke();
    ctx.restore();
  }

  function dribbleBallPose(player, now) {
    const cycle = ((now + player.phase * 80) % DRIBBLE_CYCLE_MS) / DRIBBLE_CYCLE_MS;
    const touch = cycle < 0.5 ? cycle * 2 : (1 - cycle) * 2;
    const lead = DRIBBLE_MIN_LEAD + (DRIBBLE_MAX_LEAD - DRIBBLE_MIN_LEAD) * touch;
    const side = cycle < 0.5 ? -1 : 1;
    return {
      x: player.x + side * (2.5 + touch * 2.5),
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

  function drawAttackerSprite(player, now, isShooter, hasBall, windupProgress = null) {
    const isWinding = windupProgress !== null;
    const run = isWinding ? 0 : Math.sin(now / 92 + player.phase);
    const wind = isWinding ? Math.sin(Math.min(1, windupProgress * 1.18) * Math.PI * 0.5) : 0;
    const bob = isWinding ? -wind * 1.2 : Math.abs(run) * -1.1;
    const lean = isWinding ? -0.10 * wind : (hasBall ? 0.045 : 0.018);
    const shirt = player.jersey === "blue" ? "#1554a5" : "#f4f5ee";
    const trim = player.jersey === "blue" ? "#f3f5ec" : "#d8322c";

    ctx.save();
    ctx.translate(player.x, player.y + bob);
    ctx.rotate(isWinding ? lean : lean * (run >= 0 ? 1 : -1));

    // Compact Kick Off-like shadow/readability.
    ctx.fillStyle = "rgba(0,45,20,.24)";
    ctx.beginPath();
    ctx.ellipse(2, 19, 11.5, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arms first to keep a crisp silhouette, inspired by classic 16-bit top-down footballers.
    ctx.strokeStyle = "#d6a57b";
    ctx.lineWidth = 3.3;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (isWinding) {
      ctx.moveTo(-6, -1); ctx.lineTo(-11 - wind * 2, 4);
      ctx.moveTo(6, -1); ctx.lineTo(10 + wind * 4, -4);
    } else {
      ctx.moveTo(-6, -1); ctx.lineTo(-10 + run * 3.2, 6);
      ctx.moveTo(6, -1); ctx.lineTo(10 - run * 3.2, 6);
    }
    ctx.stroke();

    // Body block: intentionally simpler and squatter than the previous more illustrative player.
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

    // Legs / boots: shorter and snappier so the sprite feels closer to Kick Off.
    ctx.strokeStyle = "#151e22";
    ctx.lineWidth = 3.8;
    ctx.beginPath();
    if (isWinding) {
      const swing = windupProgress < 0.62
        ? windupProgress / 0.62
        : 1 - ((windupProgress - 0.62) / 0.38) * 1.55;
      ctx.moveTo(-3, 12); ctx.lineTo(-6, 21);
      ctx.moveTo(3, 12); ctx.lineTo(8 + swing * 4, 18 - swing * 6);
    } else {
      ctx.moveTo(-3, 12); ctx.lineTo(-5.5 - run * 3.8, 20);
      ctx.moveTo(3, 12); ctx.lineTo(5.5 + run * 3.8, 20);
    }
    ctx.stroke();

    ctx.strokeStyle = "#eef2e9";
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    if (isWinding) {
      const swing = windupProgress < 0.62
        ? windupProgress / 0.62
        : 1 - ((windupProgress - 0.62) / 0.38) * 1.55;
      ctx.moveTo(-6, 21); ctx.lineTo(-8.5, 22.5);
      ctx.moveTo(8 + swing * 4, 18 - swing * 6); ctx.lineTo(10.5 + swing * 4, 19 - swing * 6);
    } else {
      ctx.moveTo(-5.5 - run * 3.8, 20); ctx.lineTo(-8 - run * 3.8, 21.5);
      ctx.moveTo(5.5 + run * 3.8, 20); ctx.lineTo(8 + run * 3.8, 21.5);
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
    const sway = Math.sin(idle * Math.PI * 2) * 1.2;
    const torsoLift = Math.sin(idle * Math.PI * 2) * 0.8;
    const handX = 8 + open * 17;
    const handY = -11 - cross * 8;

    ctx.save();
    ctx.translate(keeperX + sway, KEEPER_Y + torsoLift);

    ctx.fillStyle = "rgba(0,45,18,.28)";
    ctx.beginPath();
    ctx.ellipse(2, 18, 19, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Smaller, Kick Off-like keeper silhouette relative to the goal.
    ctx.fillStyle = "#151b1d";
    ctx.fillRect(-11, 11, 22, 8);
    ctx.fillRect(-12, 18, 7, 8);
    ctx.fillRect(5, 18, 7, 8);

    ctx.strokeStyle = "#d8aa7d";
    ctx.lineWidth = 5.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-10, 0); ctx.lineTo(-handX + 4, handY + 4);
    ctx.moveTo(10, 0); ctx.lineTo(handX - 4, handY + 4);
    ctx.stroke();

    ctx.fillStyle = "#dfff24";
    ctx.strokeStyle = "#14241e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-13, -4, 26, 20, 6);
    ctx.fill();
    ctx.stroke();

    drawGlove(-handX, handY, -0.12 + cross * 0.30);
    drawGlove(handX, handY, 0.12 - cross * 0.30);

    ctx.fillStyle = "#d6a276";
    ctx.beginPath();
    ctx.arc(0, -7, 7.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#202526";
    ctx.beginPath();
    ctx.arc(0, -8.8, 7.3, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = "center";
    ctx.font = "900 10px Arial";
    ctx.fillStyle = "#17221c";
    ctx.fillText("1", 0, 10);
    ctx.restore();
  }

  function drawGlove(x, y, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = "#f8fff5";
    ctx.strokeStyle = "#28333a";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-6.5, -5.8, 13, 11.6, 3.4);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#7d8b8d";
    ctx.lineWidth = 1.2;
    for (let i = -3; i <= 3; i += 3) {
      ctx.beginPath(); ctx.moveTo(i, -4); ctx.lineTo(i, 2.5); ctx.stroke();
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
