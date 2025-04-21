<!DOCTYPE html>
<!-- index.html – landing/demo page for my‑feedback‑widget v1.7 -->
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Markup Widget v1.7 Demo</title>

  <style>
    *{box-sizing:border-box}body,html{margin:0;height:100%;font-family:system-ui,Arial,sans-serif}
    #topbar{display:flex;gap:.5rem;padding:.5rem;background:#f7f7f7;border-bottom:1px solid #e0e0e0;align-items:center}
    #url{flex:1;padding:.35rem .5rem;border:1px solid #ccc;border-radius:4px;font-size:14px}
    #load{padding:.35rem .75rem;border:none;background:#0070f3;color:#fff;border-radius:4px;font-size:14px;cursor:pointer}
    #frame{border:none;width:100%;height:calc(100% - 52px)}
    .visually-hidden{position:absolute!important;clip:rect(1px,1px,1px,1px);clip-path:inset(50%);height:1px;width:1px;overflow:hidden}
  </style>
</head>
<body>

  <!-- simple header + bookmarklet link -->
  <div id="topbar">
    <span style="font-weight:600">Markup Widget v1.7</span>
    <a href="javascript:(()=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/gh/carlon522/my-feedback-widget/feedbackWidget.js?'+Date.now();document.head.appendChild(s);})();"
       style="text-decoration:none;padding:.35rem .75rem;border:1px solid #0070f3;border-radius:4px;font-size:13px;color:#0070f3;background:#fff">
       ⇢ Drag me to Bookmarks (bar)
    </a>
    <label for="url" class="visually-hidden">Page URL</label>
    <input id="url" type="url" placeholder="https://example.com/your‑page">
    <button id="load">Load</button>
  </div>

  <iframe id="frame" title="Preview frame"></iframe>

  <!-- load the widget for the landing page itself -->
  <script src="feedbackWidget.js"></script>

  <script>
    /* inject widget into same‑origin pages loaded in the iframe */
    const urlIn  = document.getElementById('url');
    const frame  = document.getElementById('frame');
    document.getElementById('load').onclick = () => {
      if (!urlIn.value) { alert('Enter a URL first'); return; }
      frame.src = urlIn.value;
    };
    frame.onload = () => {
      try {
        const doc = frame.contentDocument;
        if (doc && !doc.querySelector('#__fw_btn')) {
          const s = doc.createElement('script');
          s.src = 'feedbackWidget.js?'+Date.now();  // bust cache
          doc.head.appendChild(s);
        }
      } catch(e){
        console.warn('Cross‑origin – cannot inject widget inside this page');
      }
    };
  </script>
</body>
</html>
