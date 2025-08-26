// /static/maze.js
document.body.addEventListener("click", () => {
  const music = document.getElementById("bgMusic");
  if (music.paused) {
    music.play();
  }
}, { once: true });
(function () {
  const ROWS = 41;
  const COLS = 41;
  const MID  = Math.floor(ROWS / 2); // 20

  // ===== генерация лабиринта (DFS, клетки через один, стены=1, проход=0) =====
  function generateMaze(rows, cols) {
    // всё стенки
    const g = Array.from({ length: rows }, () => Array(cols).fill(1));

    // старт генерилки по строке рядом с центром (чтобы вход/выход были по центру)
    let startY = (MID % 2 === 1) ? MID : MID + 1; // сделать нечётной
    if (startY >= rows - 1) startY = rows - 2;

    // стек для карвинга по «клеткам» с шагом 2
    const stack = [];
    const start = { x: 1, y: startY };
    g[start.y][start.x] = 0;
    stack.push(start);

    function neighbors(x, y) {
      const dirs = [
        { dx: 0, dy: -2 },
        { dx: 0, dy:  2 },
        { dx: -2, dy: 0 },
        { dx:  2, dy: 0 },
      ];
      // тасуем
      for (let i = dirs.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
      }
      const res = [];
      for (const { dx, dy } of dirs) {
        const nx = x + dx, ny = y + dy;
        if (nx > 0 && nx < cols - 1 && ny > 0 && ny < rows - 1 && g[ny][nx] === 1) {
          res.push({ nx, ny, wx: x + dx / 2, wy: y + dy / 2 }); // wx/wy — «стенка между»
        }
      }
      return res;
    }

    while (stack.length) {
      const top = stack[stack.length - 1];
      const opts = neighbors(top.x, top.y);
      if (!opts.length) {
        stack.pop();
        continue;
      }
      const pick = opts[0];
      g[pick.wy][pick.wx] = 0; // пробиваем стенку
      g[pick.ny][pick.nx] = 0; // пробиваем клетку
      stack.push({ x: pick.nx, y: pick.ny });
    }

    // делаем вход/выход в ЦЕНТРЕ сторон и гарантируем соединение с лабиринтом
    g[MID][0] = 0;    // вход слева
    g[MID][1] = 0;    // коридор внутрь слева
    // соединяем вертикально (x=1) центр с строкой старта, если надо
    const sy = startY;
    const from = Math.min(MID, sy), to = Math.max(MID, sy);
    for (let y = from; y <= to; y++) g[y][1] = 0;

    g[MID][COLS - 1] = 0;      // выход справа
    g[MID][COLS - 2] = 0;      // коридор внутрь справа
    // аналогично соединяем справа по колонке x=COLS-2
    for (let y = from; y <= to; y++) g[y][COLS - 2] = 0;

    return g;
  }

  const maze = generateMaze(ROWS, COLS);

  // ===== канвас / размеры =====
  const canvas = document.getElementById('mazeCanvas');
  const ctx = canvas.getContext('2d');

  // подгоняем под экран (но не меньше 8px клетка)
  const ideal = Math.min(window.innerWidth - 24, 640);
  const CELL = Math.max(8, Math.floor(ideal / COLS));
  canvas.width  = COLS * CELL;
  canvas.height = ROWS * CELL;

  // ===== игрок =====
  const player = { x: 0, y: MID }; // старт — вход слева
  let gameOver = false;

  function drawMaze() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        ctx.fillStyle = maze[y][x] ? '#000' : '#fff';
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
    // подсветим выход
    ctx.fillStyle = '#e6ffe6';
    ctx.fillRect((COLS - 1) * CELL, MID * CELL, CELL, CELL);

    drawPlayer();
  }

  function drawPlayer() {
    // --- ВАРИАНТ ПО УМОЛЧАНИЮ: красный кружок ---
    const cx = player.x * CELL + CELL / 2;
    const cy = player.y * CELL + CELL / 2;
    const r  = Math.floor(CELL * 0.35);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#e74c3c';
    ctx.fill();
    ctx.lineWidth = Math.max(1, Math.floor(CELL * 0.08));
    ctx.strokeStyle = '#b03a2e';
    ctx.stroke();

    // --- ВАРИАНТ С PNG (включить позже)
    // if (playerImg.complete) {
    //   ctx.drawImage(playerImg, player.x * CELL, player.y * CELL, CELL, CELL);
    // }
  }

  // // Закомментировано: PNG игрока (включишь при необходимости)
  // const playerImg = new Image();
  // playerImg.src = "/static/hero.png";
  // playerImg.onload = drawMaze;

  function canMove(x, y) {
    return x >= 0 && x < COLS && y >= 0 && y < ROWS && maze[y][x] === 0;
  }

  function move(dx, dy) {
    if (gameOver) return;
    const nx = player.x + dx;
    const ny = player.y + dy;
    if (canMove(nx, ny)) {
      player.x = nx;
      player.y = ny;
      drawMaze();
      checkVictory();
      kickAudio(); // любое действие — пробуем включить музыку
    }
  }

  function checkVictory() {
    if (player.x === COLS - 1 && player.y === MID) {
      gameOver = true;
      setTimeout(openVictoryModal, 2000);
    }
  }

  // ===== сенсорные стрелки =====
  const btnUp    = document.getElementById('btnUp');
  const btnDown  = document.getElementById('btnDown');
  const btnLeft  = document.getElementById('btnLeft');
  const btnRight = document.getElementById('btnRight');

  function bindPress(el, fn) {
    if (!el) return;
    const handler = (e) => { e.preventDefault(); fn(); };
    el.addEventListener('touchstart', handler, { passive: false });
    el.addEventListener('click', handler);
  }

  bindPress(btnUp,    () => move(0, -1));
  bindPress(btnDown,  () => move(0,  1));
  bindPress(btnLeft,  () => move(-1, 0));
  bindPress(btnRight, () => move(1,  0));

  // также тап по канвасу = «шаг вперёд» (в сторону ближайшего выхода),
  // можно выключить, если не нужно
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    // небольшой «автопилот» к выходу по горизонтали
    if (player.x < COLS - 1 && canMove(player.x + 1, player.y)) move(1, 0);
    kickAudio();
  }, { passive: false });

  document.getElementById("upBtn").addEventListener("click", () => move(0, -1));
  document.getElementById("leftBtn").addEventListener("click", () => move(-1, 0));
  document.getElementById("rightBtn").addEventListener("click", () => move(1, 0));
  document.getElementById("downBtn").addEventListener("click", () => move(0, 1));

  // ===== модалка победы (совместима с нашим "vmodal") =====
  function openVictoryModal() {
    const modal = document.getElementById('victoryModal');
    if (!modal) return;
    // если у модалки есть класс .vmodal — используем его механику
    if (modal.classList) modal.classList.add('show');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // закрытие по крестику/фону (однократно навешиваем)
    if (!openVictoryModal._bound) {
      openVictoryModal._bound = true;
      modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('vmodal-close')) {
          modal.classList.remove('show');
          modal.style.display = 'none';
          document.body.style.overflow = '';
        }
      });
    }
  }

  // стартовый рендер
  drawMaze();

  // подстраиваемся под поворот экрана
  window.addEventListener('resize', () => {
    // необязательно пересчитывать CELL; можно просто центрировать через CSS
    drawMaze();
  });
})();
