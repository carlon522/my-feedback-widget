// feedbackWidget.js – v1.4  (URL picker + Navigate/Markup toggle)
// ---------------------------------------------------------------------------
//  ✱ Drop‑in, server‑less feedback widget.
//  ✱ NEW: Labelled toggle – “Markup” → lets you annotate; “Navigate” → browse.
//  ✱ (Optional) wrapper page can embed any same‑origin URL – see guide below.
// ---------------------------------------------------------------------------
(function () {
  //--------------------------------------------------------------------------
  // 🔧 Default Firebase config (YOUR project – safe to expose)
  //--------------------------------------------------------------------------
  const defaultConfig = {
    firebaseConfig: {
      apiKey: "AIzaSyBtzYoN-ZCxclNcf4O4jB_ZIYocAmJsq8k",
      authDomain: "markup-d1dc8.firebaseapp.com",
      projectId: "markup-d1dc8",
      storageBucket: "markup-d1dc8.appspot.com",
      messagingSenderId: "720023666477",
      appId: "1:720023666477:web:8cf09bd8ad49bcaee75da4",
      measurementId: "G-9ZTDJEPTJ9"
    },
    collection: "website_feedback",
    buttonLabel: "Markup"           // default label (navigation mode)
  };

  const stateDefaults = {
    firebaseConfig: null,
    firebaseApp: null,
    firestore: null,
    collection: "feedback",
    buttonLabel: "Markup"
  };

  //--------------------------------------------------------------------------
  function init(options = {}) {
    const settings = { ...stateDefaults, ...options };
    if (!settings.firebaseConfig && !settings.firebaseApp && !settings.firestore) {
      Object.assign(settings, defaultConfig);
    }
    if (!settings.firebaseConfig && !settings.firebaseApp && !settings.firestore) {
      console.error("[FeedbackWidget] Missing Firebase configuration!");
      return;
    }

    //-----------------------------------------------------------------------
    // Firestore – three ways ------------------------------------------------
    //-----------------------------------------------------------------------
    async function loadCompatFirestore() {
      function ensure(src) {
        return new Promise((res) => {
          if ([...document.scripts].some((s) => s.src.includes(src))) return res();
          const el = document.createElement("script");
          el.src = src;
          el.async = true;
          el.onload = res;
          document.head.appendChild(el);
        });
      }
      await ensure("https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js");
      await ensure("https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore-compat.js");
      if (!firebase.apps.length) firebase.initializeApp(settings.firebaseConfig);
      return firebase.firestore();
    }

    async function getFirestoreInstance() {
      if (settings.firestore) return settings.firestore;
      if (settings.firebaseApp) {
        const { getFirestore } = await import("https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js");
        return getFirestore(settings.firebaseApp);
      }
      return loadCompatFirestore();
    }

    //-----------------------------------------------------------------------
    // UI helpers ------------------------------------------------------------
    //-----------------------------------------------------------------------
    function createFloatingButton(label) {
      const b = document.createElement("button");
      b.textContent = label;
      Object.assign(b.style, {
        position: "fixed",
        bottom: "16px",
        right: "16px",
        zIndex: 10000,
        padding: "8px 12px",
        borderRadius: "4px",
        background: "#0070f3",
        color: "#fff",
        border: "none",
        cursor: "pointer",
        fontSize: "14px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
      });
      return b;
    }

    function cssSelector(el) {
      if (!(el instanceof Element)) return "";
      const parts = [];
      while (el && el.nodeType === 1 && el !== document.body) {
        let sel = el.nodeName.toLowerCase();
        if (el.id) {
          sel += "#" + el.id;
          parts.unshift(sel);
          break;
        }
        let sib = el, nth = 1;
        while ((sib = sib.previousElementSibling)) {
          if (sib.nodeName.toLowerCase() === sel) nth++;
        }
        sel += `:nth-of-type(${nth})`;
        parts.unshift(sel);
        el = el.parentNode;
      }
      return parts.join(" > ");
    }

    //-----------------------------------------------------------------------
    // Boot ------------------------------------------------------------------
    //-----------------------------------------------------------------------
    (async () => {
      const db = await getFirestoreInstance();
      const btn = createFloatingButton(settings.buttonLabel);
      document.body.appendChild(btn);

      let overlay = null;
      let inMarkup = false;

      function updateLabel() {
        btn.textContent = inMarkup ? "Navigate" : "Markup";
      }

      function exitMarkup() {
        inMarkup = false;
        overlay?.remove();
        overlay = null;
        updateLabel();
      }

      function enterMarkup() {
        inMarkup = true;
        updateLabel();
        overlay = document.createElement("div");
        Object.assign(overlay.style, {
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          cursor: "crosshair",
          background: "rgba(0,0,0,0.05)"
        });
        overlay.addEventListener("click", pickTarget, { once: true });
        document.body.appendChild(overlay);
      }

      function pickTarget(ev) {
        ev.preventDefault();
        const x = ev.clientX, y = ev.clientY;
        exitMarkup();
        const target = document.elementFromPoint(x, y);
        openCommentBox(x, y, cssSelector(target));
      }

      function openCommentBox(x, y, selector) {
        const box = document.createElement("div");
        Object.assign(box.style, {
          position: "fixed",
          top: `${y + 10}px`,
          left: `${x + 10}px`,
          zIndex: 10001,
          background: "#fff",
          border: "1px solid #ccc",
          padding: "8px",
          borderRadius: "4px",
          width: "240px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
        });
        box.innerHTML = `
          <textarea rows="3" style="width:100%;box-sizing:border-box"></textarea>
          <div style="text-align:right;margin-top:4px">
            <button style="padding:4px 10px;border:none;background:#0070f3;color:#fff;border-radius:3px;cursor:pointer">Save</button>
          </div>`;
        const ta = box.querySelector("textarea");
        const save = box.querySelector("button");
        save.addEventListener("click", async () => {
          const text = ta.value.trim();
          if (!text) {
            alert("Comment can’t be empty");
            return;
          }
          try {
            await db.collection(settings.collection).add({
              url: location.href,
              selector,
              x, y,
              text,
              created: Date.now()
            });
            alert("Feedback sent — thanks!");
            box.remove();
          } catch (e) {
            console.error("[FeedbackWidget] Firestore write failed", e);
            alert("Firestore write failed – see console.");
          }
        });
        document.body.appendChild(box);
      }

      // Public helpers (optional) -----------------------------------------
      window.FeedbackWidget = {
        init,
        enterMarkup,
        exitMarkup,
        isMarkup: () => inMarkup
      };

      btn.addEventListener("click", () => (inMarkup ? exitMarkup() : enterMarkup()));
    })();
  }

  // Auto‑init ---------------------------------------------------------------
  window.FeedbackWidget = { init };  // will be replaced above in boot
  window.addEventListener("DOMContentLoaded", () => init(defaultConfig));
})();
