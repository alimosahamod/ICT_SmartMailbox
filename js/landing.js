/* Smart Mailbox — landing page behaviour */
(function () {
  'use strict';

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

  /* ---------- Waitlist: mailto with the address filled in ---------- */
  const form = document.getElementById('waitlist');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      if (!form.reportValidity()) return;
      const body = 'Please add me to the Smart Mailbox waitlist.\n\nEmail: ' + email;
      window.location.href = 'mailto:hello@smartmailbox.example?subject=' + encodeURIComponent('Smart Mailbox waitlist') + '&body=' + encodeURIComponent(body);
      document.getElementById('waitlist-done').hidden = false;
    });
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
    { q: 'Do I need Wi-Fi?', a: 'No. Each module has its own low-power mobile connection (LTE-M / NB-IoT), so it works at the kerb, at the end of a drive or in a basement lobby.' },
    { q: 'Can a neighbour open my box?', a: 'Yes, with the lock add-on. In the app you choose a person and a time window. Their code only works inside that window, and every opening is logged.' },
    { q: 'What about big parcels?', a: 'In buildings with a parcel room, the caretaker scans the parcel, puts it on a free shelf and you get a pickup alert with the shelf and a code.' },
    { q: 'Battery and weather?', a: 'About two years per replaceable pack, with a warning weeks ahead. The housing is IP67 sealed and rated from −25 °C to +60 °C, so rain, heat and frost are fine.' },
    { q: 'Is there a camera?', a: 'No. It detects that something is inside, not what it is. Nothing is filmed and no content of your mail is stored.' },
    { q: 'What will it cost?', a: 'A one-time kit plus a small monthly fee for the mobile connection and support. Waitlist members hear final prices first.' },
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
