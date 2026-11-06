(() => {
  'use strict';

  /* ====== Настройки ====== */
  const CONFIG = {
    minDate: '2026-11-07',          // самая ранняя дата (ГГГГ-ММ-ДД)
    times: ['13:00', '18:00'],      // доступное время
    storageKey: 'goldenTicketCelentano',
    shareTitle: 'Золотой билет'
  };

  const $ = (id) => document.getElementById(id);
  const ticket = $('ticket');
  const views = { locked: $('view-locked'), pick: $('view-pick'), done: $('view-done') };
  const dateInput = $('date');
  const dateHint = $('date-hint');
  const timesBox = $('times');
  const confirmBtn = $('confirm');
  const finale = $('finale');

  let selectedTime = null;

  /* ====== Хранилище (в try/catch: в приватном режиме может быть недоступно) ====== */
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(CONFIG.storageKey)); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(v)); } catch (e) {} },
    clear() { try { localStorage.removeItem(CONFIG.storageKey); } catch (e) {} }
  };
  // ?reset в адресе — сбросить билет (для тестов)
  if (new URLSearchParams(location.search).has('reset')) store.clear();

  /* ====== Вспомогательное ====== */
  function show(name) {
    Object.keys(views).forEach((k) => { views[k].hidden = k !== name; });
    ticket.dataset.state = name;
  }

  function formatDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('ru-RU', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  function isValidDate(v) {
    return /^\d{4}-\d{2}-\d{2}$/.test(v) && v >= CONFIG.minDate;
  }

  function refresh() {
    const v = dateInput.value;
    const ok = isValidDate(v);
    dateHint.classList.toggle('is-error', Boolean(v) && !ok);
    dateHint.textContent = v && !ok
      ? 'Эта дата недоступна. Выберите дату с 07.11.2026'
      : 'Доступны даты начиная с 07.11.2026';
    confirmBtn.disabled = !(ok && selectedTime);
  }

  /* ====== Кнопки времени ====== */
  CONFIG.times.forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'time';
    b.textContent = t;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', 'false');
    b.addEventListener('click', () => {
      selectedTime = t;
      timesBox.querySelectorAll('.time').forEach((x) =>
        x.setAttribute('aria-checked', String(x === b)));
      refresh();
    });
    timesBox.appendChild(b);
  });

  dateInput.min = CONFIG.minDate;
  dateInput.addEventListener('input', refresh);
  dateInput.addEventListener('change', refresh);

  /* ====== Шаги ====== */
  $('activate').addEventListener('click', () => {
    show('pick');
    if (navigator.vibrate) navigator.vibrate(30);
    views.pick.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  confirmBtn.addEventListener('click', () => {
    if (confirmBtn.disabled) return;
    const choice = { date: dateInput.value, time: selectedTime };
    store.set(choice);
    renderDone(choice);
    openFinale(choice);
  });

  function renderDone(choice) {
    $('done-date').textContent = formatDate(choice.date);
    $('done-time').textContent = choice.time;
    show('done');
  }

  $('change').addEventListener('click', () => {
    store.clear();
    show('pick');
  });

  $('replay').addEventListener('click', () => {
    const c = store.get();
    if (c) openFinale(c);
  });

  $('share').addEventListener('click', async () => {
    const c = store.get();
    if (!c) return;
    const text = `Золотой билет активирован! Мюзикл «Всё будет Челентано!»: ${formatDate(c.date)}, ${c.time}`;
    const btn = $('share');
    try {
      if (navigator.share) {
        await navigator.share({ title: CONFIG.shareTitle, text });
      } else {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'Скопировано';
        setTimeout(() => { btn.textContent = 'Отправить выбор'; }, 2000);
      }
    } catch (e) { /* пользователь закрыл меню — ничего не делаем */ }
  });

  /* ====== Финал ====== */
  function openFinale(choice) {
    $('finale-when').textContent = `${formatDate(choice.date)}, ${choice.time}`;
    finale.hidden = false;
    if (navigator.vibrate) navigator.vibrate([40, 60, 40, 60, 80]);
    $('finale-close').focus({ preventScroll: true });
    Fireworks.start();
  }

  $('finale-close').addEventListener('click', () => {
    Fireworks.stop();
    finale.hidden = true;
    ticket.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  /* ====== Салют ====== */
  const Fireworks = (() => {
    const canvas = $('fireworks');
    const ctx = canvas.getContext('2d');
    const COLORS = ['#f6c453', '#ffe9a8', '#ff9e4a', '#d6457a', '#ffffff', '#ff6fa5'];
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0, H = 0, dpr = 1, raf = 0, running = false, lastLaunch = 0;
    let rockets = [], sparks = [];

    const rand = (a, b) => a + Math.random() * (b - a);

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function launch() {
      rockets.push({
        x: rand(W * 0.12, W * 0.88),
        y: H + 10,
        vx: rand(-0.6, 0.6),
        vy: -rand(H * 0.011, H * 0.016),
        targetY: rand(H * 0.12, H * 0.42),
        color: COLORS[(Math.random() * COLORS.length) | 0]
      });
    }

    function explode(x, y, color) {
      const n = reduce ? 40 : 90;
      const two = Math.random() < 0.4;
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + rand(-0.05, 0.05);
        const s = rand(1.2, 4.6);
        sparks.push({
          x, y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: 1,
          decay: rand(0.008, 0.016),
          color: two && i % 2 ? COLORS[(Math.random() * COLORS.length) | 0] : color,
          size: rand(1.4, 2.8)
        });
      }
    }

    function frame(t) {
      if (!running) return;

      // шлейф: плавно стираем прошлый кадр
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      if (t - lastLaunch > rand(450, 900)) { launch(); lastLaunch = t; }

      rockets = rockets.filter((r) => {
        r.x += r.vx; r.y += r.vy; r.vy += 0.045;
        ctx.fillStyle = r.color;
        ctx.beginPath(); ctx.arc(r.x, r.y, 2.2, 0, Math.PI * 2); ctx.fill();
        if (r.y <= r.targetY || r.vy >= -1) { explode(r.x, r.y, r.color); return false; }
        return true;
      });

      sparks = sparks.filter((p) => {
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.986; p.vy = p.vy * 0.986 + 0.045;
        p.life -= p.decay;
        if (p.life <= 0) return false;
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + p.life * 0.5), 0, Math.PI * 2); ctx.fill();
        return true;
      });
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (running) return;
      resize();
      ctx.clearRect(0, 0, W, H);
      rockets = []; sparks = [];
      running = true;
      lastLaunch = performance.now();
      // стартовый залп
      launch(); setTimeout(launch, 150); setTimeout(launch, 320);
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    window.addEventListener('resize', () => { if (running) resize(); });
    return { start, stop };
  })();

  /* ====== Старт ====== */
  const saved = store.get();
  if (saved && isValidDate(saved.date) && CONFIG.times.includes(saved.time)) {
    renderDone(saved);
  } else {
    show('locked');
  }
  refresh();
})();
