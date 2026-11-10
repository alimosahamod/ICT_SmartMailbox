/* Smart Mailbox — first-visit tour of the demo controls.
   Points at the controls beside the phone, one at a time, never at anything inside the app.
   Shown once per browser (on a phone: the first time the drawer opens); "Replay tour" brings it back. */
(function () {
  'use strict';

  const KEY = 'smartmailbox-tour-v1';
  const panel = document.getElementById('demo-panel');
  const replayBtn = document.getElementById('tour-replay');
  if (!panel) return;
  const narrow = window.matchMedia('(max-width: 900px)');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');

  // A target that is empty until a role is picked falls back to its neighbour.
  const filled = (id) => { const el = document.getElementById(id); return el && el.children.length ? el : null; };
  const STEPS = [
    {
      target: () => panel.querySelector('.roles'),
      title: 'Choose who you are',
      text: () => 'Switch between Sam, the resident, and Jonas, the caretaker. The phone shows that person’s app.'
    },
    {
      target: () => filled('guide-tasks') || document.getElementById('guide-lede'),
      title: 'Your checklist',
      text: () => filled('guide-tasks')
        ? 'Things to try with this role. Each one turns green once you have done it in the app.'
        : 'Once you pick a role, a short list of things to try appears here. Each one turns green as you do it.'
    },
    {
      target: () => panel.querySelector('.simulate'),
      title: 'Play the world outside',
      text: () => 'Be the carrier or the neighbour at the boxes. What you do here shows up on the phone.'
    },
    {
      target: () => panel.querySelector('.demo__foot'),
      title: 'Start over any time',
      text: () => 'Reset puts the sample data back. Replay tour brings these tips back.'
    }
  ];

  const seen = () => { try { return localStorage.getItem(KEY) === 'done'; } catch (e) { return false; } };
  const remember = () => { try { localStorage.setItem(KEY, 'done'); } catch (e) { /* storage unavailable */ } };

  /* ---------- the bubble and the ring around its target ---------- */
  const ring = document.createElement('div');
  ring.className = 'tour-ring';
  ring.hidden = true;
  ring.setAttribute('aria-hidden', 'true');

  const tip = document.createElement('div');
  tip.className = 'tour';
  tip.hidden = true;
  tip.setAttribute('role', 'dialog');
  tip.setAttribute('aria-labelledby', 'tour-title');
  tip.setAttribute('aria-describedby', 'tour-text tour-count');
  tip.innerHTML =
    '<span class="tour__arrow" aria-hidden="true"></span>' +
    '<div aria-live="polite"><p class="tour__title" id="tour-title"></p><p class="tour__text" id="tour-text"></p></div>' +
    '<div class="tour__foot">' +
      '<span class="tour__steps" aria-hidden="true">' + STEPS.map(() => '<i></i>').join('') + '</span>' +
      '<span class="visually-hidden" id="tour-count"></span>' +
      '<button type="button" class="tour__skip">Skip tour</button>' +
      '<button type="button" class="btn btn--small tour__next">Next</button>' +
    '</div>';
  panel.append(ring, tip);

  const titleEl = tip.querySelector('.tour__title');
  const textEl = tip.querySelector('.tour__text');
  const countEl = tip.querySelector('#tour-count');
  const dots = tip.querySelectorAll('.tour__steps i');
  const nextBtn = tip.querySelector('.tour__next');
  const skipBtn = tip.querySelector('.tour__skip');

  let step = -1, current = null, raf = 0, shownThisLoad = false, ringFresh = true, entering = false, focusNext = false;
  const active = () => step >= 0;
  const ro = 'ResizeObserver' in window ? new ResizeObserver(() => place()) : null;

  function start() {
    step = 0;
    shownThisLoad = true;
    ringFresh = true;
    focusNext = true;
    show();
  }

  function show() {
    const s = STEPS[step];
    titleEl.textContent = s.title;
    textEl.textContent = s.text();
    countEl.textContent = 'Tip ' + (step + 1) + ' of ' + STEPS.length;
    nextBtn.textContent = step === STEPS.length - 1 ? 'Got it' : 'Next';
    skipBtn.hidden = step === STEPS.length - 1;
    dots.forEach((d, i) => { d.classList.toggle('is-on', i === step); d.classList.toggle('is-past', i < step); });
    tip.classList.remove('is-in');
    place(true);
  }

  function finish() {
    if (!active()) return;
    const hadFocus = tip.contains(document.activeElement);
    step = -1;
    current = null;
    if (ro) ro.disconnect();
    tip.hidden = true;
    ring.hidden = true;
    remember();
    if (hadFocus && replayBtn && !(narrow.matches && !panel.classList.contains('is-open'))) replayBtn.focus({ preventScroll: true });
  }

  // The visible extent of a section: the union of its children, so a column that stretches
  // to the bottom of the screen is ringed only where it has content.
  function contentRect(el) {
    let t = Infinity, l = Infinity, b = -Infinity, r = -Infinity;
    for (const c of el.children) {
      const x = c.getBoundingClientRect();
      if (!x.width && !x.height) continue;
      t = Math.min(t, x.top); l = Math.min(l, x.left); b = Math.max(b, x.bottom); r = Math.max(r, x.right);
    }
    if (t === Infinity) return el.getBoundingClientRect();
    return { top: t, left: l, bottom: b, right: r, width: r - l, height: b - t };
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function place(enter) {
    // Several calls in one frame collapse into one; an entrance asked for by any of them survives.
    if (enter) entering = true;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      if (!active()) return;
      const s = STEPS[step];
      const el = s.target();
      const blocked = narrow.matches && !panel.classList.contains('is-open');
      if (blocked || !el) { tip.hidden = true; ring.hidden = true; return; }
      // A new target (next step, or the checklist appearing mid-step) is brought into view first.
      if (el !== current) {
        if (ro) { ro.disconnect(); ro.observe(el); }
        current = el;
        el.scrollIntoView({ block: 'nearest', behavior: still.matches ? 'auto' : 'smooth' });
      }
      const text = s.text();
      if (textEl.textContent !== text) textEl.textContent = text;

      const r = contentRect(el);
      if (!r.width && !r.height) { tip.hidden = true; ring.hidden = true; return; }
      const PAD = 8, GAP = 16, EDGE = 12;
      const vw = document.documentElement.clientWidth, vh = window.innerHeight;

      ring.hidden = false;
      ring.classList.toggle('is-fresh', ringFresh);
      ring.style.width = (r.width + PAD * 2) + 'px';
      ring.style.height = (r.height + PAD * 2) + 'px';
      ring.style.transform = 'translate(' + (r.left - PAD) + 'px,' + (r.top - PAD) + 'px)';
      if (ringFresh) { ringFresh = false; void ring.offsetWidth; ring.classList.remove('is-fresh'); }

      tip.hidden = false;
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      const box = { top: r.top - PAD, left: r.left - PAD, bottom: r.bottom + PAD, right: r.right + PAD };
      const room = { bottom: vh - box.bottom, top: box.top, right: vw - box.right, left: box.left };
      const fits = (side) => (side === 'bottom' || side === 'top' ? room[side] >= th + GAP + EDGE : room[side] >= tw + GAP + EDGE);
      // Below or above first, so a tip beside the guide never lands on the phone.
      const side = ['bottom', 'top', 'right', 'left'].find(fits) || (room.bottom >= room.top ? 'bottom' : 'top');
      const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
      let x, y;
      if (side === 'bottom' || side === 'top') {
        x = clamp(cx - tw / 2, EDGE, vw - tw - EDGE);
        y = side === 'bottom' ? box.bottom + GAP : box.top - GAP - th;
        y = clamp(y, EDGE, vh - th - EDGE);
        tip.style.setProperty('--ax', clamp(cx - x, 24, tw - 24) + 'px');
      } else {
        y = clamp(cy - th / 2, EDGE, vh - th - EDGE);
        x = side === 'right' ? box.right + GAP : box.left - GAP - tw;
        tip.style.setProperty('--ay', clamp(cy - y, 24, th - 24) + 'px');
      }
      tip.dataset.side = side;
      tip.style.left = Math.round(x) + 'px';
      tip.style.top = Math.round(y) + 'px';
      if (entering) { entering = false; void tip.offsetWidth; tip.classList.add('is-in'); }
      // Focus can only land once the tip is shown.
      if (focusNext) { focusNext = false; nextBtn.focus({ preventScroll: true }); }
    });
  }

  /* ---------- controls ---------- */
  nextBtn.addEventListener('click', () => {
    if (step >= STEPS.length - 1) { finish(); return; }
    step += 1;
    show();
  });
  skipBtn.addEventListener('click', finish);
  if (replayBtn) {
    replayBtn.hidden = false;
    replayBtn.addEventListener('click', start);
  }

  // Escape closes the tour first; a second Escape is left for the drawer.
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !active() || tip.hidden) return;
    e.stopImmediatePropagation();
    finish();
  }, true);

  // Follow the target through scrolling, resizing and re-rendering (a role picked mid-tour).
  window.addEventListener('resize', () => { if (active()) place(); });
  document.addEventListener('scroll', () => { if (active()) place(); }, { capture: true, passive: true });
  document.addEventListener('click', () => { if (active()) place(); });
  document.addEventListener('change', () => { if (active()) place(); });
  panel.addEventListener('transitionend', (e) => { if (active() && e.target === panel) place(); });

  // On a phone the controls live in a drawer: start when it first opens, end when it closes.
  new MutationObserver(() => {
    const open = panel.classList.contains('is-open');
    if (!narrow.matches) return;
    if (open && !active() && !shownThisLoad && !seen()) {
      setTimeout(() => { if (panel.classList.contains('is-open') && !active()) start(); }, 360);
    } else if (!open && active()) {
      finish();
    } else if (active()) {
      place();
    }
  }).observe(panel, { attributes: true, attributeFilter: ['class'] });
  narrow.addEventListener('change', () => { if (active()) place(); });

  // On a wide screen the controls are already beside the phone: start once the page has settled.
  if (!seen() && !narrow.matches) {
    const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    ready.then(() => setTimeout(() => { if (!active() && !shownThisLoad && !narrow.matches) start(); }, 500));
  }
})();
