// feedbackWidget.js  – v1.10  (stable build)
// ---------------------------------------------------------------------------
//  ✅  No Firestore composite indexes required (client‑side sort)
//  ✅  Graceful error handling (UI still loads if Firestore is offline)
//  ✅  Pins + dual sidebars (domain / page) & Resolve checkbox + filters
//  ✅  Snippet, selector, url & domain saved per note
// ---------------------------------------------------------------------------
(() => {
  const VERSION = '1.10';
  if (document.getElementById('__fw_btn')) return; // already injected

  /* --------------------------------------------------------------------- */
  const CONFIG = {
    firebaseConfig: {
      apiKey: 'AIzaSyBtzYoN-ZCxclNcf4O4jB_ZIYocAmJsq8k',
      authDomain: 'markup-d1dc8.firebaseapp.com',
      projectId: 'markup-d1dc8',
      storageBucket: 'markup-d1dc8.appspot.com',
      messagingSenderId: '720023666477',
      appId: '1:720023666477:web:8cf09bd8ad49bcaee75da4'
    },
    collection: 'website_feedback',
    label: `Markup v${VERSION}`
  };

  /* --------------------------------------------------------------------- */
  // Lazy‑load Firebase compat SDK (works on the free Spark plan)
  async function getFirestore() {
    const inject = src => new Promise(res => {
      if ([...document.scripts].some(s => s.src.includes(src))) return res();
      const el = document.createElement('script');
      el.src = src;
      el.async = true;
      el.onload = res;
      document.head.appendChild(el);
    });

    await inject('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
    await inject('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js');

    if (!firebase.apps.length) firebase.initializeApp(CONFIG.firebaseConfig);
    return firebase.firestore();
  }

  /* --------------------------------------------------------------------- */
  // Helpers
  const $ = (tag, styles = {}) => Object.assign(document.createElement(tag), {
    style: Object.assign({}, styles)
  });

  const BTN_STYLE = {
    position: 'fixed', bottom: '16px', right: '16px', zIndex: 10000,
    padding: '8px 12px', borderRadius: '4px', background: '#0070f3',
    color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px',
    boxShadow: '0 2px 8px rgba(0,0,0,.15)'
  };

  const cssSelector = el => {
    if (!(el instanceof Element)) return '';
    const parts = [];
    while (el && el !== document.body) {
      let sel = el.nodeName.toLowerCase();
      if (el.id) { parts.unshift(sel + '#' + el.id); break; }
      let sib = el, nth = 1;
      while ((sib = sib.previousElementSibling)) if (sib.nodeName.toLowerCase() === sel) nth++;
      sel += `:nth-of-type(${nth})`;
      parts.unshift(sel);
      el = el.parentElement;
    }
    return parts.join(' > ');
  };

  /* --------------------------------------------------------------------- */
  // UI containers
  const makeSidebar = (side) => {
    const div = $('div');
    div.style.cssText = `position:fixed;top:0;${side}:0;width:300px;height:100%;` +
      `background:#fff;border-${side === 'right' ? 'left' : 'right'}:1px solid #ddd;` +
      `box-shadow:${side === 'right' ? '-' : ''}2px 0 8px rgba(0,0,0,.1);` +
      `z-index:9999;font-family:sans-serif;display:flex;flex-direction:column;overflow:hidden`;
    document.body.appendChild(div);
    return div;
  };

  const rightBar = makeSidebar('right');
  const leftBar  = makeSidebar('left');

  rightBar.innerHTML = `<div style="padding:.5rem;border-bottom:1px solid #ddd;font-size:14px;font-weight:600;display:flex;gap:.3rem;align-items:center">` +
    `Notes <span style="margin-left:auto;font-size:12px;opacity:.6">v${VERSION}</span></div>` +
    `<div id="fw-filter" style="display:flex;font-size:12px;border-bottom:1px solid #eee">` +
      `<button data-f="all" style="flex:1">All</button>` +
      `<button data-f="open" style="flex:1">Open</button>` +
      `<button data-f="resolved" style="flex:1">Resolved</button>` +
    `</div>` +
    `<div id="fw-page-list" style="flex:1;overflow:auto;font-size:12px"></div>`;

  leftBar.innerHTML = `<div style="padding:.5rem;border-bottom:1px solid #ddd;font-size:14px;font-weight:600">Domain</div>` +
    `<div id="fw-domain-list" style="flex:1;overflow:auto;font-size:12px"></div>`;

  const pageList   = rightBar.querySelector('#fw-page-list');
  const domainList = leftBar.querySelector('#fw-domain-list');

  /* --------------------------------------------------------------------- */
  // Floating toggle button
  const toggleBtn = $('button', BTN_STYLE);
  toggleBtn.id = '__fw_btn';
  toggleBtn.textContent = CONFIG.label;
  document.body.appendChild(toggleBtn);

  /* --------------------------------------------------------------------- */
  // State
  let overlay = null;
  let inMarkup = false;
  let pageFilter = 'all';

  const updateButtonLabel = () => {
    toggleBtn.textContent = inMarkup ? `Navigate v${VERSION}` : CONFIG.label;
  };

  rightBar.querySelectorAll('[data-f]').forEach(btn => btn.onclick = () => {
    pageFilter = btn.dataset.f;
    renderPageNotes();
  });

  /* --------------------------------------------------------------------- */
  // Firestore listeners
  (async () => {
    let db;
    try {
      db = await getFirestore();
    } catch (err) {
      console.error('[FW] Firestore init failed', err);
      return; // bail but leave UI
    }

    const pageNotes   = [];
    const domainStats = {};
    const domainName  = location.hostname;

    // Page‑specific notes (no orderBy to avoid index) ---------------------
    db.collection(CONFIG.collection).where('url', '==', location.href)
      .onSnapshot(snap => {
        pageNotes.length = 0;
        document.querySelectorAll('.__fw_pin').forEach(p => p.remove());

        snap.forEach(doc => pageNotes.push({ id: doc.id, ...doc.data() }));
        pageNotes.sort((a, b) => a.created - b.created);

        pageNotes.forEach(n => addPin(n));
        renderPageNotes();
      }, err => console.error('[FW] page listener', err));

    // Domain‑wide aggregation -------------------------------------------
    db.collection(CONFIG.collection).where('domain', '==', domainName)
      .onSnapshot(snap => {
        Object.keys(domainStats).forEach(k => delete domainStats[k]);
        snap.forEach(doc => {
          const d = doc.data();
          const u = d.url;
          domainStats[u] = domainStats[u] || { open: 0, resolved: 0 };
          d.resolved ? domainStats[u].resolved++ : domainStats[u].open++;
        });
        renderDomainList();
      });

    /* ---------------- render helpers ---------------- */
    function row(inner) {
      const div = $('div', {
        borderBottom: '1px solid #eee', padding: '.5rem', display: 'flex',
        gap: '.5rem', alignItems: 'flex-start'
      });
      div.innerHTML = inner;
      return div;
    }

    function renderPageNotes() {
      pageList.innerHTML = '';
      pageNotes.filter(n => pageFilter === 'all' || (pageFilter === 'open' && !n.resolved) || (pageFilter === 'resolved' && n.resolved))
        .forEach(n => {
          const r = row(`<input type='checkbox' ${n.resolved ? 'checked' : ''}>` +
                         `<div style='flex:1;cursor:pointer'>${n.snippet || n.text.slice(0, 80)}</div>`);
          r.id = `fw-item-${n.id}`;
          r.querySelector('div').onclick = () => window.scrollTo({ top: n.y - 100, behavior: 'smooth' });
          r.querySelector('input').onchange = e => db.collection(CONFIG.collection).doc(n.id).update({ resolved: e.target.checked });
          pageList.appendChild(r);
        });
    }

    function renderDomainList() {
      domainList.innerHTML = '';
      Object.entries(domainStats).sort((a, b) => b[1].open - a[1].open)
        .forEach(([url, stat]) => {
          const total = stat.open + stat.resolved;
          const r = row(`<div style='flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer' title='${url}'>${url.replace(/^https?:\/\//, '')}</div>` +
                         `<span style='font-size:11px;color:#777'>${stat.open}/${total}</span>`);
          r.onclick = () => window.open(url, '_blank');
          domainList.appendChild(r);
        });
    }

    /* ---------------- pins ---------------- */
    function addPin(note) {
      const pin = $('div', {
        position: 'absolute', top: `${note.y}px`, left: `${note.x}px`, transform: 'translate(-50%,-50%)',
        background: note.resolved ? '#4caf50' : '#0070f3', color: '#fff', borderRadius: '50%', width: '18px', height: '18px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', cursor: 'pointer', zIndex: 9998
      });
      pin.className = '__fw_pin';
      pin.textContent = '+';
      pin.onclick = () => document.getElementById(`fw-item-${note.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.body.appendChild(pin);
    }

  })();

  /* --------------------------------------------------------------------- */
  // Markup / Navigate toggle
  function enterMarkupMode() {
    inMarkup = true;
    updateButtonLabel();
    overlay = $('div', {
      position: 'fixed', inset: 0, zIndex: 9998, cursor: 'crosshair', background: 'rgba(0,0,0,.05)'
    });
    overlay.addEventListener('click', handlePick, { once: true });
    document.body.appendChild(overlay);
  }

  function exitMarkupMode() {
    inMarkup = false;
    overlay?.remove();
    overlay = null;
    updateButtonLabel();
  }

  function handlePick(e) {
    e.preventDefault();
    const { clientX: x, clientY: y } = e;
    exitMarkupMode();

    const target   = document.elementFromPoint(x, y);
    const selector = cssSelector(target);
    const snippet  = (target.innerText || target.alt || target.value || '').trim().slice(0, 120);

    const box = $('div', {
      position: 'fixed', top: `${y + 10}px`, left: `${x + 10}px`, zIndex: 10001,
      background: '#fff', border: '1px solid #ccc', padding: '8px', borderRadius: '4px', width: '240px',
      boxShadow: '0 2px 8px rgba(0,0,0,.15)'
    });

    box.innerHTML = `<textarea rows='3' style='width:100%;box-sizing:border-box'></textarea>` +
      `<div style='text-align:right;margin-top:4px'><button>Save</button></div>`;
    const ta   = box.querySelector('textarea');
    const save = box.querySelector('button');
    ta.value   = snippet ? `${snippet} – ` : '';

    save.onclick = async () => {
      const text = ta.value.trim();
      if (!text) return alert('Comment cannot be empty');

      try {
        const fs = await getFirestore();
        await fs.collection(CONFIG.collection).add({
          url: location.href,
          domain: location.hostname,
          selector, x, y, text,
          snippet, created: Date.now(), resolved: false
        });
        box.remove();
      } catch (err) {
        console.error('[FW] failed to save', err);
        alert('Could not save note – see console');
      }
    };

    document.body.appendChild(box);
  }

  toggleBtn.onclick = () => inMarkup ? exitMarkupMode() : enterMarkupMode();
  updateButtonLabel();
})();
