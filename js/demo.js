/* Smart Mailbox — interactive prototype
   One shared state for both roles, so a parcel the caretaker scans in
   reaches the resident's app. Persisted in localStorage when available. */
(function () {
  'use strict';

  const KEY = 'smartmailbox-demo-v1';
  const app = document.getElementById('app');
  const pushEl = document.getElementById('push');
  const tasksEl = document.getElementById('guide-tasks');
  const ledeEl = document.getElementById('guide-lede');
  const panel = document.getElementById('demo-panel');
  const simEl = document.getElementById('sim-body');
  const handoffEl = document.getElementById('handoff');

  /* ---------- helpers ---------- */
  const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;
  const pad = (n) => String(n).padStart(2, '0');
  const hm = (t) => { const d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
  const dayLabel = (t) => {
    const d = new Date(t), n = Date.now();
    if (sameDay(t, n)) return 'Today';
    if (sameDay(t, n - DAY)) return 'Yesterday';
    if (sameDay(t, n + DAY)) return 'Tomorrow';
    return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
  };
  const when = (t) => dayLabel(t) + ', ' + hm(t);
  const ago = (t) => {
    const m = Math.round((Date.now() - t) / MIN);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    const h = Math.round(m / 60);
    if (h < 24) return h + ' h ago';
    const d = Math.round(h / 24);
    return d + (d === 1 ? ' day' : ' days') + ' ago';
  };
  const toLocalInput = (t) => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const code6 = () => String(Math.floor(100000 + Math.random() * 900000));
  const code4 = () => String(Math.floor(1000 + Math.random() * 9000));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9);

  /* ---------- seed data ---------- */
  const ME = { name: 'Sam Okafor', apt: '4B', box: 'Mailbox 4B' };
  const CARETAKER = { name: 'Jonas Weber' };
  const BUILDING = 'Harbour View Residences';
  const CONTACTS = [
    { name: 'Lea Brandt', apt: '3B', rel: 'Neighbour' },
    { name: 'Tomás Rivera', apt: '5A', rel: 'Neighbour' },
    { name: 'Grace Okafor', apt: '', rel: 'Family' }
  ];
  const SHELVES = ['A', 'B', 'C', 'D'].flatMap((r) => [1, 2, 3, 4, 5, 6].map((n) => r + n));
  // What the simulated carrier can leave at the parcel room door.
  const SAM_DELIVERIES = [
    { carrier: 'DHL', prefix: 'JD01460', name: 'Sam Okafor', apt: '4B', size: 'L', desc: 'Box, 50 × 40 × 30 cm, 4.8 kg' },
    { carrier: 'GLS', prefix: '6040', name: 'Sam Okafor', apt: '4B', size: 'XL', desc: 'Box, 100 × 30 × 30 cm, 9.5 kg' }
  ];
  const NEIGHBOUR_DELIVERIES = [
    { carrier: 'DPD', prefix: '0150', name: 'Chen Wei', apt: '7A', size: 'M', desc: 'Padded bag, 1.6 kg' },
    { carrier: 'UPS', prefix: '1Z999AA1', name: 'Aino Virtanen', apt: '1A', size: 'L', desc: 'Box, 60 × 40 × 20 cm, 5.1 kg' },
    { carrier: 'Amazon', prefix: 'TBA30', name: 'Noah Fischer', apt: '6A', size: 'M', desc: 'Box, 35 × 25 × 15 cm, 2.2 kg' }
  ];
  let drops = 0;

  function seed() {
    const n = Date.now();
    const waiting = [
      ['DHL', 'JD0146003881', 'Mia Lindqvist', '2A', 'L', 'A1', 4.2],
      ['UPS', '1Z999AA10123', 'Omar Haddad', '6C', 'XL', 'A3', 3.4],
      ['PostNord', '00370731', 'Lea Brandt', '3B', 'M', 'A4', 1.1],
      ['DPD', '01505012', 'Priya Nair', '1D', 'L', 'B2', 0.9],
      ['GLS', '6040 2271', 'Tomás Rivera', '5A', 'M', 'B5', 0.6],
      ['DHL', 'JD0146009934', 'Chen Wei', '7A', 'L', 'C1', 0.4],
      ['Amazon', 'TBA30219844', 'Mia Lindqvist', '2A', 'M', 'C4', 0.25],
      ['UPS', '1Z999AA10988', 'Noah Fischer', '6A', 'XL', 'D2', 0.15],
      ['Posti', 'JJFI6402881', 'Aino Virtanen', '1A', 'M', 'D6', 0.05]
    ].map(([carrier, tracking, name, apt, size, shelf, d]) => ({
      id: uid(), carrier, tracking, name, apt, size, shelf, inAt: n - d * DAY, code: code4(), status: 'waiting'
    }));
    return {
      role: null,
      tab: 'home',
      mailbox: { items: 2, lastArrival: n - 38 * MIN, lastEmptied: n - 26 * HOUR, battery: 87, temp: 21, humidity: 48 },
      parcels: waiting.concat([
        { id: uid(), carrier: 'DHL', tracking: 'JD0146001207', name: 'Sam Okafor', apt: '4B', size: 'L', shelf: null, inAt: n - 3 * DAY, code: code4(), status: 'collected', outAt: n - 3 * DAY + 5 * HOUR }
      ]),
      queue: [
        { carrier: 'DHL', tracking: 'JD0146003885', name: 'Sam Okafor', apt: '4B', size: 'L', desc: 'Box, 60 × 40 × 40 cm, 6.2 kg' },
        { carrier: 'UPS', tracking: '1Z999AA10455', name: 'Lea Brandt', apt: '3B', size: 'XL', desc: 'Box, 90 × 50 × 30 cm, 11 kg' },
        { carrier: 'PostNord', tracking: '00370988', name: 'Priya Nair', apt: '1D', size: 'M', desc: 'Padded bag, 3.0 kg' }
      ],
      passes: [
        { id: uid(), name: 'Tomás Rivera', apt: '5A', from: n - 9 * DAY, to: n - 7 * DAY, code: code6(), revoked: false }
      ],
      log: [
        { id: uid(), t: n - 38 * MIN, kind: 'mail', text: '2 letters detected in Mailbox 4B', who: 'Sensor' },
        { id: uid(), t: n - 26 * HOUR, kind: 'mail', text: 'Mailbox 4B emptied, status reset', who: 'Sam Okafor' },
        { id: uid(), t: n - 3 * DAY + 5 * HOUR, kind: 'parcel', text: 'DHL parcel collected from shelf C2', who: 'Sam Okafor', mine: true, building: true },
        { id: uid(), t: n - 3 * DAY, kind: 'parcel', text: 'DHL parcel stored on shelf C2 for Sam Okafor, 4B', who: CARETAKER.name, mine: true, building: true },
        { id: uid(), t: n - 8 * DAY, kind: 'access', text: 'Mailbox 4B opened with an access code', who: 'Tomás Rivera' },
        { id: uid(), t: n - 9 * DAY, kind: 'access', text: 'Access granted until ' + when(n - 7 * DAY), who: 'Tomás Rivera' }
      ],
      unread: [],
      settings: { push: true, sms: true },
      done: {}
    };
  }

  let S;
  // Demo data (parcels, codes, history) is kept between visits; the role never is.
  // Every visit starts on the role choice.
  const load = () => {
    try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) { /* storage unavailable */ }
    return null;
  };
  const save = () => {
    try {
      const { role, tab, sheet, scan, filter, shelfSel, ...data } = S;
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) { /* storage unavailable */ }
  };
  S = Object.assign(load() || seed(), { role: null, tab: 'home', sheet: false, scan: null, filter: 'all', shelfSel: null });

  const log = (kind, text, who) => { S.log.unshift({ id: uid(), t: Date.now(), kind, text, who }); };
  const done = (task) => { if (!S.done[task]) { S.done[task] = Date.now(); } };

  /* ---------- tasks shown beside the device ---------- */
  const TASKS = {
    resident: [
      ['seeStatus', 'See whether mail has arrived'],
      ['collect', 'Collect the mail and watch it reset'],
      ['grant', 'Give a neighbour timed access'],
      ['useCode', 'Let the neighbour open your box'],
      ['history', 'Check what happened while you were away']
    ],
    caretaker: [
      ['overview', 'Check parcels and storage space'],
      ['scan', 'Scan an oversized parcel'],
      ['store', 'Store it and alert the resident'],
      ['residentSees', 'See the alert as the resident'],
      ['handover', 'Mark a parcel as collected']
    ]
  };

  function renderGuide() {
    panel.querySelectorAll('input[name="demo-role"]').forEach((r) => { r.checked = r.value === S.role; });
    renderHandoff();
    renderSim();
    if (!S.role) {
      ledeEl.textContent = 'Pick a role to start. Each role has its own journey to try.';
      tasksEl.innerHTML = '';
      return;
    }
    const list = TASKS[S.role];
    const count = list.filter(([k]) => S.done[k]).length;
    ledeEl.textContent = S.role === 'resident'
      ? 'You are Sam Okafor, resident of apartment 4B. Try these in any order.'
      : 'You are Jonas Weber, caretaker at Harbour View Residences. Try these in any order.';
    tasksEl.innerHTML = '<p class="guide__count tnum">' + count + ' of ' + list.length + ' done</p><ol class="tasks">' +
      list.map(([k, title]) => '<li class="' + (S.done[k] ? 'is-done' : '') + '"><span class="tick" aria-hidden="true"></span><span><b>' + title + '</b></span><span class="visually-hidden">' + (S.done[k] ? 'done' : 'not done yet') + '</span></li>').join('') + '</ol>';
  }

  /* The caretaker's shortcut into Sam's phone, once a parcel for 4B is on a shelf. */
  function renderHandoff() {
    const mine = S.role === 'caretaker' ? waitingFor(ME.apt) : [];
    handoffEl.hidden = !mine.length;
    if (!mine.length) { handoffEl.innerHTML = ''; return; }
    const p = mine[mine.length - 1];
    handoffEl.innerHTML = '<p>Sam has a parcel on shelf <b>' + p.shelf + '</b>.</p>' +
      '<button type="button" class="btn btn--ink btn--small" data-act="seeAsSam">See it as Sam</button>';
  }

  /* ---------- simulate: the world outside the app ---------- */
  // Rebuilt only when what it shows changes, so a half-typed code and its result survive app renders.
  // The keypad test belongs to the Access screen and is shown only while it is open.
  let simKey = '';
  function renderSim() {
    const latest = S.lastPass ? S.passes.find((p) => p.id === S.lastPass) : null;
    const code = latest && !latest.revoked ? latest.code : '';
    const keypad = S.role === 'resident' && S.tab === 'access';
    const key = [S.role, keypad, code, S.queue.map((q) => q.tracking).join()].join('|');
    if (key === simKey) return;
    simKey = key;
    if (!S.role) {
      simEl.innerHTML = '<div class="sim-group"><p>Pick a role first. The actions here change with it.</p></div>';
      return;
    }
    if (S.role === 'resident') {
      simEl.innerHTML =
        '<section class="sim-group" aria-labelledby="sg-mail"><h3 id="sg-mail">The postal carrier</h3><p>Puts something through the slot of Mailbox 4B.</p>' +
          '<div class="btn-row"><button type="button" class="btn btn--small" data-act="deliver">Deliver a letter</button></div></section>' +
        (keypad ? '<section class="sim-group" aria-labelledby="sg-code"><h3 id="sg-code">Test a code</h3><p>Be the neighbour typing a code into the keypad on Mailbox 4B.</p>' +
          '<form id="code-form" class="form" novalidate>' +
          '<div class="field2"><label>Code<input name="code" inputmode="numeric" autocomplete="off" maxlength="7" placeholder="6 digits" value="' + code + '"></label>' +
          '<label>Time at the box<input type="datetime-local" name="at" value="' + toLocalInput(Date.now()) + '"></label></div>' +
          '<button class="btn btn--small" type="submit">Enter code at the box</button>' +
          '<p class="sim-result" id="code-result" role="status"></p></form></section>' : '');
      return;
    }
    const q = S.queue;
    simEl.innerHTML =
      '<section class="sim-group" aria-labelledby="sg-door"><h3 id="sg-door">The parcel carrier</h3>' +
        '<p>' + (q.length ? (q.length === 1 ? 'One parcel is' : q.length + ' parcels are') + ' at the parcel room door, waiting to be scanned.' : 'Nothing at the parcel room door. Drop a parcel to scan it in.') + '</p>' +
        (q.length ? '<ul class="door tnum">' + q.slice(0, 4).map((it) => '<li><b>' + esc(it.carrier) + '</b> for ' + esc(it.name) + ', ' + it.apt + '</li>').join('') +
          (q.length > 4 ? '<li>and ' + (q.length - 4) + ' more</li>' : '') + '</ul>' : '') +
        '<div class="btn-row"><button type="button" class="btn btn--small" data-act="dropParcel" data-for="sam">Drop a parcel for Sam</button><button type="button" class="btn btn--small btn--quiet" data-act="dropParcel" data-for="other">One for a neighbour</button></div></section>';
  }

  /* ---------- push banner inside the device ---------- */
  let pushTimer;
  function push(title, text, tone) {
    pushEl.innerHTML = '<span class="push__mark ' + (tone || '') + '" aria-hidden="true"></span><span><b>' + esc(title) + '</b>' + esc(text) + '</span><span class="push__time">now</span>';
    pushEl.hidden = false;
    pushEl.classList.remove('is-in'); void pushEl.offsetWidth; pushEl.classList.add('is-in');
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => { pushEl.hidden = true; }, 4200);
  }
  pushEl.addEventListener('click', () => { pushEl.hidden = true; });

  /* ---------- icons (one outline set, 20px) ---------- */
  const I = {
    home: '<path d="M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4z"/>',
    key: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M21 12v2"/>',
    box: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    scan: '<path d="M3 8V4h4M17 4h4v4M21 16v4h-4M7 20H3v-4"/><path d="M7 9v6M10 9v6M13 9v6M17 9v6"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'
  };
  const icon = (n) => '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + I[n] + '</svg>';

  /* ---------- shell ---------- */
  const RES_TABS = [['home', 'Home', 'home'], ['access', 'Access', 'key'], ['parcels', 'Parcels', 'box'], ['history', 'History', 'list']];
  const CT_TABS = [['overview', 'Overview', 'chart'], ['scan', 'Scan', 'scan'], ['storage', 'Storage', 'grid'], ['log', 'Log', 'list']];

  function shell(title, sub, body, tabs) {
    const who = S.role === 'resident' ? 'SO' : 'JW';
    return '<header class="bar">' +
      '<div class="bar__title"><span class="bar__mark ' + (S.role === 'resident' ? 'm-mint' : 'm-pink') + '" aria-hidden="true"></span><div><h1>' + title + '</h1><p>' + sub + '</p></div></div>' +
      '<button class="avatar ' + (S.role === 'resident' ? 'm-mint' : 'm-pink') + '" type="button" data-act="profile" aria-label="Profile and settings">' + who + '</button>' +
      '</header>' +
      '<main class="screen" id="screen" tabindex="-1">' + body + '</main>' +
      '<nav class="tabs" aria-label="Sections">' + tabs.map(([k, label, ic]) =>
        '<button type="button" data-tab="' + k + '" class="tab' + (S.tab === k ? ' is-on' : '') + '"' + (S.tab === k ? ' aria-current="page"' : '') + '>' + icon(ic) + '<span>' + label + '</span>' +
        (k === 'parcels' && waitingFor(ME.apt).length ? '<i class="badge tnum">' + waitingFor(ME.apt).length + '</i>' : '') + '</button>').join('') +
      '</nav>';
  }

  const waitingFor = (apt) => S.parcels.filter((p) => p.status === 'waiting' && p.apt === apt);
  const waiting = () => S.parcels.filter((p) => p.status === 'waiting');

  /* ---------- role picker ---------- */
  function rolePicker() {
    return '<div class="pick">' +
      '<div class="pick__brand"><span class="bar__mark m-mint" aria-hidden="true"></span>Smart Mailbox</div>' +
      '<h1 class="pick__title">Who is using the app?</h1>' +
      '<p class="pick__lede">' + BUILDING + '. Pick a role to see its own app.</p>' +
      '<button type="button" class="role role--mint" data-role="resident">' +
        '<span class="role__name">Resident</span><span class="role__who">Sam Okafor · Apartment 4B</span>' +
        '<span class="role__does">See your mailbox status, give neighbours timed access, track parcels.</span>' +
        '<span class="role__go" aria-hidden="true"></span></button>' +
      '<button type="button" class="role role--pink" data-role="caretaker">' +
        '<span class="role__name">Property manager / caretaker</span><span class="role__who">Jonas Weber · whole building</span>' +
        '<span class="role__does">Scan oversized parcels into storage and alert residents.</span>' +
        '<span class="role__go" aria-hidden="true"></span></button>' +
      '</div>';
  }

  /* ---------- resident: home ---------- */
  function resHome() {
    const m = S.mailbox;
    const arrived = m.items > 0;
    const myParcels = waitingFor(ME.apt);
    const activePasses = S.passes.filter((p) => !p.revoked && p.from <= Date.now() && p.to >= Date.now());
    const unread = S.unread.length ? '<div class="notice" role="status"><b>While you were away</b><ul>' + S.unread.map((u) => '<li>' + esc(u) + '</li>').join('') + '</ul><button type="button" class="link" data-act="clearUnread">Mark as read</button></div>' : '';
    return unread +
      '<section class="status-card ' + (arrived ? 'is-arrived' : 'is-empty') + '" aria-labelledby="st-h">' +
        '<p class="status-card__box">' + ME.box + '</p>' +
        '<h3 id="st-h" class="status-card__word"><span class="slot-dot" aria-hidden="true"></span>' + (arrived ? 'Mail arrived' : 'Empty') + '</h3>' +
        '<p class="status-card__meta tnum">' + (arrived
          ? (m.items === 1 ? '1 item' : m.items + ' items') + ' inside · since ' + hm(m.lastArrival) + ' (' + ago(m.lastArrival) + ')'
          : 'Emptied ' + when(m.lastEmptied) + ' · resets by itself') + '</p>' +
        (arrived ? '<button type="button" class="btn btn--ink btn--block" data-act="collect">I took the mail out</button>' : '<p class="status-card__calm">Nothing to fetch. We will tell you when something arrives.</p>') +
      '</section>' +
      '<dl class="readout tnum">' +
        '<div><dt>Battery</dt><dd>' + m.battery + '%</dd></div>' +
        '<div><dt>Signal</dt><dd>LTE-M good</dd></div>' +
        '<div><dt>Inside box</dt><dd>' + m.temp + ' °C · ' + m.humidity + '%</dd></div>' +
      '</dl>' +
      (myParcels.length ? '<section class="card card--pink" aria-labelledby="pp-h"><h3 id="pp-h">' + (myParcels.length === 1 ? 'A parcel is waiting for you' : myParcels.length + ' parcels are waiting for you') + '</h3>' +
        myParcels.map((p) => '<p class="tnum">' + esc(p.carrier) + ' · parcel room shelf <b>' + p.shelf + '</b> · pickup code <b>' + p.code + '</b></p>').join('') +
        '<button type="button" class="link" data-go="parcels">See parcels</button></section>' : '') +
      '<section class="card" aria-labelledby="ac-h"><div class="card__row"><h3 id="ac-h">Access</h3><button type="button" class="link" data-go="access">' + (activePasses.length ? 'Manage' : 'Give access') + '</button></div>' +
        (activePasses.length ? activePasses.map((p) => '<p>' + esc(p.name) + ' can open your box until ' + when(p.to) + '</p>').join('') : '<p class="muted">Only you can open Mailbox 4B right now.</p>') +
      '</section>';
  }

  /* ---------- resident: access ---------- */
  function passState(p) {
    const n = Date.now();
    if (p.revoked) return ['Revoked', 'grey'];
    if (n < p.from) return ['Scheduled', 'amber'];
    if (n > p.to) return ['Expired', 'grey'];
    return ['Active', 'green'];
  }

  function resAccess() {
    const n = Date.now();
    const defFrom = n;
    const end = new Date(n + 2 * DAY); end.setHours(20, 0, 0, 0);
    const passes = S.passes.slice().sort((a, b) => b.from - a.from);
    const latest = S.lastPass ? S.passes.find((p) => p.id === S.lastPass) : null;
    return '<h3 class="screen__title">Access to Mailbox 4B</h3>' +
      (latest && !latest.revoked ? '<section class="code-card" aria-labelledby="cc-h"><h4 id="cc-h">Code for ' + esc(latest.name) + '</h4>' +
        '<p class="code-card__code tnum" aria-label="Code ' + latest.code.split('').join(' ') + '">' + latest.code.slice(0, 3) + ' ' + latest.code.slice(3) + '</p>' +
        '<p class="tnum">Works ' + when(latest.from) + ' to ' + when(latest.to) + '</p>' +
        '<button type="button" class="btn btn--small btn--quiet" data-act="share" data-id="' + latest.id + '">Copy message to send</button></section>' : '') +
      '<details class="form-card"' + (S.passes.filter((p) => !p.revoked && p.to > n).length ? '' : ' open') + '><summary>New access</summary>' +
      '<form id="pass-form" class="form" novalidate>' +
        '<fieldset><legend>Who</legend><div class="choices">' + CONTACTS.map((c, i) =>
          '<label class="choice"><input type="radio" name="who" value="' + i + '"' + (i === 0 ? ' checked' : '') + '><span><b>' + c.name + '</b><small>' + c.rel + (c.apt ? ', ' + c.apt : '') + '</small></span></label>').join('') + '</div></fieldset>' +
        '<div class="field2"><label>From<input type="datetime-local" name="from" value="' + toLocalInput(defFrom) + '" required></label>' +
        '<label>Until<input type="datetime-local" name="to" value="' + toLocalInput(end) + '" required></label></div>' +
        '<p class="form__err" id="pass-err" role="alert"></p>' +
        '<button class="btn btn--block" type="submit">Create access code</button>' +
      '</form></details>' +
      '<h3 class="screen__sub">Access codes</h3>' +
      '<ul class="rows">' + passes.map((p) => {
        const [label, tone] = passState(p);
        return '<li class="row"><div><b>' + esc(p.name) + '</b><small class="tnum">' + when(p.from) + ' – ' + when(p.to) + '</small></div>' +
          '<span class="pill pill--' + tone + '">' + label + '</span>' +
          (!p.revoked && p.to > n ? '<button type="button" class="link link--danger" data-act="revoke" data-id="' + p.id + '">Revoke</button>' : '') + '</li>';
      }).join('') + '</ul>';
  }

  /* ---------- resident: parcels ---------- */
  function resParcels() {
    const mine = S.parcels.filter((p) => p.apt === ME.apt).sort((a, b) => b.inAt - a.inAt);
    const w = mine.filter((p) => p.status === 'waiting');
    const c = mine.filter((p) => p.status === 'collected');
    return '<h3 class="screen__title">Parcels</h3>' +
      (w.length ? w.map((p) => '<section class="parcel-card"><div class="parcel-card__top"><b>' + esc(p.carrier) + '</b><span class="pill pill--amber">Waiting</span></div>' +
        '<p class="parcel-card__shelf">Shelf <b>' + p.shelf + '</b></p>' +
        '<dl class="kv tnum"><div><dt>Pickup code</dt><dd>' + p.code + '</dd></div><div><dt>Stored</dt><dd>' + when(p.inAt) + '</dd></div><div><dt>Size</dt><dd>' + p.size + '</dd></div><div><dt>Tracking</dt><dd>' + esc(p.tracking) + '</dd></div></dl>' +
        '<button type="button" class="btn btn--small btn--block" data-act="pickup" data-id="' + p.id + '">I picked it up</button></section>').join('')
        : '<div class="empty"><p><b>No parcels waiting.</b></p><p class="muted">When the caretaker stores one for you, it shows here with its shelf and pickup code.</p></div>') +
      '<h3 class="screen__sub">Collected</h3>' +
      (c.length ? '<ul class="rows">' + c.map((p) => '<li class="row"><div><b>' + esc(p.carrier) + '</b><small class="tnum">Collected ' + when(p.outAt) + '</small></div><span class="pill pill--grey">Collected</span></li>').join('') + '</ul>' : '<p class="muted">Nothing yet.</p>');
  }

  /* ---------- history (both roles, filtered) ---------- */
  function historyView(scope) {
    const f = S.filter || 'all';
    const kinds = scope === 'caretaker' ? [['all', 'All'], ['stored', 'Stored'], ['out', 'Collected']] : [['all', 'All'], ['mail', 'Mail'], ['parcel', 'Parcels'], ['access', 'Access']];
    let items = S.log;
    if (scope === 'resident') items = items.filter((e) => e.kind !== 'parcel' || e.mine);
    if (scope === 'caretaker') items = items.filter((e) => e.kind === 'parcel' || e.building);
    if (f === 'stored') items = items.filter((e) => /stored/.test(e.text));
    else if (f === 'out') items = items.filter((e) => /collected|handed/.test(e.text));
    else if (f !== 'all') items = items.filter((e) => e.kind === f);
    let last = '';
    return '<h3 class="screen__title">' + (scope === 'caretaker' ? 'Parcel room log' : 'History') + '</h3>' +
      '<div class="chips" role="group" aria-label="Filter">' + kinds.map(([k, l]) => '<button type="button" class="chip' + (f === k ? ' is-on' : '') + '" aria-pressed="' + (f === k) + '" data-filter="' + k + '">' + l + '</button>').join('') + '</div>' +
      (items.length ? '<ol class="log">' + items.map((e) => {
        const d = dayLabel(e.t); const head = d !== last ? '<li class="log__day">' + d + '</li>' : ''; last = d;
        return head + '<li class="log__item log--' + e.kind + '"><span class="log__time tnum">' + hm(e.t) + '</span><span><b>' + esc(e.text) + '</b><small>' + esc(e.who) + '</small></span></li>';
      }).join('') + '</ol>' : '<p class="muted">Nothing in this filter yet.</p>');
  }

  /* ---------- caretaker: overview ---------- */
  function ctOverview() {
    const w = waiting();
    const used = new Set(w.map((p) => p.shelf)).size;
    const old = w.filter((p) => Date.now() - p.inAt > 3 * DAY);
    const today = S.log.filter((e) => e.kind === 'parcel' && /stored/.test(e.text) && sameDay(e.t, Date.now())).length;
    const sorted = w.slice().sort((a, b) => a.inAt - b.inAt);
    return '<h3 class="screen__title">Parcel room</h3>' +
      '<dl class="kpis tnum">' +
        '<div><dt>Waiting</dt><dd>' + w.length + '</dd></div>' +
        '<div><dt>Shelves free</dt><dd>' + (SHELVES.length - used) + '<small> of ' + SHELVES.length + '</small></dd></div>' +
        '<div><dt>Over 3 days</dt><dd' + (old.length ? ' class="warn"' : '') + '>' + old.length + '</dd></div>' +
        '<div><dt>Stored today</dt><dd>' + today + '</dd></div>' +
      '</dl>' +
      '<div class="capbar" role="img" aria-label="' + used + ' of ' + SHELVES.length + ' shelves used"><span style="width:' + (used / SHELVES.length * 100).toFixed(1) + '%"></span></div>' +
      '<p class="muted tnum capnote">' + used + ' of ' + SHELVES.length + ' shelves used</p>' +
      '<button type="button" class="btn btn--block" data-go="scan">' + icon('scan') + 'Scan a parcel in</button>' +
      '<h3 class="screen__sub">Waiting for pickup, oldest first</h3>' +
      '<ul class="rows">' + sorted.map((p) => {
        const days = (Date.now() - p.inAt) / DAY;
        return '<li class="row"><div><b>' + esc(p.name) + ' · ' + p.apt + '</b><small class="tnum">' + esc(p.carrier) + ' · shelf ' + p.shelf + ' · ' + ago(p.inAt) + '</small></div>' +
          (days > 3 ? '<button type="button" class="link" data-act="remind" data-id="' + p.id + '">Remind</button>' : '<span class="pill pill--grey">' + p.size + '</span>') + '</li>';
      }).join('') + '</ul>';
  }

  /* ---------- caretaker: scan ---------- */
  function freeShelves() {
    const used = new Set(waiting().map((p) => p.shelf));
    return SHELVES.filter((s) => !used.has(s));
  }

  function ctScan() {
    const sc = S.scan;
    if (sc && sc.stage === 'stored') {
      const p = S.parcels.find((x) => x.id === sc.parcelId);
      return '<section class="done-card" aria-labelledby="dn-h"><span class="done-card__mark" aria-hidden="true"></span>' +
        '<h3 id="dn-h">Stored on shelf ' + p.shelf + '</h3>' +
        '<p>' + esc(p.name) + ' (' + p.apt + ') got a push alert at ' + hm(p.inAt) + ' with pickup code <b class="tnum">' + p.code + '</b>.</p>' +
        '<div class="phone-note"><b>Smart Mailbox</b><span>Your ' + esc(p.carrier) + ' parcel is in the parcel room, shelf ' + p.shelf + '. Code ' + p.code + '.</span></div>' +
        '<div class="btn-row"><button type="button" class="btn btn--small" data-act="scanAgain">Scan next parcel</button></div></section>';
    }
    if (sc && sc.stage === 'matched') {
      const it = sc.item;
      const free = freeShelves();
      if (!sc.shelf || !free.includes(sc.shelf)) sc.shelf = free[0];
      return '<h3 class="screen__title">Parcel scanned</h3>' +
        '<section class="card" aria-labelledby="pm-h"><div class="card__row"><h3 id="pm-h">' + esc(it.carrier) + '</h3><span class="pill pill--green">Resident matched</span></div>' +
          '<dl class="kv tnum"><div><dt>Tracking</dt><dd>' + esc(it.tracking) + '</dd></div><div><dt>Resident</dt><dd>' + esc(it.name) + ', ' + it.apt + '</dd></div><div><dt>Parcel</dt><dd>' + esc(it.desc) + '</dd></div></dl></section>' +
        '<fieldset class="sizes"><legend>Size</legend>' + ['M', 'L', 'XL'].map((s) => '<label class="seg"><input type="radio" name="size" value="' + s + '"' + (it.size === s ? ' checked' : '') + ' data-act="size"><span>' + s + '</span></label>').join('') + '</fieldset>' +
        '<fieldset class="shelf-pick"><legend>Shelf <span class="muted tnum">(' + free.length + ' free, ' + sc.shelf + ' suggested)</span></legend><div class="shelves">' +
          SHELVES.map((s) => { const isFree = free.includes(s); return '<label class="shelf' + (isFree ? '' : ' is-used') + '"><input type="radio" name="shelf" value="' + s + '"' + (s === sc.shelf ? ' checked' : '') + (isFree ? '' : ' disabled') + ' data-act="shelf"><span>' + s + '</span></label>'; }).join('') +
        '</div></fieldset>' +
        '<button type="button" class="btn btn--block" data-act="store">Store and notify ' + esc(it.name.split(' ')[0]) + '</button>' +
        '<button type="button" class="link link--center" data-act="cancelScan">Cancel</button>';
    }
    const next = S.queue[0];
    return '<h3 class="screen__title">Scan a parcel</h3>' +
      '<div class="viewfinder' + (sc && sc.stage === 'scanning' ? ' is-scanning' : '') + '" aria-hidden="true"><span class="vf__line"></span><span class="vf__label tnum">' + (next ? esc(next.tracking) : '') + '</span></div>' +
      '<button type="button" class="btn btn--block" data-act="doScan"' + (sc && sc.stage === 'scanning' ? ' disabled' : '') + '>' + (sc && sc.stage === 'scanning' ? 'Reading label…' : 'Scan next parcel') + '</button>' +
      (sc && sc.stage === 'nolabel' ? '<p class="form__err center" role="alert">No label found. Hold the parcel label inside the frame.</p>' : '<p class="muted center">Hold the shipping label inside the frame.</p>') +
      '<form id="manual-form" class="form manual" novalidate><label>Or type a tracking number<input name="tracking" autocomplete="off" placeholder="e.g. JD0146003885"></label><button class="btn btn--small btn--quiet" type="submit">Find</button><p class="form__err" id="manual-err" role="alert"></p></form>';
  }

  /* ---------- caretaker: storage ---------- */
  function ctStorage() {
    const w = waiting();
    const by = Object.fromEntries(w.map((p) => [p.shelf, p]));
    const sel = S.shelfSel && by[S.shelfSel] ? by[S.shelfSel] : null;
    return '<h3 class="screen__title">Storage</h3>' +
      '<p class="muted tnum">' + w.length + ' of ' + SHELVES.length + ' shelves used. Choose a shelf to see its parcel.</p>' +
      '<div class="shelves shelves--big">' + SHELVES.map((s) => {
        const p = by[s];
        const late = p && Date.now() - p.inAt > 3 * DAY;
        return '<button type="button" class="shelf-btn' + (p ? ' is-used' : '') + (late ? ' is-late' : '') + (S.shelfSel === s ? ' is-sel' : '') + '" data-act="selShelf" data-shelf="' + s + '" aria-label="Shelf ' + s + (p ? ', ' + p.name + ' ' + p.apt : ', free') + '"><b>' + s + '</b><small>' + (p ? p.apt : 'free') + '</small></button>';
      }).join('') + '</div>' +
      '<p class="legend"><span class="lg lg--used"></span>In use <span class="lg lg--late"></span>Over 3 days <span class="lg lg--free"></span>Free</p>' +
      (sel ? '<section class="card" aria-labelledby="sh-h"><div class="card__row"><h3 id="sh-h">Shelf ' + sel.shelf + '</h3><span class="pill pill--' + (Date.now() - sel.inAt > 3 * DAY ? 'amber' : 'grey') + '">' + ago(sel.inAt) + '</span></div>' +
        '<dl class="kv tnum"><div><dt>Resident</dt><dd>' + esc(sel.name) + ', ' + sel.apt + '</dd></div><div><dt>Carrier</dt><dd>' + esc(sel.carrier) + ' · ' + sel.size + '</dd></div><div><dt>Pickup code</dt><dd>' + sel.code + '</dd></div></dl>' +
        '<div class="btn-row"><button type="button" class="btn btn--small" data-act="handover" data-id="' + sel.id + '">Mark collected</button><button type="button" class="btn btn--small btn--quiet" data-act="remind" data-id="' + sel.id + '">Send reminder</button></div></section>' : '');
  }

  /* ---------- profile sheet ---------- */
  function profileSheet() {
    const st = S.settings;
    const t = (k, label, sub) => '<label class="toggle"><span><b>' + label + '</b><small>' + sub + '</small></span><input type="checkbox" role="switch" data-setting="' + k + '"' + (st[k] ? ' checked' : '') + '><i aria-hidden="true"></i></label>';
    return '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-h"><div class="sheet__panel">' +
      '<div class="card__row"><h3 id="sheet-h">' + (S.role === 'resident' ? ME.name + ' · ' + ME.apt : CARETAKER.name + ' · Caretaker') + '</h3><button type="button" class="link" data-act="closeSheet">Done</button></div>' +
      (S.role === 'resident' ? t('push', 'Push alerts', 'When mail or a parcel arrives') + t('sms', 'SMS backup', 'If the push is not opened in 10 min')
        : '<dl class="kv tnum"><div><dt>Building</dt><dd>' + BUILDING + '</dd></div><div><dt>Parcel room</dt><dd>' + SHELVES.length + ' shelves</dd></div></dl>') +
      '</div></div>';
  }

  /* ---------- render ---------- */
  function render(focus) {
    let html;
    if (!S.role) html = rolePicker();
    else if (S.role === 'resident') {
      const views = { home: resHome, access: resAccess, parcels: resParcels, history: () => historyView('resident') };
      if (!views[S.tab]) S.tab = 'home';
      html = shell(ME.box, BUILDING, views[S.tab](), RES_TABS);
      if (S.tab === 'home') done('seeStatus');
      if (S.tab === 'history') done('history');
      if (S.tab === 'parcels' || S.tab === 'home') { if (S.done.store && waitingFor(ME.apt).length) done('residentSees'); }
    } else {
      const views = { overview: ctOverview, scan: ctScan, storage: ctStorage, log: () => historyView('caretaker') };
      if (!views[S.tab]) S.tab = 'overview';
      html = shell('Parcel room', BUILDING, views[S.tab](), CT_TABS);
      if (S.tab === 'overview') done('overview');
    }
    if (S.sheet) html += profileSheet();
    app.innerHTML = html;
    app.dataset.mode = S.role || 'none';
    save();
    renderGuide();
    if (focus) {
      const s = document.getElementById('screen');
      if (s) { s.scrollTop = 0; s.focus({ preventScroll: true }); }
    }
    if (S.sheet) { const b = app.querySelector('.sheet [data-act="closeSheet"]'); if (b) b.focus(); }
  }

  /* ---------- actions ---------- */
  function go(tab) { S.tab = tab; S.filter = 'all'; render(true); }

  const actions = {
    collect() {
      const n = S.mailbox.items;
      S.mailbox.items = 0; S.mailbox.lastEmptied = Date.now();
      log('mail', 'Mailbox 4B emptied (' + n + (n === 1 ? ' item' : ' items') + '), status reset', ME.name);
      done('collect');
      render();
      push('Smart Mailbox', 'Mailbox 4B is empty again.', 'mint');
    },
    deliver() {
      closeDrawer();
      S.mailbox.items += 1; S.mailbox.lastArrival = Date.now();
      log('mail', 'Letter detected in Mailbox 4B', 'Sensor');
      render();
      if (S.settings.push) push('Smart Mailbox', 'New mail in Mailbox 4B.', 'mint');
    },
    clearUnread() { S.unread = []; render(); },
    revoke(el) {
      const p = S.passes.find((x) => x.id === el.dataset.id);
      if (!p) return;
      p.revoked = true;
      log('access', 'Access revoked', p.name);
      render();
      push('Access revoked', p.name + "'s code no longer works.", 'mint');
    },
    share(el) {
      const p = S.passes.find((x) => x.id === el.dataset.id);
      const msg = 'Hi ' + p.name.split(' ')[0] + ', you can open my mailbox (4B, ' + BUILDING + ') with code ' + p.code + ' from ' + when(p.from) + ' until ' + when(p.to) + '. Thanks! Sam';
      const ok = () => { el.textContent = 'Copied'; setTimeout(() => { el.textContent = 'Copy message to send'; }, 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(msg).then(ok, () => { window.prompt('Copy this message', msg); });
      else window.prompt('Copy this message', msg);
    },
    pickup(el) {
      const p = S.parcels.find((x) => x.id === el.dataset.id);
      p.status = 'collected'; p.outAt = Date.now();
      log('parcel', p.carrier + ' parcel collected from shelf ' + p.shelf, ME.name);
      S.log[0].mine = true; S.log[0].building = true;
      render();
    },
    profile() { S.sheet = true; render(); },
    closeSheet() { S.sheet = false; render(); const a = app.querySelector('.avatar'); if (a) a.focus(); },
    seeAsSam() { closeDrawer(); setRole('resident', 'parcels'); },
    dropParcel(el) {
      const pool = el.dataset.for === 'sam' ? SAM_DELIVERIES : NEIGHBOUR_DELIVERIES;
      const { prefix, ...it } = pool[drops++ % pool.length];
      it.tracking = prefix + String(Math.floor(1e7 + Math.random() * 9e7));
      S.queue.push(it);
      if (S.scan && S.scan.stage === 'nolabel') S.scan = null;
      closeDrawer();
      render();
      push('At the parcel room door', it.carrier + ' left a parcel for ' + it.name + ', ' + it.apt + '.', 'pink');
    },
    doScan() {
      S.scan = { stage: 'scanning' };
      render();
      setTimeout(() => {
        const item = S.queue[0];
        if (!item) { S.scan = { stage: 'nolabel' }; render(); return; }
        S.scan = { stage: 'matched', item: Object.assign({}, item) };
        done('scan');
        render(true);
      }, 1300);
    },
    scanAgain() { S.scan = null; render(true); },
    cancelScan() { S.scan = null; render(true); },
    size(el) { S.scan.item.size = el.value; },
    shelf(el) { S.scan.shelf = el.value; },
    store() {
      const sc = S.scan, it = sc.item;
      const p = { id: uid(), carrier: it.carrier, tracking: it.tracking, name: it.name, apt: it.apt, size: it.size, shelf: sc.shelf, inAt: Date.now(), code: code4(), status: 'waiting' };
      S.parcels.push(p);
      S.queue = S.queue.filter((q) => q.tracking !== it.tracking);
      const e = { id: uid(), t: Date.now(), kind: 'parcel', text: it.carrier + ' parcel stored on shelf ' + p.shelf + ' for ' + it.name + ', ' + it.apt, who: CARETAKER.name, building: true };
      S.log.unshift(e);
      if (it.apt === ME.apt) {
        e.mine = true;
        S.unread.push('Your ' + it.carrier + ' parcel was stored on shelf ' + p.shelf + ' at ' + hm(p.inAt) + '. Pickup code ' + p.code + '.');
      }
      S.scan = { stage: 'stored', parcelId: p.id };
      done('store');
      render(true);
      push('Sent to ' + it.name, 'Parcel on shelf ' + p.shelf + ', code ' + p.code + '.', 'pink');
    },
    selShelf(el) { S.shelfSel = el.dataset.shelf; render(); },
    handover(el) {
      const p = S.parcels.find((x) => x.id === el.dataset.id);
      p.status = 'collected'; p.outAt = Date.now();
      S.log.unshift({ id: uid(), t: Date.now(), kind: 'parcel', text: p.carrier + ' parcel on shelf ' + p.shelf + ' handed to ' + p.name + ', ' + p.apt, who: CARETAKER.name, building: true, mine: p.apt === ME.apt });
      S.shelfSel = null;
      done('handover');
      render();
      push('Shelf ' + p.shelf + ' is free', p.name + ' collected the parcel.', 'pink');
    },
    remind(el) {
      const p = S.parcels.find((x) => x.id === el.dataset.id);
      S.log.unshift({ id: uid(), t: Date.now(), kind: 'parcel', text: 'Pickup reminder sent to ' + p.name + ', ' + p.apt, who: CARETAKER.name, building: true, mine: p.apt === ME.apt });
      if (p.apt === ME.apt) S.unread.push('Reminder: your ' + p.carrier + ' parcel is still on shelf ' + p.shelf + '.');
      render();
      push('Reminder sent', p.name + ' was reminded about shelf ' + p.shelf + '.', 'pink');
    }
  };

  function setRole(role, tab) {
    pushEl.hidden = true;
    S.role = role; S.sheet = false; S.filter = 'all';
    S.tab = tab || (role === 'resident' ? 'home' : 'overview');
    render(true);
  }

  /* ---------- events ---------- */
  app.addEventListener('click', (e) => {
    const t = e.target.closest('[data-role],[data-tab],[data-go],[data-act],[data-filter]');
    if (!t || t.tagName === 'INPUT') return;
    if (t.dataset.role) { setRole(t.dataset.role); return; }
    if (t.dataset.tab) { go(t.dataset.tab); return; }
    if (t.dataset.go) { go(t.dataset.go); return; }
    if (t.dataset.filter) { S.filter = t.dataset.filter; render(); return; }
    const fn = actions[t.dataset.act];
    if (fn) fn(t);
  });

  app.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.act && actions[t.dataset.act]) { actions[t.dataset.act](t); render(); const again = app.querySelector('input[name="' + t.name + '"][value="' + t.value + '"]'); if (again) again.focus(); }
    if (t.dataset.setting) { S.settings[t.dataset.setting] = t.checked; render(); const again = app.querySelector('[data-setting="' + t.dataset.setting + '"]'); if (again) again.focus(); }
  });

  app.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.id === 'pass-form') {
      const c = CONTACTS[+f.who.value];
      const from = new Date(f.from.value).getTime();
      const to = new Date(f.to.value).getTime();
      const err = f.querySelector('#pass-err');
      if (!from || !to) { err.textContent = 'Choose a start and an end time.'; return; }
      if (to <= from) { err.textContent = 'The end has to be after the start.'; return; }
      if (to < Date.now()) { err.textContent = 'This window is already over. Pick an end time in the future.'; return; }
      const p = { id: uid(), name: c.name, apt: c.apt, from, to, code: code6(), revoked: false };
      S.passes.push(p);
      S.lastPass = p.id;
      log('access', 'Access granted ' + when(from) + ' to ' + when(to), c.name);
      done('grant');
      render(true);
      push('Access created', c.name + ' can open Mailbox 4B in your window.', 'mint');
    }
    if (f.id === 'manual-form') {
      const q = (f.tracking.value || '').replace(/\s/g, '').toUpperCase();
      const item = S.queue.find((x) => x.tracking.toUpperCase() === q);
      if (!item) { f.querySelector('#manual-err').textContent = q ? 'No parcel at the door with that number.' : 'Type a tracking number.'; return; }
      S.queue = [item].concat(S.queue.filter((x) => x !== item));
      S.scan = { stage: 'matched', item: Object.assign({}, item) };
      done('scan');
      render(true);
    }
  });

  /* ---------- the demo panel: columns beside the phone, a drawer on a phone ---------- */
  panel.addEventListener('change', (e) => {
    if (e.target.name === 'demo-role') setRole(e.target.value);
  });
  panel.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act]');
    if (t && actions[t.dataset.act]) actions[t.dataset.act](t);
  });
  panel.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.id !== 'code-form') return;
    const code = (f.code.value || '').replace(/\D/g, '');
    const at = new Date(f.at.value).getTime() || Date.now();
    const out = f.querySelector('#code-result');
    const p = S.passes.find((x) => x.code === code);
    let ok = false, msg;
    if (!code) msg = 'Enter the 6-digit code first.';
    else if (!p) msg = 'Wrong code. The box stays locked.';
    else if (p.revoked) msg = 'This code was revoked. The box stays locked.';
    else if (at < p.from) msg = 'Too early. ' + p.name + "'s code works from " + when(p.from) + '.';
    else if (at > p.to) msg = 'Too late. ' + p.name + "'s code ended " + when(p.to) + '.';
    else ok = true;
    if (!ok) {
      if (p) log('access', 'Code refused at Mailbox 4B (' + (p.revoked ? 'revoked' : 'outside window') + ')', p.name);
      out.className = 'sim-result is-bad'; out.textContent = msg;
      if (p) render();
      return;
    }
    const n = S.mailbox.items;
    S.mailbox.items = 0; S.mailbox.lastEmptied = Date.now();
    log('access', 'Mailbox 4B opened with an access code' + (n ? ', ' + n + (n === 1 ? ' item' : ' items') + ' taken out' : ''), p.name);
    done('useCode');
    render();
    out.className = 'sim-result is-ok';
    out.textContent = 'Opened. ' + p.name + ' collected ' + (n ? n + (n === 1 ? ' item' : ' items') : 'nothing (the box was empty)') + '. The box reads “Empty” again.';
    push('Mailbox 4B opened', p.name + ' used their code' + (n ? ' and took ' + n + (n === 1 ? ' item.' : ' items.') : '.'), 'mint');
  });

  const narrow = window.matchMedia('(max-width: 900px)');
  const openBtn = document.getElementById('demo-open');
  const closeBtn = document.getElementById('demo-close');
  const scrim = document.getElementById('demo-scrim');
  const device = document.querySelector('.device');
  let scrimTimer;
  function openDrawer() {
    if (!narrow.matches) return;
    clearTimeout(scrimTimer);
    scrim.hidden = false; void scrim.offsetWidth;
    panel.classList.add('is-open'); scrim.classList.add('is-on');
    device.inert = true;
    openBtn.setAttribute('aria-expanded', 'true');
    closeBtn.focus({ preventScroll: true });
  }
  function closeDrawer() {
    if (!panel.classList.contains('is-open')) return;
    panel.classList.remove('is-open'); scrim.classList.remove('is-on');
    scrimTimer = setTimeout(() => { scrim.hidden = true; }, 320);
    device.inert = false;
    openBtn.setAttribute('aria-expanded', 'false');
    if (narrow.matches) openBtn.focus({ preventScroll: true });
  }
  function drawerSemantics() {
    if (narrow.matches) { panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); }
    else { closeDrawer(); panel.removeAttribute('role'); panel.removeAttribute('aria-modal'); }
  }
  openBtn.addEventListener('click', openDrawer);
  closeBtn.addEventListener('click', closeDrawer);
  scrim.addEventListener('click', closeDrawer);
  narrow.addEventListener('change', drawerSemantics);
  drawerSemantics();

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (panel.classList.contains('is-open')) closeDrawer();
    else if (S.sheet) actions.closeSheet();
  });

  document.getElementById('reset-demo').addEventListener('click', () => {
    const role = S.role;
    S = seed(); S.role = role; S.sheet = false; S.tab = role === 'caretaker' ? 'overview' : 'home';
    simKey = '';
    closeDrawer();
    render(true);
    push('Demo reset', 'All sample data is back to the start.', role === 'caretaker' ? 'pink' : 'mint');
  });

  render();
})();
