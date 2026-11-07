/**
 * ==========================================================================
 * Kozminski Escape: Polowanie na ECTS
 * Serce gry (js/game.js)
 * Akademia Leona Koźmińskiego (ALK) w Warszawie
 *
 * Silnik 2D Canvas z układem kampusu ALK, sztuczną inteligencją Egzaminatora,
 * dynamicznym ruchem wektorowym studenta, power-upami i syntezą audio Web Audio API.
 * ==========================================================================
 */

(function () {
  'use strict';

  // --- Elementy Canvas i Kontekst 2D ---
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // Wymiary pola gry
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 540;
  const TARGET_ECTS = 30;

  // --- Elementy DOM: HUD ---
  const ectsValueEl = document.getElementById('ects-value');
  const ectsTargetEl = document.getElementById('ects-target');
  const ectsProgressBarEl = document.getElementById('ects-progress-bar');
  const staminaFillEl = document.getElementById('stamina-fill');
  const staminaPercentEl = document.getElementById('stamina-percent');
  const campusStatusEl = document.getElementById('campus-status');
  const dangerStatusEl = document.getElementById('danger-status');
  const campusIconEl = document.getElementById('campus-icon');

  // Komiksowy dymek profesora (HTML)
  const professorBubbleEl = document.getElementById('professor-bubble');
  const professorQuoteEl = document.getElementById('professor-quote');

  // Przyciski HUD
  const btnSound = document.getElementById('btn-sound');
  const soundIcon = document.getElementById('sound-icon');
  const btnPause = document.getElementById('btn-pause');
  const pauseIcon = document.getElementById('pause-icon');
  const btnHelpToggle = document.getElementById('btn-help-toggle');
  const pauseOverlay = document.getElementById('pause-overlay');
  const btnResume = document.getElementById('btn-resume');

  // Modale gry
  const modalStart = document.getElementById('modal-start');
  const btnStartGame = document.getElementById('btn-start-game');

  const modalGameOver = document.getElementById('modal-gameover');
  const failQuoteEl = document.getElementById('fail-quote');
  const failEctsEl = document.getElementById('fail-ects-count');
  const failTimeEl = document.getElementById('fail-time');
  const btnRetryGame = document.getElementById('btn-retry-game');

  const modalVictory = document.getElementById('modal-victory');
  const winTimeEl = document.getElementById('win-time');
  const winGradeEl = document.getElementById('win-grade');
  const btnPlayAgain = document.getElementById('btn-play-again');

  // Przyciski dotykowe na ekranie (#mobile-controls)
  const touchUp = document.getElementById('touch-up');
  const touchDown = document.getElementById('touch-down');
  const touchLeft = document.getElementById('touch-left');
  const touchRight = document.getElementById('touch-right');
  const touchSprint = document.getElementById('touch-sprint');

  // --- Teksty akademickie surowego Egzaminatora ALK ---
  const PROFESSOR_QUOTES = [
    '„A gdzie przypis harwardzki?!”',
    '„Ten bilans się nie zamyka!”',
    '„Widzę Pana we wrześniu!”',
    '„USOS właśnie zamknął protokół!”',
    '„Czy ten esej pisał Pan, czy ChatGPT?!”',
    '„Panie Kolego, zero punktów z kolokwium!”',
    '„Dziekanat nie przedłuży Panu sesji!”'
  ];

  // --- 1. Układ kampusu na Canvasie: Ściany, Aule i Patio ALK ---
  // Aule: Aula A, Biblioteka, Dziekanat, Lab Komputerowy oraz centralne Patio ALK 🌿
  const obstacles = [
    // Ściany zewnętrzne kampusu
    { x: 0, y: 0, w: CANVAS_WIDTH, h: 16 },
    { x: 0, y: CANVAS_HEIGHT - 16, w: CANVAS_WIDTH, h: 16 },
    { x: 0, y: 0, w: 16, h: CANVAS_HEIGHT },
    { x: CANVAS_WIDTH - 16, y: 0, w: 16, h: CANVAS_HEIGHT },

    // Ściany Auli A (Górny lewy róg, z wejściem od dołu i od prawej)
    { x: 16, y: 150, w: 160, h: 14 },
    { x: 216, y: 16, w: 14, h: 100 },

    // Ściany Labu Komputerowego (Dolny lewy róg, z wejściem)
    { x: 16, y: 370, w: 160, h: 14 },
    { x: 216, y: 410, w: 14, h: 114 },

    // Ściany Biblioteki (Górny prawy róg, z wejściem)
    { x: 624, y: 150, w: 160, h: 14 },
    { x: 570, y: 16, w: 14, h: 100 },

    // Ściany Dziekanatu (Dolny prawy róg, z wejściem)
    { x: 624, y: 370, w: 160, h: 14 },
    { x: 570, y: 410, w: 14, h: 114 },

    // Centralne Patio ALK: Roślinne kwietniki i ławki ogrodowe
    { x: 330, y: 180, w: 140, h: 24 },
    { x: 330, y: 336, w: 140, h: 24 },

    // Kolumny konstrukcyjne Patio
    { x: 280, y: 250, w: 20, h: 40 },
    { x: 500, y: 250, w: 20, h: 40 }
  ];

  // Etykiety i strefy pomieszczeń na kampusie
  const campusZones = [
    { name: 'Aula A', x: 110, y: 90, icon: '🏛️' },
    { name: 'Biblioteka', x: 690, y: 90, icon: '📚' },
    { name: 'Lab Komputerowy', x: 110, y: 460, icon: '💻' },
    { name: 'Dziekanat', x: 690, y: 460, icon: '📋' },
    { name: 'Patio ALK 🌿', x: 400, y: 270, icon: '🌿' }
  ];

  // --- Stan gry ---
  const state = {
    gameState: 'START', // START, PLAYING, PAUSED, GAMEOVER, VICTORY
    ects: 0,
    stamina: 100,
    maxStamina: 100,
    isSprinting: false,
    startTime: 0,
    elapsedTime: 0,
    activeQuote: PROFESSOR_QUOTES[0],
    quoteDisplayTime: 0,
    lastQuoteChange: 0,
    campusZoneName: 'Patio ALK 🌿',
    // Power-upy gracza i efekty
    coffeeTimer: 0,     // 5s turbo szybkości
    freezeTimer: 0,     // 3.5s paraliżu Gemini AI
    hasShield: false,   // Legitymacja ALK absorbująca 1 uderzenie
    keys: {
      up: false,
      down: false,
      left: false,
      right: false,
      sprint: false
    },
    particles: [],
    confetti: []
  };

  // --- 2. Gracz (Student ALK) ---
  const player = {
    x: 400,
    y: 440,
    radius: 15,
    baseSpeed: 3.2,
    sprintSpeed: 5.6,
    facing: 'right',
    animFrame: 0,
    walkTimer: 0
  };

  // --- 3. Przeciwnik (Egzaminator) ---
  const professor = {
    x: 400,
    y: 80,
    radius: 17,
    baseSpeed: 2.1,
    speed: 2.1,
    facing: 'left',
    animFrame: 0,
    wobble: 0
  };

  // --- 4. Przedmioty (Spawnowane losowo poza ścianami) ---
  let items = [];

  /**
   * Sprawdza kolizję koła z przeszkodami ścian
   */
  function checkCollision(circleX, circleY, radius) {
    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      const closestX = Math.max(obs.x, Math.min(circleX, obs.x + obs.w));
      const closestY = Math.max(obs.y, Math.min(circleY, obs.y + obs.h));

      const dx = circleX - closestX;
      const dy = circleY - closestY;
      if (dx * dx + dy * dy < radius * radius) {
        return true;
      }
    }
    return false;
  }

  /**
   * Losuje wolną pozycję poza ścianami kampusu
   */
  function getRandomFreeSpawn(radius = 18) {
    let attempts = 0;
    while (attempts < 150) {
      attempts++;
      const x = Math.floor(Math.random() * (CANVAS_WIDTH - 80)) + 40;
      const y = Math.floor(Math.random() * (CANVAS_HEIGHT - 80)) + 40;

      // Sprawdź dystans od wszystkich ścian
      if (!checkCollision(x, y, radius + 14)) {
        // Nie spawnuj zbyt blisko gracza
        const distPlayer = Math.hypot(x - player.x, y - player.y);
        if (distPlayer > 75) {
          return { x, y };
        }
      }
    }
    return { x: 400, y: 270 };
  }

  /**
   * Wypełnia kampus początkowymi przedmiotami
   */
  function spawnInitialItems() {
    items = [];

    // 📜 ECTS - zwoje punktów
    for (let i = 0; i < 9; i++) {
      const pos = getRandomFreeSpawn();
      items.push({
        id: 'ects-' + i,
        type: 'ects',
        value: i % 3 === 0 ? 3 : (i % 2 === 0 ? 2 : 1),
        x: pos.x,
        y: pos.y,
        radius: 12,
        bobOffset: Math.random() * Math.PI * 2
      });
    }

    // ☕ Kawa z Patio ALK (turbo-szybkość)
    for (let i = 0; i < 2; i++) {
      const pos = getRandomFreeSpawn();
      items.push({
        id: 'coffee-' + i,
        type: 'coffee',
        x: pos.x,
        y: pos.y,
        radius: 12,
        bobOffset: Math.random() * Math.PI * 2
      });
    }

    // 💻 Gemini AI (paraliż profesora)
    const geminiPos = getRandomFreeSpawn();
    items.push({
      id: 'gemini-0',
      type: 'gemini',
      x: geminiPos.x,
      y: geminiPos.y,
      radius: 13,
      bobOffset: Math.random() * Math.PI * 2
    });

    // 🪪 Legitymacja ALK (tarcza ochronna)
    const shieldPos = getRandomFreeSpawn();
    items.push({
      id: 'shield-0',
      type: 'shield',
      x: shieldPos.x,
      y: shieldPos.y,
      radius: 13,
      bobOffset: Math.random() * Math.PI * 2
    });
  }

  /**
   * Uzupełnianie brakujących przedmiotów podczas gry
   */
  function maintainItemStock() {
    const ectsCount = items.filter(it => it.type === 'ects').length;
    if (ectsCount < 6 && state.ects < TARGET_ECTS) {
      const pos = getRandomFreeSpawn();
      items.push({
        id: 'ects-' + Date.now(),
        type: 'ects',
        value: Math.random() > 0.6 ? 3 : 2,
        x: pos.x,
        y: pos.y,
        radius: 12,
        bobOffset: Math.random() * Math.PI * 2
      });
    }

    const coffeeCount = items.filter(it => it.type === 'coffee').length;
    if (coffeeCount < 2) {
      const pos = getRandomFreeSpawn();
      items.push({
        id: 'coffee-' + Date.now(),
        type: 'coffee',
        x: pos.x,
        y: pos.y,
        radius: 12,
        bobOffset: Math.random() * Math.PI * 2
      });
    }

    const geminiCount = items.filter(it => it.type === 'gemini').length;
    if (geminiCount < 1 && Math.random() < 0.008) {
      const pos = getRandomFreeSpawn();
      items.push({
        id: 'gemini-' + Date.now(),
        type: 'gemini',
        x: pos.x,
        y: pos.y,
        radius: 13,
        bobOffset: Math.random() * Math.PI * 2
      });
    }

    const shieldCount = items.filter(it => it.type === 'shield').length;
    if (!state.hasShield && shieldCount < 1 && Math.random() < 0.006) {
      const pos = getRandomFreeSpawn();
      items.push({
        id: 'shield-' + Date.now(),
        type: 'shield',
        x: pos.x,
        y: pos.y,
        radius: 13,
        bobOffset: Math.random() * Math.PI * 2
      });
    }
  }

  /**
   * Wyświetlenie komiksowego tekstu profesora
   */
  function triggerProfessorQuote(quoteText = null) {
    state.activeQuote = quoteText || PROFESSOR_QUOTES[Math.floor(Math.random() * PROFESSOR_QUOTES.length)];
    state.quoteDisplayTime = 3.5; // Wyświetlaj dymek przez 3.5s
    professorQuoteEl.textContent = state.activeQuote;

    professorBubbleEl.classList.add('bubble-alert');
    setTimeout(() => {
      professorBubbleEl.classList.remove('bubble-alert');
    }, 450);
  }

  /**
   * Detekcja strefy kampusu, w której znajduje się student
   */
  function detectCampusZone() {
    let current = 'Korytarz Kampusu ALK';
    let icon = '📍';

    if (player.x < 210 && player.y < 160) {
      current = 'Aula A';
      icon = '🏛️';
    } else if (player.x > 580 && player.y < 160) {
      current = 'Biblioteka';
      icon = '📚';
    } else if (player.x < 210 && player.y > 370) {
      current = 'Lab Komputerowy';
      icon = '💻';
    } else if (player.x > 580 && player.y > 370) {
      current = 'Dziekanat';
      icon = '📋';
    } else if (player.x >= 230 && player.x <= 570 && player.y >= 140 && player.y <= 400) {
      current = 'Patio ALK 🌿';
      icon = '🌿';
    }

    state.campusZoneName = current;
    campusStatusEl.textContent = current;
    campusIconEl.textContent = icon;
  }

  /**
   * Tworzenie efektów cząsteczkowych
   */
  function spawnParticles(x, y, color, count = 8, maxSpeed = 2) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * maxSpeed + 0.8;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 4 + 2,
        life: 1.0,
        decay: Math.random() * 0.03 + 0.02
      });
    }
  }

  /**
   * Tworzenie confetti przy wygranej
   */
  function spawnConfetti() {
    const colors = ['#f2a900', '#ffc740', '#004b87', '#10b981', '#ffffff', '#e63946'];
    for (let i = 0; i < 90; i++) {
      state.confetti.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * -120,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 3 + 2.5,
        size: Math.random() * 7 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 8
      });
    }
  }

  /**
   * Aktualizacja paska HUD i wskaźników
   */
  function updateHUD() {
    ectsValueEl.textContent = state.ects;
    ectsTargetEl.textContent = TARGET_ECTS;
    const ectsPercent = Math.min(100, Math.round((state.ects / TARGET_ECTS) * 100));
    ectsProgressBarEl.style.width = ectsPercent + '%';

    const staminaPercent = Math.round((state.stamina / state.maxStamina) * 100);
    staminaFillEl.style.width = staminaPercent + '%';
    staminaPercentEl.textContent = staminaPercent + '%';

    if (staminaPercent < 25) {
      staminaFillEl.classList.add('stamina-low');
    } else {
      staminaFillEl.classList.remove('stamina-low');
    }

    // Status zagrożenia
    const dist = Math.hypot(player.x - professor.x, player.y - professor.y);
    if (state.freezeTimer > 0) {
      dangerStatusEl.textContent = 'Status: Egzaminator sparaliżowany (Gemini AI)!';
      dangerStatusEl.className = 'status-alert safe';
    } else if (dist < 180) {
      dangerStatusEl.textContent = 'Status: UWAGA! Egzaminator w pościgu!';
      dangerStatusEl.className = 'status-alert danger';
    } else {
      dangerStatusEl.textContent = state.hasShield ? 'Status: Bezpiecznie (Tarcza aktywna)' : 'Status: Bezpiecznie';
      dangerStatusEl.className = 'status-alert safe';
    }
  }

  /**
   * Formatowanie czasu MM:SS
   */
  function formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }

  /**
   * Obsługa porażki: Kampania Wrześniowa
   */
  function handleGameOver() {
    state.gameState = 'GAMEOVER';
    window.SoundSystem.play('hit');

    failEctsEl.textContent = `${state.ects} / ${TARGET_ECTS} ECTS`;
    failTimeEl.textContent = formatTime(state.elapsedTime);

    const failQuotes = [
      '„Panie Kolego, zero punktów z kolokwium! Widzimy się we wrześniu na poprawce!”',
      '„Nie ma litości! Zaliczenie semestru odrzucone w systemie USOS!”',
      '„Ten bilans się nie zamyka. Kampania Wrześniowa gwarantowana!”'
    ];
    failQuoteEl.textContent = failQuotes[Math.floor(Math.random() * failQuotes.length)];

    modalGameOver.classList.remove('hidden');
  }

  /**
   * Obsługa zwycięstwa: Zaliczony Semestr
   */
  function handleVictory() {
    state.gameState = 'VICTORY';
    window.SoundSystem.play('win');
    spawnConfetti();

    winTimeEl.textContent = formatTime(state.elapsedTime);

    const sec = Math.floor(state.elapsedTime / 1000);
    let grade = '5.0 (Bardzo Dobry)';
    if (sec > 80) grade = '4.5 (Dobry Plus)';
    if (sec > 130) grade = '4.0 (Dobry)';
    if (sec > 170) grade = '3.5 (Dostateczny Plus)';
    winGradeEl.textContent = grade;

    modalVictory.classList.remove('hidden');
  }

  /**
   * Rozpoczęcie nowej gry
   */
  function startNewGame() {
    window.SoundSystem.init();

    state.gameState = 'PLAYING';
    state.ects = 0;
    state.stamina = 100;
    state.startTime = Date.now();
    state.coffeeTimer = 0;
    state.freezeTimer = 0;
    state.hasShield = false;
    state.lastQuoteChange = Date.now();
    state.particles = [];
    state.confetti = [];

    // Reset pozycji
    player.x = 400;
    player.y = 440;
    player.facing = 'right';

    professor.x = 400;
    professor.y = 80;
    professor.facing = 'left';
    professor.speed = professor.baseSpeed;

    spawnInitialItems();
    updateHUD();

    modalStart.classList.add('hidden');
    modalGameOver.classList.add('hidden');
    modalVictory.classList.add('hidden');
    pauseOverlay.classList.add('hidden');

    triggerProfessorQuote('„A gdzie przypis harwardzki?! Sesję czas zacząć!”');
  }

  /**
   * Przełączanie pauzy
   */
  function togglePause() {
    if (state.gameState === 'PLAYING') {
      state.gameState = 'PAUSED';
      pauseOverlay.classList.remove('hidden');
      pauseIcon.textContent = '▶️';
    } else if (state.gameState === 'PAUSED') {
      state.gameState = 'PLAYING';
      pauseOverlay.classList.add('hidden');
      pauseIcon.textContent = '⏸️';
    }
  }

  // --- Obsługa klawiatury (WASD / Strzałki / Spacja / Shift) ---
  window.addEventListener('keydown', (e) => {
    window.SoundSystem.init();

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }

    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      togglePause();
      return;
    }

    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') state.keys.up = true;
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') state.keys.down = true;
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') state.keys.left = true;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') state.keys.right = true;

    // Sprint pod Spacją lub Shiftem
    if (e.key === 'Shift' || e.key === ' ') {
      state.keys.sprint = true;
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') state.keys.up = false;
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') state.keys.down = false;
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') state.keys.left = false;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') state.keys.right = false;
    if (e.key === 'Shift' || e.key === ' ') state.keys.sprint = false;
  });

  // --- Obsługa przycisków dotykowych (D-Pad + Sprint) ---
  function bindTouch(btn, prop) {
    if (!btn) return;
    const onPress = (e) => {
      e.preventDefault();
      window.SoundSystem.init();
      state.keys[prop] = true;
      btn.classList.add('touch-active');
    };
    const onRelease = (e) => {
      e.preventDefault();
      state.keys[prop] = false;
      btn.classList.remove('touch-active');
    };

    btn.addEventListener('touchstart', onPress, { passive: false });
    btn.addEventListener('touchend', onRelease, { passive: false });
    btn.addEventListener('touchcancel', onRelease, { passive: false });
    btn.addEventListener('mousedown', onPress);
    btn.addEventListener('mouseup', onRelease);
    btn.addEventListener('mouseleave', onRelease);
  }

  bindTouch(touchUp, 'up');
  bindTouch(touchDown, 'down');
  bindTouch(touchLeft, 'left');
  bindTouch(touchRight, 'right');
  bindTouch(touchSprint, 'sprint');

  // --- Przyciski UI ---
  btnStartGame.addEventListener('click', startNewGame);
  btnRetryGame.addEventListener('click', startNewGame);
  btnPlayAgain.addEventListener('click', startNewGame);
  btnResume.addEventListener('click', () => {
    if (state.gameState === 'PAUSED') togglePause();
  });
  btnPause.addEventListener('click', togglePause);

  btnSound.addEventListener('click', () => {
    const muted = window.SoundSystem.toggleMute();
    soundIcon.textContent = muted ? '🔇' : '🔊';
  });

  btnHelpToggle.addEventListener('click', () => {
    if (state.gameState === 'PLAYING') {
      state.gameState = 'PAUSED';
      pauseOverlay.classList.remove('hidden');
    }
    modalStart.classList.remove('hidden');
  });

  // ==========================================================================
  // Główna logika fizyki i aktualizacji stanu gry (update)
  // ==========================================================================
  function update(dt) {
    if (state.gameState !== 'PLAYING') return;

    state.elapsedTime = Date.now() - state.startTime;

    // Odliczanie czasu power-upów
    if (state.coffeeTimer > 0) state.coffeeTimer -= dt;
    if (state.freezeTimer > 0) state.freezeTimer -= dt;
    if (state.quoteDisplayTime > 0) state.quoteDisplayTime -= dt;

    // 2. Gracz (Student): Ruch wektorowy i sprint ze staminą
    const isMoving = state.keys.up || state.keys.down || state.keys.left || state.keys.right;
    const wantsSprint = state.keys.sprint;

    if (wantsSprint && isMoving && state.stamina > 3) {
      state.isSprinting = true;
      state.stamina = Math.max(0, state.stamina - dt * 28);
      if (Math.random() < 0.3) {
        spawnParticles(player.x, player.y + 12, 'rgba(56, 189, 248, 0.7)', 1, 1);
      }
    } else {
      state.isSprinting = false;
      // Regeneracja staminy przy chodzeniu lub postoju
      state.stamina = Math.min(state.maxStamina, state.stamina + dt * 16);
    }

    // Mnożnik prędkości z kawy (turbo 1.5x przez 5 sekund)
    const turboMultiplier = state.coffeeTimer > 0 ? 1.5 : 1.0;
    const currentSpeed = (state.isSprinting ? player.sprintSpeed : player.baseSpeed) * turboMultiplier;

    // Wektor kierunku
    let dirX = 0;
    let dirY = 0;
    if (state.keys.up) dirY -= 1;
    if (state.keys.down) dirY += 1;
    if (state.keys.left) {
      dirX -= 1;
      player.facing = 'left';
    }
    if (state.keys.right) {
      dirX += 1;
      player.facing = 'right';
    }

    // Normalizacja wektora
    if (dirX !== 0 && dirY !== 0) {
      const len = Math.SQRT2;
      dirX /= len;
      dirY /= len;
    }

    // Przesuwanie ze ślizganiem po ścianach
    const nextX = player.x + dirX * currentSpeed;
    if (!checkCollision(nextX, player.y, player.radius)) {
      player.x = nextX;
    }

    const nextY = player.y + dirY * currentSpeed;
    if (!checkCollision(player.x, nextY, player.radius)) {
      player.y = nextY;
    }

    // Animacja kroków
    if (isMoving) {
      player.walkTimer += dt * 8;
      player.animFrame = Math.sin(player.walkTimer);
    } else {
      player.animFrame = 0;
    }

    // 3. Przeciwnik (Egzaminator): Algorytm śledzenia studenta
    // Egzaminator przyspiesza z każdym zdobytym punktem ECTS!
    const speedBoostFromECTS = state.ects * 0.055;
    professor.speed = professor.baseSpeed + speedBoostFromECTS;

    // Jeśli Gemini AI nie zamroziło profesora - prowadzi pościg
    if (state.freezeTimer <= 0) {
      const pDx = player.x - professor.x;
      const pDy = player.y - professor.y;
      const pDist = Math.hypot(pDx, pDy);

      if (pDist > 4) {
        let pVx = (pDx / pDist) * professor.speed;
        let pVy = (pDy / pDist) * professor.speed;

        professor.facing = pVx >= 0 ? 'right' : 'left';

        // Ślizganie profesora wzdłuż ścian
        if (!checkCollision(professor.x + pVx, professor.y, professor.radius)) {
          professor.x += pVx;
        } else {
          professor.y += (pVy > 0 ? 1 : -1) * (professor.speed * 0.85);
        }

        if (!checkCollision(professor.x, professor.y + pVy, professor.radius)) {
          professor.y += pVy;
        } else {
          professor.x += (pVx > 0 ? 1 : -1) * (professor.speed * 0.85);
        }

        professor.wobble = Math.sin(Date.now() * 0.01) * 2;
      }
    } else {
      // Efekt cyber-paraliżu Gemini AI
      if (Math.random() < 0.2) {
        spawnParticles(professor.x, professor.y, '#38bdf8', 1, 1.5);
      }
    }

    // Kolizja Profesora ze Studentem (Złapanie)
    const distToProf = Math.hypot(player.x - professor.x, player.y - professor.y);
    if (distToProf < player.radius + professor.radius - 4) {
      if (state.freezeTimer > 0) {
        // Profesor jest sparaliżowany, nie może złapać studenta
      } else if (state.hasShield) {
        // 🪪 Legitymacja ALK: absorbuje 1 uderzenie!
        state.hasShield = false;
        window.SoundSystem.play('shield');
        spawnParticles(player.x, player.y, '#ffc740', 20, 4);

        // Odrzucenie profesora w tył i chwilowy paraliż na 1.5 sekundy
        state.freezeTimer = 1.5;
        triggerProfessorQuote('„Ta legitymacja jest jeszcze ważna... Ale to Pana ostatnia szansa!”');
      } else {
        // Złapanie przez egzaminatora -> Kampania Wrześniowa!
        handleGameOver();
        return;
      }
    }

    // 4. Zbieranie przedmiotów
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      const dist = Math.hypot(player.x - it.x, player.y - it.y);

      if (dist < player.radius + it.radius + 2) {
        switch (it.type) {
          // 📜 ECTS (zbierz 30 = wygrana)
          case 'ects':
            state.ects += it.value;
            window.SoundSystem.play('ects');
            spawnParticles(it.x, it.y, '#f2a900', 12, 3);

            if (state.ects >= TARGET_ECTS) {
              state.ects = TARGET_ECTS;
              updateHUD();
              handleVictory();
              return;
            }
            break;

          // ☕ Kawa z Patio ALK (5s turbo-szybkości)
          case 'coffee':
            state.coffeeTimer = 5.0;
            state.stamina = state.maxStamina; // pełna stamina
            window.SoundSystem.play('coffee');
            spawnParticles(it.x, it.y, '#ffc740', 16, 3.5);
            triggerProfessorQuote('„Kawa z Patio nie uratuje Pana przed pytaniem z ekonometrii!”');
            break;

          // 💻 Gemini AI (paraliżuje profesora na 3.5s)
          case 'gemini':
            state.freezeTimer = 3.5;
            window.SoundSystem.play('freeze');
            spawnParticles(it.x, it.y, '#38bdf8', 18, 3.5);
            triggerProfessorQuote('„Czy ten esej pisał Pan, czy ChatGPT?!”');
            break;

          // 🪪 Legitymacja ALK (tarcza absorbująca 1 uderzenie)
          case 'shield':
            state.hasShield = true;
            window.SoundSystem.play('shield');
            spawnParticles(it.x, it.y, '#004b87', 16, 3);
            triggerProfessorQuote('„Proszę przygotować indeks i legitymację do kontroli!”');
            break;
        }

        items.splice(i, 1);
        maintainItemStock();
      }
    }

    // Losowe rzucanie akademickich cytatów co 12 sekund
    if (Date.now() - state.lastQuoteChange > 12000) {
      state.lastQuoteChange = Date.now();
      triggerProfessorQuote();
    }

    // Aktualizacja cząsteczek
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) state.particles.splice(i, 1);
    }

    // Aktualizacja confetti (przy wygranej)
    for (let i = state.confetti.length - 1; i >= 0; i--) {
      const c = state.confetti[i];
      c.x += c.vx;
      c.y += c.vy;
      c.rotation += c.rotSpeed;
      if (c.y > CANVAS_HEIGHT + 20) {
        c.y = -10;
        c.x = Math.random() * CANVAS_WIDTH;
      }
    }

    detectCampusZone();
    updateHUD();
  }

  // ==========================================================================
  // Renderowanie kampusu, postaci, przedmiotów i efektów
  // ==========================================================================

  /**
   * 1. Rysowanie kampusu ALK, ścian, aul i zielonego Patio
   */
  function renderCampus() {
    // Tło ogólne posadzki kampusu
    ctx.fillStyle = '#0a1128';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Kafelki korytarzy
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Wnętrza pomieszczeń / aul
    // Aula A
    ctx.fillStyle = 'rgba(0, 34, 68, 0.45)';
    ctx.fillRect(16, 16, 200, 134);

    // Biblioteka
    ctx.fillStyle = 'rgba(0, 75, 135, 0.25)';
    ctx.fillRect(570, 16, 214, 134);

    // Lab Komputerowy
    ctx.fillStyle = 'rgba(0, 34, 68, 0.45)';
    ctx.fillRect(16, 384, 200, 140);

    // Dziekanat
    ctx.fillStyle = 'rgba(0, 75, 135, 0.25)';
    ctx.fillRect(570, 384, 214, 140);

    // Centralne Patio ALK 🌿 - zielony dziedziniec z roślinami i szklanym dachem
    ctx.fillStyle = 'rgba(16, 185, 129, 0.14)';
    ctx.fillRect(230, 130, 340, 280);

    // Szklany świetlik sufitowy nad Patio ALK
    ctx.strokeStyle = 'rgba(242, 169, 0, 0.12)';
    ctx.lineWidth = 1;
    for (let x = 250; x <= 550; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 130);
      ctx.lineTo(x, 410);
      ctx.stroke();
    }
    for (let y = 150; y <= 390; y += 40) {
      ctx.beginPath();
      ctx.moveTo(230, y);
      ctx.lineTo(570, y);
      ctx.stroke();
    }

    // Podpisy Aul i Patio na posadzce
    campusZones.forEach(zone => {
      ctx.font = '700 13px "Chakra Petch", sans-serif';
      ctx.fillStyle = zone.name.includes('Patio') ? 'rgba(16, 185, 129, 0.85)' : 'rgba(242, 169, 0, 0.6)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(zone.name, zone.x, zone.y);
    });

    // Rysowanie ścian i ławek Patio
    obstacles.forEach(obs => {
      // Cień ściany
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(obs.x + 3, obs.y + 4, obs.w, obs.h);

      // Czy to ławka / kwietnik na Patio?
      const isPatioPlant = obs.y >= 170 && obs.y <= 360 && obs.x >= 320 && obs.x <= 480;
      if (isPatioPlant) {
        ctx.fillStyle = '#064e3b';
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

        // Liście i kwiaty
        ctx.fillStyle = '#34d399';
        for (let lx = obs.x + 15; lx < obs.x + obs.w; lx += 26) {
          ctx.beginPath();
          ctx.arc(lx, obs.y + obs.h / 2, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Ściana uczelni: granat ALK z elegancką złotą krawędzią
        ctx.fillStyle = '#002244';
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.strokeStyle = '#f2a900';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
      }
    });

    // Drzewka ozdobne na Patio ALK
    const trees = [
      { x: 260, y: 160 },
      { x: 540, y: 160 },
      { x: 260, y: 380 },
      { x: 540, y: 380 }
    ];
    trees.forEach(t => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(t.x + 2, t.y + 4, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#065f46';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(t.x - 3, t.y - 3, 11, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /**
   * 4. Rysowanie przedmiotów (ECTS, Kawa, Gemini AI, Legitymacja ALK)
   */
  function renderItems() {
    const time = Date.now() * 0.005;

    items.forEach(it => {
      const bob = Math.sin(time + it.bobOffset) * 3;
      const cy = it.y + bob;

      // Cień przedmiotu
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(it.x, it.y + 12, it.radius * 0.9, it.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      switch (it.type) {
        // 📜 ECTS
        case 'ects': {
          const grad = ctx.createRadialGradient(it.x, cy, 2, it.x, cy, it.radius * 1.8);
          grad.addColorStop(0, 'rgba(255, 199, 64, 0.45)');
          grad.addColorStop(1, 'rgba(242, 169, 0, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(it.x, cy, it.radius * 1.8, 0, Math.PI * 2);
          ctx.fill();

          ctx.font = '16px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('📜', it.x, cy);

          ctx.font = '800 9px "Chakra Petch", sans-serif';
          ctx.fillStyle = '#ffc740';
          ctx.fillText(`+${it.value} ECTS`, it.x, cy - 13);
          break;
        }

        // ☕ Kawa z Patio ALK
        case 'coffee': {
          ctx.font = '16px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('☕', it.x, cy);

          ctx.font = '800 8.5px "Chakra Petch", sans-serif';
          ctx.fillStyle = '#ffc740';
          ctx.fillText('TURBO KAWA', it.x, cy - 13);
          break;
        }

        // 💻 Gemini AI
        case 'gemini': {
          const grad = ctx.createRadialGradient(it.x, cy, 2, it.x, cy, it.radius * 2);
          grad.addColorStop(0, 'rgba(56, 189, 248, 0.6)');
          grad.addColorStop(1, 'rgba(0, 75, 135, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(it.x, cy, it.radius * 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.font = '16px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('💻', it.x, cy);

          ctx.font = '800 8.5px "Chakra Petch", sans-serif';
          ctx.fillStyle = '#38bdf8';
          ctx.fillText('GEMINI AI', it.x, cy - 13);
          break;
        }

        // 🪪 Legitymacja ALK
        case 'shield': {
          ctx.font = '16px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🪪', it.x, cy);

          ctx.font = '800 8.5px "Chakra Petch", sans-serif';
          ctx.fillStyle = '#10b981';
          ctx.fillText('TARCZA ALK', it.x, cy - 13);
          break;
        }
      }
    });
  }

  /**
   * 2. Rysowanie Gracza (Student ALK)
   */
  function renderPlayer() {
    const px = player.x;
    const py = player.y;
    const isLeft = player.facing === 'left';
    const wobble = player.animFrame * 2.2;

    // Cień
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(px, py + 16, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 🪪 Tarcza Legitymacji ALK (Halo ochronne)
    if (state.hasShield) {
      const shieldPulse = Math.sin(Date.now() * 0.008) * 3;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(px, py, player.radius + 10 + shieldPulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.fill();
    }

    // ☕ Efekt turbo-kawy
    if (state.coffeeTimer > 0) {
      ctx.strokeStyle = '#ffc740';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, player.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Plecak studenta
    ctx.fillStyle = '#004b87';
    ctx.beginPath();
    const backpackOffset = isLeft ? 9 : -9;
    ctx.roundRect(px + backpackOffset - 4, py - 4 + wobble, 8, 12, 3);
    ctx.fill();

    // Tułów: Bluza uczelniana ALK
    ctx.fillStyle = '#002244';
    ctx.beginPath();
    ctx.roundRect(px - 10, py - 6 + wobble, 20, 18, 4);
    ctx.fill();
    ctx.strokeStyle = '#f2a900';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Złoty napis ALK na bluzie
    ctx.font = '800 7px "Chakra Petch", sans-serif';
    ctx.fillStyle = '#ffc740';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ALK', px, py + 3 + wobble);

    // Głowa
    ctx.fillStyle = '#ffd1a4';
    ctx.beginPath();
    ctx.arc(px, py - 12 + wobble, 8, 0, Math.PI * 2);
    ctx.fill();

    // Czapka absolwenta / biret z chwostem
    ctx.fillStyle = '#0a1128';
    ctx.beginPath();
    ctx.ellipse(px, py - 18 + wobble, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2a900';
    ctx.beginPath();
    ctx.arc(px + (isLeft ? -8 : 8), py - 16 + wobble, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Oczy
    ctx.fillStyle = '#001428';
    const eyeX = isLeft ? px - 4 : px + 4;
    ctx.fillRect(eyeX, py - 13 + wobble, 2, 2);

    // Etykieta STUDENT
    ctx.font = '700 8.5px "Chakra Petch", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('STUDENT', px, py - 27 + wobble);
  }

  /**
   * 3. Rysowanie Przeciwnika (Egzaminator) i komiksowego dymka
   */
  function renderProfessor() {
    const ex = professor.x;
    const ey = professor.y;
    const isLeft = professor.facing === 'left';
    const wobble = professor.wobble;

    // Cień
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(ex, ey + 18, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Jeśli Egzaminator jest sparaliżowany przez Gemini AI
    if (state.freezeTimer > 0) {
      ctx.font = '800 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💻❓', ex, ey - 32);
    }

    // Tułów: Ciemny garnitur
    ctx.fillStyle = '#1a1f2c';
    ctx.beginPath();
    ctx.roundRect(ex - 12, ey - 8 + wobble, 24, 22, 4);
    ctx.fill();

    // Koszula i krawat
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ex - 4, ey - 8 + wobble, 8, 8);
    ctx.fillStyle = '#e63946';
    ctx.beginPath();
    ctx.moveTo(ex, ey - 8 + wobble);
    ctx.lineTo(ex - 3, ey + 2 + wobble);
    ctx.lineTo(ex, ey + 6 + wobble);
    ctx.lineTo(ex + 3, ey + 2 + wobble);
    ctx.closePath();
    ctx.fill();

    // Teczka egzaminacyjna z czerwonym długopisem
    ctx.fillStyle = '#831843';
    const folderX = isLeft ? ex - 16 : ex + 10;
    ctx.fillRect(folderX, ey + wobble, 7, 11);
    ctx.fillStyle = '#e63946'; // czerwony długopis
    ctx.fillRect(folderX + 6, ey - 2 + wobble, 2, 7);

    // Głowa
    ctx.fillStyle = '#fcd34d';
    ctx.beginPath();
    ctx.arc(ex, ey - 15 + wobble, 9, 0, Math.PI * 2);
    ctx.fill();

    // Siwe włosy z łysiną
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(ex, ey - 18 + wobble, 8, Math.PI, 0);
    ctx.fill();

    // Złote okulary profesorskie
    ctx.strokeStyle = '#f2a900';
    ctx.lineWidth = 1.5;
    const glassEyeX = isLeft ? ex - 4 : ex + 4;
    ctx.strokeRect(glassEyeX - 3, ey - 17 + wobble, 6, 4);

    // Podpis
    ctx.font = '700 8.5px "Chakra Petch", sans-serif';
    ctx.fillStyle = state.freezeTimer > 0 ? '#38bdf8' : '#e63946';
    ctx.textAlign = 'center';
    ctx.fillText('EGZAMINATOR', ex, ey - 27 + wobble);

    // Komiksowy dymek na Canvasie tuż nad profesorem
    if (state.quoteDisplayTime > 0) {
      renderCanvasSpeechBubble(ex, ey - 42 + wobble, state.activeQuote);
    }
  }

  /**
   * Rysowanie komiksowego dymka wypowiedzi bezpośrednio na Canvasie
   */
  function renderCanvasSpeechBubble(targetX, targetY, text) {
    ctx.font = '700 11.5px "Inter", sans-serif';
    const textWidth = ctx.measureText(text).width;
    const bubbleWidth = Math.max(140, textWidth + 24);
    const bubbleHeight = 30;
    let bx = targetX - bubbleWidth / 2;
    let by = targetY - bubbleHeight - 10;

    // Utrzymaj dymek wewnątrz ekranu
    bx = Math.max(20, Math.min(CANVAS_WIDTH - bubbleWidth - 20, bx));
    by = Math.max(20, by);

    // Tło dymka
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#002244';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.roundRect(bx, by, bubbleWidth, bubbleHeight, 8);
    ctx.fill();
    ctx.stroke();

    // Trójkątny wskaźnik dymka
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(targetX - 7, by + bubbleHeight);
    ctx.lineTo(targetX, by + bubbleHeight + 8);
    ctx.lineTo(targetX + 7, by + bubbleHeight);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Tekst w dymku
    ctx.fillStyle = '#002244';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + bubbleWidth / 2, by + bubbleHeight / 2);
  }

  /**
   * Rysowanie cząsteczek i confetti
   */
  function renderParticles() {
    state.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    state.confetti.forEach(c => {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate((c.rotation * Math.PI) / 180);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.7);
      ctx.restore();
    });
  }

  // --- Główna pętla renderowania (requestAnimationFrame) ---
  let lastTimestamp = performance.now();
  function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
    lastTimestamp = timestamp;

    update(dt);

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    renderCampus();
    renderItems();
    renderPlayer();
    renderProfessor();
    renderParticles();

    requestAnimationFrame(gameLoop);
  }

  // Rozpoczęcie nasłuchiwania pętli gry
  requestAnimationFrame(gameLoop);

  // Inicjalny stan kampusu
  detectCampusZone();
  updateHUD();
})();
