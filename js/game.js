/**
 * Kozminski Escape: Polowanie na ECTS
 * Główny silnik gry (js/game.js)
 * Akademia Leona Koźmińskiego w Warszawie
 */

(function () {
  'use strict';

  // --- Elementy DOM ---
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // HUD
  const ectsValueEl = document.getElementById('ects-value');
  const ectsTargetEl = document.getElementById('ects-target');
  const ectsProgressBarEl = document.getElementById('ects-progress-bar');
  const staminaFillEl = document.getElementById('stamina-fill');
  const staminaPercentEl = document.getElementById('stamina-percent');
  const campusStatusEl = document.getElementById('campus-status');
  const dangerStatusEl = document.getElementById('danger-status');
  const campusIconEl = document.getElementById('campus-icon');

  // Dymek profesora
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

  // Modale
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

  // Przyciski dotykowe
  const touchUp = document.getElementById('touch-up');
  const touchDown = document.getElementById('touch-down');
  const touchLeft = document.getElementById('touch-left');
  const touchRight = document.getElementById('touch-right');
  const touchSprint = document.getElementById('touch-sprint');

  // --- Stałe gry ---
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 540;
  const TARGET_ECTS = 30;

  // Cytaty surowego profesora z Koźmińskiego
  const PROFESSOR_QUOTES = [
    '„Panie Kolego! Gdzie jest bibliografia w Pana eseju?! Widzę Pana na korytarzu!”',
    '„Termin w USOSie minął 10 minut temu! Żadnych zwolnień!”',
    '„Zero punktów z kolokwium poprawkowego! Zapraszam we wrześniu!”',
    '„Dziekanat nie przyjmie tego podania bez podpisu promotora!”',
    '„Proszę schować ten telefon! To jest egzamin komisyjny!”',
    '„Czy Pan w ogóle zajrzał do sylabusa przed przyjściem na zaliczenie?!”',
    '„W tym tempie to Pan nie zdobędzie nawet absolutorium!”',
    '„Znam te studenckie wymówki! Zaraz Pana dogonię na Patio!”',
    '„Przypis harwardzki jest niepoprawny! Cała praca do poprawki!”'
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
    lastQuoteChange: 0,
    alertCooldown: 0,
    campusZone: 'Budynek A: Korytarz',
    isDistracted: false,
    distractTimer: 0,
    coffeeBoostTimer: 0,
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

  // --- Przeszkody na kampusie ALK (Ściany, Biurka, Dziekanat, Kolumny) ---
  const obstacles = [
    // Ściany zewnętrzne
    { x: 0, y: 0, w: CANVAS_WIDTH, h: 20 },
    { x: 0, y: CANVAS_HEIGHT - 20, w: CANVAS_WIDTH, h: 20 },
    { x: 0, y: 0, w: 20, h: CANVAS_HEIGHT },
    { x: CANVAS_WIDTH - 20, y: 0, w: 20, h: CANVAS_HEIGHT },

    // Przegroda Sektor A (Audytorium)
    { x: 190, y: 20, w: 18, h: 140 },
    { x: 190, y: 210, w: 18, h: 140 },

    // Przegroda Sektor B (Dziekanat i Biblioteka)
    { x: 590, y: 20, w: 18, h: 140 },
    { x: 590, y: 210, w: 18, h: 140 },

    // Zielone Patio (centralne ławki / kwietniki ALK)
    { x: 340, y: 160, w: 120, h: 35 },
    { x: 340, y: 345, w: 120, h: 35 },
    
    // Kolumny architektoniczne
    { x: 280, y: 90, w: 28, h: 28 },
    { x: 490, y: 90, w: 28, h: 28 },
    { x: 280, y: 420, w: 28, h: 28 },
    { x: 490, y: 420, w: 28, h: 28 }
  ];

  // --- Gracz (Student ALK) ---
  const player = {
    x: 80,
    y: 270,
    radius: 16,
    baseSpeed: 3.2,
    sprintSpeed: 5.6,
    facing: 'right',
    animFrame: 0,
    walkTimer: 0
  };

  // --- Egzaminator (Prof. Bezlitosny) ---
  const professor = {
    x: 720,
    y: 270,
    radius: 18,
    speed: 2.35,
    normalSpeed: 2.35,
    chaseSpeed: 3.3,
    facing: 'left',
    animFrame: 0,
    alertDistance: 190,
    catchDistance: 24
  };

  // --- Przedmioty (ECTS, Kawa, Notatki) ---
  let items = [];

  // Losowanie losowej wolnej pozycji na mapie
  function getRandomFreePosition(radius = 20) {
    let attempts = 0;
    while (attempts < 100) {
      attempts++;
      const x = Math.floor(Math.random() * (CANVAS_WIDTH - 80)) + 40;
      const y = Math.floor(Math.random() * (CANVAS_HEIGHT - 80)) + 40;

      // Sprawdź kolizję z przeszkodami
      let collides = false;
      for (const obs of obstacles) {
        if (
          x + radius > obs.x - 10 &&
          x - radius < obs.x + obs.w + 10 &&
          y + radius > obs.y - 10 &&
          y - radius < obs.y + obs.h + 10
        ) {
          collides = true;
          break;
        }
      }

      // Nie twórz za blisko gracza
      const distToPlayer = Math.hypot(x - player.x, y - player.y);
      if (!collides && distToPlayer > 80) {
        return { x, y };
      }
    }
    return { x: 400, y: 270 };
  }

  // Generowanie przedmiotów na mapie
  function populateItems() {
    items = [];

    // Duże przedmioty ECTS (+3 do +5 ECTS)
    for (let i = 0; i < 4; i++) {
      const pos = getRandomFreePosition();
      items.push({
        id: 'ects-big-' + i,
        type: 'ects',
        value: 5,
        name: 'Projekt Zespołowy (5 ECTS)',
        x: pos.x,
        y: pos.y,
        radius: 14,
        pulse: Math.random() * Math.PI
      });
    }

    // Standardowe zwoje ECTS (+1 do +2 ECTS)
    for (let i = 0; i < 8; i++) {
      const pos = getRandomFreePosition();
      items.push({
        id: 'ects-' + i,
        type: 'ects',
        value: 2,
        name: 'Zaliczenie Ćwiczeń (2 ECTS)',
        x: pos.x,
        y: pos.y,
        radius: 11,
        pulse: Math.random() * Math.PI
      });
    }

    // Kawy z Patio ALK
    for (let i = 0; i < 3; i++) {
      const pos = getRandomFreePosition();
      items.push({
        id: 'coffee-' + i,
        type: 'coffee',
        name: 'Kawa z Patio ALK',
        x: pos.x,
        y: pos.y,
        radius: 12,
        pulse: Math.random() * Math.PI
      });
    }

    // Notatki do zmylenia profesora
    for (let i = 0; i < 2; i++) {
      const pos = getRandomFreePosition();
      items.push({
        id: 'notes-' + i,
        type: 'notes',
        name: 'Ściąga / Notatki',
        x: pos.x,
        y: pos.y,
        radius: 11,
        pulse: Math.random() * Math.PI
      });
    }
  }

  // Uzupełnianie brakujących ECTS jeśli na mapie zostało ich za mało
  function replenishECTS() {
    const ectsItems = items.filter(it => it.type === 'ects');
    if (ectsItems.length < 5 && state.ects < TARGET_ECTS) {
      const pos = getRandomFreePosition();
      items.push({
        id: 'ects-respawn-' + Date.now(),
        type: 'ects',
        value: Math.random() > 0.4 ? 3 : 2,
        name: 'Kolokwium (ECTS)',
        x: pos.x,
        y: pos.y,
        radius: 12,
        pulse: 0
      });
    }

    // Od czasu do czasu odnawiaj kawę na Patio
    const coffeeItems = items.filter(it => it.type === 'coffee');
    if (coffeeItems.length < 2) {
      const pos = getRandomFreePosition();
      items.push({
        id: 'coffee-respawn-' + Date.now(),
        type: 'coffee',
        name: 'Espresso z Patio',
        x: pos.x,
        y: pos.y,
        radius: 12,
        pulse: 0
      });
    }
  }

  // --- Aktualizacja strefy kampusu na podstawie pozycji gracza ---
  function updateCampusZone() {
    let zoneName = 'Korytarz Główny ALK';
    let icon = '📍';

    if (player.x < 190) {
      zoneName = 'Budynek A: Audytorium';
      icon = '🏛️';
    } else if (player.x > 590) {
      zoneName = 'Budynek B: Dziekanat';
      icon = '📚';
    } else {
      // Centralne Patio ALK
      if (player.y > 140 && player.y < 400) {
        zoneName = 'Zielone Patio ALK (Ogród)';
        icon = '🌿';
      } else {
        zoneName = 'Kozminski Bistro & Lounge';
        icon = '☕';
      }
    }

    state.campusZone = zoneName;
    campusStatusEl.textContent = zoneName;
    campusIconEl.textContent = icon;
  }

  // --- Cytat Profesora z animacją dymka ---
  function triggerProfessorQuote(customQuote = null) {
    const quote = customQuote || PROFESSOR_QUOTES[Math.floor(Math.random() * PROFESSOR_QUOTES.length)];
    professorQuoteEl.textContent = quote;
    professorBubbleEl.classList.add('bubble-alert');
    setTimeout(() => {
      professorBubbleEl.classList.remove('bubble-alert');
    }, 450);
  }

  // --- Kolizje prostokąt-okrąg z obsługą ślizgania przy ścianach ---
  function checkObstacleCollision(circleX, circleY, radius) {
    for (const obs of obstacles) {
      // Najbliższy punkt prostokąta do środka okręgu
      const closestX = Math.max(obs.x, Math.min(circleX, obs.x + obs.w));
      const closestY = Math.max(obs.y, Math.min(circleY, obs.y + obs.h));

      const dx = circleX - closestX;
      const dy = circleY - closestY;
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared < radius * radius) {
        return true;
      }
    }
    return false;
  }

  // --- Inicjalizacja i restart gry ---
  function startNewGame() {
    window.gameAudio.init();
    window.gameAudio.playClick();

    state.gameState = 'PLAYING';
    state.ects = 0;
    state.stamina = 100;
    state.startTime = Date.now();
    state.lastQuoteChange = Date.now();
    state.alertCooldown = 0;
    state.isDistracted = false;
    state.distractTimer = 0;
    state.coffeeBoostTimer = 0;
    state.particles = [];
    state.confetti = [];

    player.x = 90;
    player.y = 270;
    player.facing = 'right';

    professor.x = 710;
    professor.y = 270;
    professor.facing = 'left';

    populateItems();
    updateHUD();

    // Ukryj modale
    modalStart.classList.add('hidden');
    modalGameOver.classList.add('hidden');
    modalVictory.classList.add('hidden');
    pauseOverlay.classList.add('hidden');

    triggerProfessorQuote('„Zegar w USOS tyka, Panie Kolego! Proszę natychmiast podejść do egzaminu!”');
  }

  // --- Obsługa klawiatury ---
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault(); // zapobiegaj przewijaniu strony
    }

    // Pauza
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      togglePause();
      return;
    }

    // Klawisze ruchu
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') state.keys.up = true;
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') state.keys.down = true;
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') state.keys.left = true;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') state.keys.right = true;

    // Sprint
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

  // --- Obsługa sterowania dotykowego (D-Pad + Sprint) ---
  function bindTouchButton(btn, keyProp) {
    if (!btn) return;
    const startHandler = (e) => {
      e.preventDefault();
      window.gameAudio.init();
      state.keys[keyProp] = true;
      btn.classList.add('touch-active');
    };
    const endHandler = (e) => {
      e.preventDefault();
      state.keys[keyProp] = false;
      btn.classList.remove('touch-active');
    };

    btn.addEventListener('touchstart', startHandler, { passive: false });
    btn.addEventListener('touchend', endHandler, { passive: false });
    btn.addEventListener('touchcancel', endHandler, { passive: false });

    // Działa również na myszkę do testowania w przeglądarce
    btn.addEventListener('mousedown', startHandler);
    btn.addEventListener('mouseup', endHandler);
    btn.addEventListener('mouseleave', endHandler);
  }

  bindTouchButton(touchUp, 'up');
  bindTouchButton(touchDown, 'down');
  bindTouchButton(touchLeft, 'left');
  bindTouchButton(touchRight, 'right');
  bindTouchButton(touchSprint, 'sprint');

  // --- Przyciski modalów i HUD ---
  btnStartGame.addEventListener('click', startNewGame);
  btnRetryGame.addEventListener('click', startNewGame);
  btnPlayAgain.addEventListener('click', startNewGame);

  btnResume.addEventListener('click', () => {
    if (state.gameState === 'PAUSED') togglePause();
  });

  btnSound.addEventListener('click', () => {
    const isMuted = window.gameAudio.toggleMute();
    soundIcon.textContent = isMuted ? '🔇' : '🔊';
  });

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
  btnPause.addEventListener('click', togglePause);

  btnHelpToggle.addEventListener('click', () => {
    if (state.gameState === 'PLAYING') {
      state.gameState = 'PAUSED';
      pauseOverlay.classList.remove('hidden');
    }
    modalStart.classList.remove('hidden');
  });

  // --- Formatowanie czasu MM:SS ---
  function formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }

  // --- Aktualizacja HUD ---
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

    // Odległość do profesora
    const distToProf = Math.hypot(player.x - professor.x, player.y - professor.y);
    if (distToProf < professor.alertDistance && !state.isDistracted) {
      dangerStatusEl.textContent = 'Status: Profesor w pościgu!';
      dangerStatusEl.className = 'status-alert danger';
    } else if (state.isDistracted) {
      dangerStatusEl.textContent = 'Status: Profesor czyta notatki!';
      dangerStatusEl.className = 'status-alert safe';
    } else {
      dangerStatusEl.textContent = 'Status: Bezpiecznie';
      dangerStatusEl.className = 'status-alert safe';
    }
  }

  // --- Cząsteczki efektów (dymki sprintu, błyski ECTS, confetti) ---
  function spawnParticles(x, y, color, count = 8, speed = 2) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const vel = Math.random() * speed + 1;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel,
        color,
        size: Math.random() * 4 + 2,
        life: 1.0,
        decay: Math.random() * 0.04 + 0.02
      });
    }
  }

  function spawnConfetti() {
    const colors = ['#D4AF37', '#F7D05C', '#10B981', '#38BDF8', '#FFFFFF', '#E11D48'];
    for (let i = 0; i < 70; i++) {
      state.confetti.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * -100,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 3 + 2,
        size: Math.random() * 7 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10
      });
    }
  }

  // --- Porażka: Kampania Wrześniowa ---
  function handleGameOver() {
    state.gameState = 'GAMEOVER';
    window.gameAudio.playDefeatSound();

    failEctsEl.textContent = `${state.ects} / ${TARGET_ECTS} ECTS`;
    failTimeEl.textContent = formatTime(state.elapsedTime);

    const randomFailQuotes = [
      '„Panie Kolego, zero punktów z kolokwium! Wpis do indeksu nieuzyskany. Widzimy się w drugim terminie we wrześniu!”',
      '„Nie ma litości! Brak 30 ECTS oznacza poprawkę komisyjną w Budynku A!”',
      '„Dziekanat zamknął listę studentów na ten rok. Do zobaczenia w Kampanii Wrześniowej!”'
    ];
    failQuoteEl.textContent = randomFailQuotes[Math.floor(Math.random() * randomFailQuotes.length)];

    modalGameOver.classList.remove('hidden');
  }

  // --- Zwycięstwo: Zaliczony Semestr ---
  function handleVictory() {
    state.gameState = 'VICTORY';
    window.gameAudio.playVictorySound();
    spawnConfetti();

    winTimeEl.textContent = formatTime(state.elapsedTime);

    // Wylicz ocenę na podstawie czasu
    const sec = Math.floor(state.elapsedTime / 1000);
    let grade = '5.0 (Bardzo Dobry)';
    if (sec > 90) grade = '4.5 (Dobry Plus)';
    if (sec > 140) grade = '4.0 (Dobry)';
    if (sec > 180) grade = '3.5 (Dostateczny Plus)';
    winGradeEl.textContent = grade;

    modalVictory.classList.remove('hidden');
  }

  // --- Aktualizacja fizyki i logiki gry ---
  function update(dt) {
    if (state.gameState !== 'PLAYING') return;

    state.elapsedTime = Date.now() - state.startTime;

    // Czasowy bonus z kawy
    let speedMultiplier = 1.0;
    if (state.coffeeBoostTimer > 0) {
      state.coffeeBoostTimer -= dt;
      speedMultiplier = 1.35;
    }

    // Obsługa zmylenia profesora
    if (state.distractTimer > 0) {
      state.distractTimer -= dt;
      state.isDistracted = true;
    } else {
      state.isDistracted = false;
    }

    // 1. Logika staminy i sprintu gracza
    const wantsSprint = state.keys.sprint;
    const isMoving = state.keys.up || state.keys.down || state.keys.left || state.keys.right;

    if (wantsSprint && isMoving && state.stamina > 2) {
      state.isSprinting = true;
      state.stamina = Math.max(0, state.stamina - dt * 26);
      if (Math.random() < 0.25) {
        spawnParticles(player.x, player.y + 12, 'rgba(56, 189, 248, 0.6)', 1, 1);
      }
    } else {
      state.isSprinting = false;
      // Regeneracja staminy gdy gracz nie biegnie
      state.stamina = Math.min(state.maxStamina, state.stamina + dt * 14);
    }

    // 2. Ruch gracza
    const currentSpeed = (state.isSprinting ? player.sprintSpeed : player.baseSpeed) * speedMultiplier;
    let moveX = 0;
    let moveY = 0;

    if (state.keys.up) moveY -= 1;
    if (state.keys.down) moveY += 1;
    if (state.keys.left) {
      moveX -= 1;
      player.facing = 'left';
    }
    if (state.keys.right) {
      moveX += 1;
      player.facing = 'right';
    }

    // Normalizacja wektora ruchu po przekątnej
    if (moveX !== 0 && moveY !== 0) {
      const len = Math.SQRT2;
      moveX /= len;
      moveY /= len;
    }

    // Przesuwanie z detekcją kolizji (osobno X i Y, aby gracz mógł się ślizgać wzdłuż ścian)
    const targetX = player.x + moveX * currentSpeed;
    if (!checkObstacleCollision(targetX, player.y, player.radius)) {
      player.x = targetX;
    }

    const targetY = player.y + moveY * currentSpeed;
    if (!checkObstacleCollision(player.x, targetY, player.radius)) {
      player.y = targetY;
    }

    // Animacja kroków gracza
    if (isMoving) {
      player.walkTimer += dt * 8;
      player.animFrame = Math.sin(player.walkTimer);
    } else {
      player.animFrame = 0;
    }

    // 3. Pościg Egzaminatora (AI z omijaniem przeszkód)
    const distToPlayer = Math.hypot(player.x - professor.x, player.y - professor.y);

    if (distToPlayer < professor.alertDistance && !state.isDistracted) {
      // Profesor widzi studenta i przyspiesza!
      professor.speed = professor.chaseSpeed;

      // Dźwięk alarmu profesora (co kilka sekund)
      if (state.alertCooldown <= 0) {
        window.gameAudio.playProfessorAlert();
        state.alertCooldown = 3.5;
        triggerProfessorQuote();
      }
    } else {
      professor.speed = professor.normalSpeed;
    }

    if (state.alertCooldown > 0) {
      state.alertCooldown -= dt;
    }

    // Ruch profesora w stronę gracza (jeśli nie jest rozproszony notatkami)
    if (!state.isDistracted) {
      const dx = player.x - professor.x;
      const dy = player.y - professor.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 2) {
        let pMoveX = (dx / dist) * professor.speed;
        let pMoveY = (dy / dist) * professor.speed;

        professor.facing = pMoveX >= 0 ? 'right' : 'left';

        // Ślizganie profesora wokół przeszkód
        if (!checkObstacleCollision(professor.x + pMoveX, professor.y, professor.radius)) {
          professor.x += pMoveX;
        } else {
          // Jeśli utknął w poziomie, spróbuj ominąć w pionie
          professor.y += (pMoveY > 0 ? 1 : -1) * professor.speed;
        }

        if (!checkObstacleCollision(professor.x, professor.y + pMoveY, professor.radius)) {
          professor.y += pMoveY;
        } else {
          professor.x += (pMoveX > 0 ? 1 : -1) * professor.speed;
        }

        professor.animFrame = Math.sin(Date.now() * 0.008);
      }
    }

    // 4. Detekcja złapania przez Profesora
    if (!state.isDistracted && distToPlayer < (player.radius + professor.radius - 6)) {
      handleGameOver();
      return;
    }

    // 5. Zbieranie przedmiotów przez Gracza
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      const dist = Math.hypot(player.x - it.x, player.y - it.y);

      if (dist < player.radius + it.radius) {
        if (it.type === 'ects') {
          state.ects += it.value;
          window.gameAudio.playCollectECTS(it.value >= 4);
          spawnParticles(it.x, it.y, '#D4AF37', 12, 3);

          if (state.ects >= TARGET_ECTS) {
            state.ects = TARGET_ECTS;
            updateHUD();
            handleVictory();
            return;
          }
        } else if (it.type === 'coffee') {
          // Kawa z Patio ALK
          state.stamina = state.maxStamina;
          state.coffeeBoostTimer = 4.5;
          window.gameAudio.playCoffeeBoost();
          spawnParticles(it.x, it.y, '#38BDF8', 14, 3);
          triggerProfessorQuote('„Kawa z Patio nie uratuje Pana przed pytaniem z mikroekonomii!”');
        } else if (it.type === 'notes') {
          // Notatki odwracające uwagę
          state.distractTimer = 4.0;
          state.isDistracted = true;
          window.gameAudio.playNotesDistract();
          spawnParticles(it.x, it.y, '#FFFFFF', 10, 2);
          triggerProfessorQuote('„A co to za notatki na podłodze?! Czyje to pismo?!”');
        }

        items.splice(i, 1);
        replenishECTS();
      }
    }

    // 6. Losowe rzucanie cytatów przez profesora co 10-15 sekund
    if (Date.now() - state.lastQuoteChange > 12000) {
      state.lastQuoteChange = Date.now();
      triggerProfessorQuote();
    }

    // 7. Aktualizacja cząsteczek
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) state.particles.splice(i, 1);
    }

    // 8. Aktualizacja confetti (przy zwycięstwie)
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

    updateCampusZone();
    updateHUD();
  }

  // --- Rysowanie Kampusu Akademii Leona Koźmińskiego ---
  function renderCampus() {
    // 1. Posadzka kampusu
    // Budynek A (lewa strona - styl sal wykładowych)
    ctx.fillStyle = '#061C30';
    ctx.fillRect(0, 0, 200, CANVAS_HEIGHT);

    // Zielone Patio ALK (centrum - słynny zielony dziedziniec z roślinami)
    ctx.fillStyle = '#08253B';
    ctx.fillRect(200, 0, 400, CANVAS_HEIGHT);

    // Trawa na Patio
    ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
    ctx.fillRect(230, 80, 340, 380);

    // Szklany świetlik dachowy Patio (charakterystyczna architektura ALK)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 240; x <= 560; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 80);
      ctx.lineTo(x, 460);
      ctx.stroke();
    }
    for (let y = 100; y <= 440; y += 40) {
      ctx.beginPath();
      ctx.moveTo(230, y);
      ctx.lineTo(570, y);
      ctx.stroke();
    }

    // Budynek B (prawa strona - dziekanat i biblioteka)
    ctx.fillStyle = '#071F36';
    ctx.fillRect(600, 0, 200, CANVAS_HEIGHT);

    // Linie płytek podłogowych na korytarzach
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }

    // Oznaczenia sektorów na podłodze
    ctx.font = '700 12px "Chakra Petch", sans-serif';
    ctx.fillStyle = 'rgba(212, 175, 55, 0.25)';
    ctx.fillText('SEKTOR A: AUDYTORIA', 35, 45);
    ctx.fillText('SEKTOR B: DZIEKANAT', 635, 45);
    
    ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
    ctx.font = '700 13px "Chakra Petch", sans-serif';
    ctx.fillText('🌿 ZIELONE PATIO ALK 🌿', 330, 60);

    // Rysowanie przeszkód (ściany, biurka, ławki na patio)
    for (const obs of obstacles) {
      // Cień przeszkody
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(obs.x + 3, obs.y + 4, obs.w, obs.h);

      // Ściana / ławka
      const isPatioBench = obs.y >= 150 && obs.y <= 360 && obs.x >= 300 && obs.x <= 500;
      if (isPatioBench) {
        // Ławki z roślinnością Patio
        ctx.fillStyle = '#064E3B';
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

        // Donice i liście
        ctx.fillStyle = '#34D399';
        ctx.beginPath();
        ctx.arc(obs.x + 20, obs.y + obs.h / 2, 7, 0, Math.PI * 2);
        ctx.arc(obs.x + obs.w / 2, obs.y + obs.h / 2, 9, 0, Math.PI * 2);
        ctx.arc(obs.x + obs.w - 20, obs.y + obs.h / 2, 7, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Solidne ściany kampusu z kolorem ALK Navy i złotą listwą
        ctx.fillStyle = '#002B49';
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
      }
    }

    // Drzewka ozdobne na Patio ALK
    const trees = [
      { x: 260, y: 190 },
      { x: 535, y: 190 },
      { x: 260, y: 350 },
      { x: 535, y: 350 }
    ];
    for (const tree of trees) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.arc(tree.x + 2, tree.y + 4, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#065F46';
      ctx.beginPath();
      ctx.arc(tree.x, tree.y, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(tree.x - 3, tree.y - 3, 11, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Rysowanie przedmiotów na mapie ---
  function renderItems() {
    const time = Date.now() * 0.005;

    for (const it of items) {
      const bob = Math.sin(time + it.pulse) * 3;
      const cy = it.y + bob;

      // Cień pod przedmiotem
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(it.x, it.y + 12, it.radius * 0.9, it.radius * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      if (it.type === 'ects') {
        const isBig = it.value >= 4;

        // Blask wokół ECTS
        const gradient = ctx.createRadialGradient(it.x, cy, 2, it.x, cy, it.radius * 1.8);
        gradient.addColorStop(0, isBig ? 'rgba(247, 208, 92, 0.5)' : 'rgba(212, 175, 55, 0.35)');
        gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(it.x, cy, it.radius * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Symbol ECTS (zwój / praca dyplomowa)
        ctx.font = isBig ? '18px sans-serif' : '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('📜', it.x, cy);

        // Liczba ECTS nad zwojem
        ctx.font = '700 9px "Chakra Petch", sans-serif';
        ctx.fillStyle = '#F7D05C';
        ctx.fillText(`+${it.value} ECTS`, it.x, cy - 13);
      } else if (it.type === 'coffee') {
        // Kawa z Patio ALK
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('☕', it.x, cy);

        ctx.font = '700 8.5px "Chakra Petch", sans-serif';
        ctx.fillStyle = '#38BDF8';
        ctx.fillText('KAWA ALK', it.x, cy - 12);
      } else if (it.type === 'notes') {
        // Notatki / Ściągi
        ctx.font = '15px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('📝', it.x, cy);

        ctx.font = '700 8px "Chakra Petch", sans-serif';
        ctx.fillStyle = '#E2E8F0';
        ctx.fillText('ŚCIĄGA', it.x, cy - 11);
      }
    }
  }

  // --- Rysowanie Gracza (Student Koźmińskiego) ---
  function renderPlayer() {
    const px = player.x;
    const py = player.y;
    const isLeft = player.facing === 'left';
    const wobble = player.animFrame * 2;

    // Cień studenta
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(px, py + 16, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Efekt przyspieszenia po kawie
    if (state.coffeeBoostTimer > 0) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 20, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Plecak studenta
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    const backpackOffset = isLeft ? 10 : -10;
    ctx.roundRect(px + backpackOffset - 4, py - 4 + wobble, 8, 12, 3);
    ctx.fill();

    // Tułów: Bluza uczelniana z logo ALK
    ctx.fillStyle = '#002B49';
    ctx.beginPath();
    ctx.roundRect(px - 10, py - 6 + wobble, 20, 18, 4);
    ctx.fill();
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Napis ALK na bluzie
    ctx.font = '800 7px "Chakra Petch", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ALK', px, py + 3 + wobble);

    // Głowa studenta
    ctx.fillStyle = '#FFD1A4';
    ctx.beginPath();
    ctx.arc(px, py - 12 + wobble, 8, 0, Math.PI * 2);
    ctx.fill();

    // Czapka absolwenta / biret z chwostem
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.ellipse(px, py - 18 + wobble, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Złoty chwost
    ctx.fillStyle = '#D4AF37';
    ctx.beginPath();
    ctx.arc(px + (isLeft ? -8 : 8), py - 16 + wobble, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Oczy
    ctx.fillStyle = '#001A2C';
    const eyeX = isLeft ? px - 4 : px + 4;
    ctx.fillRect(eyeX, py - 13 + wobble, 2, 2);

    // Etykieta nad graczem
    ctx.font = '700 8.5px "Chakra Petch", sans-serif';
    ctx.fillStyle = '#E2E8F0';
    ctx.fillText('STUDENT', px, py - 27 + wobble);
  }

  // --- Rysowanie Egzaminatora (Profesor w garniturze z arkuszem ocen) ---
  function renderProfessor() {
    const ex = professor.x;
    const ey = professor.y;
    const isLeft = professor.facing === 'left';
    const wobble = professor.animFrame * 1.5;

    // Pole zagrożenia wokół profesora (aura)
    const distToPlayer = Math.hypot(player.x - ex, player.y - ey);
    const inRange = distToPlayer < professor.alertDistance && !state.isDistracted;

    const auraGrad = ctx.createRadialGradient(ex, ey, 10, ex, ey, professor.radius * 2.8);
    auraGrad.addColorStop(0, inRange ? 'rgba(225, 29, 72, 0.35)' : 'rgba(212, 175, 55, 0.15)');
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(ex, ey, professor.radius * 2.8, 0, Math.PI * 2);
    ctx.fill();

    // Cień profesora
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(ex, ey + 18, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Jeśli profesor jest rozproszony notatkami - dymek "???"
    if (state.isDistracted) {
      ctx.font = '800 13px sans-serif';
      ctx.fillStyle = '#F59E0B';
      ctx.textAlign = 'center';
      ctx.fillText('❓❓❓', ex, ey - 32);
    }

    // Tułów: Ciemny garnitur profesorski
    ctx.fillStyle = '#1E1B18';
    ctx.beginPath();
    ctx.roundRect(ex - 12, ey - 8 + wobble, 24, 22, 4);
    ctx.fill();

    // Biała koszula i czerwony krawat
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(ex - 4, ey - 8 + wobble, 8, 8);
    ctx.fillStyle = '#E11D48';
    ctx.beginPath();
    ctx.moveTo(ex, ey - 8 + wobble);
    ctx.lineTo(ex - 3, ey + 2 + wobble);
    ctx.lineTo(ex, ey + 6 + wobble);
    ctx.lineTo(ex + 3, ey + 2 + wobble);
    ctx.closePath();
    ctx.fill();

    // Teczka z ocenami 2.0 w ręce profesora
    ctx.fillStyle = '#831843';
    const folderX = isLeft ? ex - 16 : ex + 10;
    ctx.fillRect(folderX, ey + wobble, 7, 11);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(folderX + 1, ey + 1 + wobble, 5, 4); // kartka z egzaminem

    // Czerwony długopis
    ctx.fillStyle = '#E11D48';
    ctx.fillRect(folderX + 6, ey - 2 + wobble, 2, 7);

    // Głowa profesora
    ctx.fillStyle = '#FCD34D';
    ctx.beginPath();
    ctx.arc(ex, ey - 15 + wobble, 9, 0, Math.PI * 2);
    ctx.fill();

    // Siwe włosy z łysiną profesorską
    ctx.fillStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.arc(ex, ey - 18 + wobble, 8, Math.PI, 0);
    ctx.fill();

    // Okulary profesorskie
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 1.5;
    const glassEyeX = isLeft ? ex - 4 : ex + 4;
    ctx.strokeRect(glassEyeX - 3, ey - 17 + wobble, 6, 4);

    // Etykieta nad profesorem
    ctx.font = '700 8px "Chakra Petch", sans-serif';
    ctx.fillStyle = inRange ? '#FB7185' : '#D4AF37';
    ctx.textAlign = 'center';
    ctx.fillText('PROF. BEZLITOSNY', ex, ey - 29 + wobble);
  }

  // --- Rysowanie cząsteczek i confetti ---
  function renderParticles() {
    for (const p of state.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Rysowanie confetti po zwycięstwie
    for (const c of state.confetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate((c.rotation * Math.PI) / 180);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.7);
      ctx.restore();
    }
  }

  // --- Główna pętla renderowania ---
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

  // Uruchomienie pętli
  requestAnimationFrame(gameLoop);

  // Inicjalizacja startowego stanu
  updateCampusZone();
  updateHUD();
})();
