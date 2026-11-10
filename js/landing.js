/* Smart Mailbox — landing page behaviour */
(function () {
  'use strict';

  /* ---------- In-page anchors: smooth scroll, keep the URL hash-free ---------- */
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const id = decodeURIComponent(a.getAttribute('href').slice(1));
    const target = id ? document.getElementById(id) : document.body;
    if (!target) return;
    e.preventDefault();
    const behavior = calm.matches ? 'auto' : 'smooth';
    if (!id || id === 'top') window.scrollTo({ top: 0, behavior });
    else target.scrollIntoView({ behavior, block: 'start' });
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    if (target !== document.body) {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  });

  const pad = (n) => String(n).padStart(2, '0');
  const now = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };

  /* ---------- Hero: live mailbox status ---------- */
  const status = document.getElementById('hero-status');
  if (status) {
    const word = document.getElementById('status-word');
    const meta = document.getElementById('status-meta');
    const log = document.getElementById('status-log');
    const drop = document.getElementById('drop-btn');
    const take = document.getElementById('take-btn');
    const toast = document.getElementById('hero-toast');
    let items = 1;
    let toastTimer;

    const addLog = (text) => {
      const li = document.createElement('li');
      li.className = 'is-new';
      li.innerHTML = '<span>' + now() + '</span>' + text;
      log.prepend(li);
      while (log.children.length > 3) log.lastElementChild.remove();
    };

    const render = () => {
      const arrived = items > 0;
      status.dataset.state = arrived ? 'arrived' : 'empty';
      word.textContent = arrived ? 'Mail arrived' : 'Empty';
      take.disabled = !arrived;
    };

    drop.addEventListener('click', () => {
      items += 1;
      meta.textContent = 'Dropped in at ' + now() + ' · ' + (items === 1 ? '1 item' : items + ' items') + ' inside';
      addLog('Letter detected inside');
      render();
      status.classList.remove('is-fresh'); void status.offsetWidth; status.classList.add('is-fresh');
      toast.hidden = false;
      toast.style.animation = 'none'; void toast.offsetWidth; toast.style.animation = '';
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
    });

    take.addEventListener('click', () => {
      items = 0;
      meta.textContent = 'Emptied at ' + now() + ' · reset automatically';
      addLog('Box emptied, status reset');
      render();
    });

    render();

    // one automatic delivery shortly after load, so the alert is seen without a click
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) setTimeout(() => { if (!status.dataset.touched) drop.click(); }, 2200);
    [drop, take].forEach((b) => b.addEventListener('pointerdown', () => { status.dataset.touched = '1'; }));
  }

  /* ---------- Showcase: timed access switch ---------- */
  const sw = document.getElementById('show-switch');
  if (sw) {
    const section = document.getElementById('access');
    const wordEl = document.getElementById('show-word');
    sw.addEventListener('click', () => {
      const on = sw.getAttribute('aria-checked') !== 'true';
      sw.setAttribute('aria-checked', String(on));
      section.dataset.on = String(on);
      wordEl.textContent = on ? 'on' : 'off';
    });
  }

  /* ---------- Who it's for: resident / manager tabs ---------- */
  const tabs = Array.from(document.querySelectorAll('.seg__opt'));
  const pick = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      panel.hidden = !on;
      panel.classList.toggle('is-shown', on);
    });
    if (focus) tab.focus();
  };
  if (tabs.length) {
    pick(tabs[0], false);
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => pick(t, false));
      t.addEventListener('keydown', (e) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (step) { e.preventDefault(); pick(tabs[(i + step + tabs.length) % tabs.length], true); }
        else if (e.key === 'Home') { e.preventDefault(); pick(tabs[0], true); }
        else if (e.key === 'End') { e.preventDefault(); pick(tabs[tabs.length - 1], true); }
      });
    });
    // "For residents" links open the resident tab
    document.querySelectorAll('a[data-pick="resident"]').forEach((a) => a.addEventListener('click', () => pick(tabs[0], false)));
  }

  /* ---------- Waitlist: confirmed in the page, no mail client ---------- */
  const form = document.getElementById('waitlist');
  if (form) {
    const done = document.getElementById('waitlist-done');
    const doneTitle = document.getElementById('done-title');
    const doneText = document.getElementById('done-text');
    const again = document.getElementById('waitlist-again');
    const error = document.getElementById('email-error');
    const units = document.getElementById('units-field');
    const email = form.elements.email;

    const role = () => form.elements.who.value;
    const syncRole = () => { units.hidden = role() !== 'manager'; };
    form.addEventListener('change', (e) => { if (e.target.name === 'who') syncRole(); });

    const clearError = () => { form.classList.remove('is-invalid'); error.textContent = ''; email.removeAttribute('aria-invalid'); };
    email.addEventListener('input', clearError);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = email.value.trim();
      if (!value || !email.checkValidity()) {
        form.classList.add('is-invalid');
        email.setAttribute('aria-invalid', 'true');
        error.textContent = value ? 'That address looks incomplete. Check it and try again.' : 'Enter your email address to join.';
        email.focus();
        return;
      }
      // No backend yet: the sign-up is kept in this browser only. Wire to a form service before launch.
      const entry = { email: value, role: role(), units: form.elements.units.value || null, at: new Date().toISOString() };
      try { localStorage.setItem('smartmailbox-waitlist', JSON.stringify(entry)); } catch (err) { /* storage unavailable */ }

      const safe = document.createElement('b');
      safe.textContent = value;
      if (entry.role === 'manager') {
        doneTitle.textContent = 'Pilot request received';
        doneText.innerHTML = 'We will contact ' + safe.outerHTML + ' about evaluating Smart Mailbox in your building.';
      } else {
        doneTitle.textContent = "You're on the list";
        doneText.innerHTML = 'We will write to ' + safe.outerHTML + ' when the first kits are ready, with prices before anyone else.';
      }
      form.hidden = true;
      done.hidden = false;
      doneTitle.focus();
    });

    again.addEventListener('click', () => {
      done.hidden = true;
      form.hidden = false;
      email.select();
      email.focus();
    });

    // "Request a building pilot" buttons preselect the manager role
    document.addEventListener('click', (e) => {
      if (!e.target.closest('[data-role-pick="manager"]')) return;
      form.elements.who.value = 'manager';
      syncRole();
      if (!form.hidden) setTimeout(() => email.focus({ preventScroll: true }), 600);
    });
    syncRole();
  }

  /* ---------- Section entrances ---------- */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    // stagger siblings inside a section
    document.querySelectorAll('section').forEach((sec) => {
      sec.querySelectorAll('.reveal').forEach((el, i) => el.style.setProperty('--d', (i * 80) + 'ms'));
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- FAQ assistant ---------- */
  const FAQ = [
    { q: 'How does it work?', a: 'A small sensor module sits inside your mailbox. When mail is resting inside, the app shows “Mail arrived” and sends a push alert. Take the mail out and it resets to “Empty”.' },
    { q: 'Do I need Wi-Fi?', a: 'No. Each module has its own low-cost cellular connection (LTE-M / NB-IoT), so it works at the kerb, at the end of a drive or in a basement lobby.' },
    { q: 'Will wind set it off?', a: 'No. The optical presence sensor checks whether something is actually resting in the box. Wind, rain or a rattling lid are ignored.' },
    { q: 'Can a neighbour open my box?', a: 'Yes, with the lock add-on. In the app you choose a person and a time window. Their code only works inside that window, and every opening is logged.' },
    { q: 'What about big parcels?', a: 'In buildings with a parcel room, the caretaker scans the parcel, puts it on a free shelf and you get a pickup alert with the shelf and a code.' },
    { q: 'Battery and weather?', a: 'About two years per replaceable pack, with a warning weeks ahead. The housing is IP67 sealed and rated from −25 °C to +60 °C, so rain, heat and frost are fine.' },
    { q: 'Is there a camera?', a: 'No, zero cameras. The optical sensor detects that something is inside, not what it is. Nothing is filmed and nothing about your mail is stored.' },
    { q: 'What will it cost?', a: 'A one-time kit price plus a low-cost cellular plan (LTE-M / NB-IoT) for the connection and support. Month to month, no long-term contract. Waitlist members hear final prices first.' },
    { q: 'I manage a building', a: 'We are looking for pilot buildings. <a href="#start" data-role-pick="manager">Request a building pilot</a> and we will get in touch.' },
    { q: 'Can I try it?', a: 'Yes, the demo runs in your browser. <a href="demo.html">Open the demo</a> and choose resident or caretaker.' }
  ];

  const openBtn = document.getElementById('assist-open');
  const panel = document.getElementById('assist-panel');
  const closeBtn = document.getElementById('assist-close');
  const logEl = document.getElementById('assist-log');
  const chips = document.getElementById('assist-chips');

  if (openBtn && panel) {
    const say = (cls, html) => {
      const p = document.createElement('p');
      p.className = 'msg ' + cls;
      p.innerHTML = html;
      logEl.appendChild(p);
      logEl.scrollTop = logEl.scrollHeight;
    };

    FAQ.forEach((item) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = item.q;
      b.addEventListener('click', () => {
        say('msg--user', item.q);
        setTimeout(() => say('msg--bot', item.a), 260);
      });
      chips.appendChild(b);
    });

    const setOpen = (open) => {
      panel.hidden = !open;
      openBtn.setAttribute('aria-expanded', String(open));
      openBtn.lastChild.textContent = open ? 'Close' : 'Questions?';
      if (open) chips.querySelector('button').focus();
    };
    openBtn.addEventListener('click', () => setOpen(panel.hidden));
    closeBtn.addEventListener('click', () => { setOpen(false); openBtn.focus(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !panel.hidden) { setOpen(false); openBtn.focus(); }
    });
  }
})();
