// feedbackWidget.js  – v1.11  (collapsible sidebars)
// ---------------------------------------------------------------------------
//  ✱ Left and right sidebars can now be collapsed/expanded with a single click
//    ▸  Small “❯” / “❮” grab‑handles stay visible, taking only 16 px width
//  ✱ Width reduced to 260 px when open to free screen real‑estate
//  ✱ All other v1.10 features intact (pins, filters, Firestore, etc.)
// ---------------------------------------------------------------------------
(() => {
  const VERSION = '1.11';
  if (document.getElementById('__fw_btn')) return; // already injected

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
  // Lazy‑load Firebase compat SDK
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
  // Mini helpers
  const $ = (t, s = {}) => Object.assign(document.createElement(t), { style: Object.assign({}, s) });
  const cssSel = el => { if(!(el instanceof Element)) return ''; const p=[]; while(el&&el!==document.body){let s=el.nodeName.toLowerCase(); if(el.id){p.unshift(s+'#'+el.id); break;} let sib=el,n=1; while((sib=sib.previousElementSibling)) if(sib.nodeName.toLowerCase()===s) n++; s+=`:nth-of-type(${n})`; p.unshift(s); el=el.parentElement;} return p.join(' > ')};

  /* --------------------------------------------------------------------- */
  // Collapsible sidebar factory
  const makeSidebar = (side) => {
    const openW = 260;
    const bar   = $('div');
    bar.style.cssText = `position:fixed;top:0;${side}:0;width:${openW}px;height:100%;`+
      `background:#fff;border-${side==='right'?'left':'right'}:1px solid #ddd;`+
      `box-shadow:${side==='right'?'-':'2'}px 0 8px rgba(0,0,0,.1);z-index:9999;`+
      `font-family:sans-serif;display:flex;flex-direction:column;overflow:hidden;`+
      `transition:transform .25s ease`; // for slide effect

    // collapsed state
    let collapsed = false;
    const handle = $('div', {
      position:'absolute',top:'50%',[side==='right'?'left':'right']:'-16px',
      width:'16px',height:'48px',display:'flex',alignItems:'center',justifyContent:'center',
      background:'#0070f3',color:'#fff',cursor:'pointer',borderRadius:side==='right'?'4px 0 0 4px':'0 4px 4px 0',
      fontSize:'12px',userSelect:'none',transform:'translateY(-50%)'
    });
    const updatePos = ()=>{
      bar.style.transform = collapsed ? `translateX(${side==='right'?openW:-openW}px)` : 'translateX(0)';
      handle.textContent  = collapsed ? (side==='right'?'◀':'▶') : (side==='right'?'▶':'◀');
    };
    handle.onclick = ()=>{ collapsed = !collapsed; updatePos(); };
    bar.appendChild(handle);
    updatePos();
    document.body.appendChild(bar);
    return bar;
  };

  const rightBar = makeSidebar('right');
  const leftBar  = makeSidebar('left');

  rightBar.innerHTML += `<div style="padding:.5rem 1rem;border-bottom:1px solid #ddd;font-size:14px;font-weight:600;display:flex;gap:.4rem;align-items:center">`+
    `Notes <span style="margin-left:auto;font-size:12px;opacity:.6">v${VERSION}</span></div>`+
    `<div id="fw-filter" style="display:flex;font-size:12px;border-bottom:1px solid #eee">`+
      `<button data-f="all" style="flex:1">All</button>`+
      `<button data-f="open" style="flex:1">Open</button>`+
      `<button data-f="resolved" style="flex:1">Resolved</button>`+
    `</div>`+
    `<div id="fw-page-list" style="flex:1;overflow:auto;font-size:12px"></div>`;

  leftBar.innerHTML += `<div style="padding:.5rem 1rem;border-bottom:1px solid #ddd;font-size:14px;font-weight:600">Domain</div>`+
    `<div id="fw-domain-list" style="flex:1;overflow:auto;font-size:12px"></div>`;

  const pageList   = rightBar.querySelector('#fw-page-list');
  const domainList = leftBar.querySelector('#fw-domain-list');

  /* --------------------------------------------------------------------- */
  // Floating toggle button
  const btnStyle = {
    position:'fixed',bottom:'16px',right:'16px',zIndex:10000,padding:'8px 12px',borderRadius:'4px',background:'#0070f3',color:'#fff',border:'none',cursor:'pointer',fontSize:'14px',boxShadow:'0 2px 8px rgba(0,0,0,.15)'};
  const toggle = $('button', btnStyle);
  toggle.id='__fw_btn';
  document.body.appendChild(toggle);

  let inMarkup=false,pageFilter='all';
  const setBtn=()=>toggle.textContent=inMarkup?`Navigate v${VERSION}`:`Markup v${VERSION}`;
  setBtn();

  rightBar.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{pageFilter=b.dataset.f;renderPage();});

  /* --------------------------------------------------------------------- */
  // Firestore live listeners
  (async()=>{
    let fs; try{fs=await getFirestore();}catch(e){console.error('FW firestore',e);return;}
    const pageNotes=[], domainStats={}, domain=location.hostname;

    fs.collection(CONFIG.collection).where('url','==',location.href).onSnapshot(s=>{
      pageNotes.length=0;document.querySelectorAll('.__fw_pin').forEach(p=>p.remove());
      s.forEach(d=>pageNotes.push({id:d.id,...d.data()}));
      pageNotes.sort((a,b)=>a.created-b.created);
      pageNotes.forEach(n=>addPin(n));
      renderPage();
    });

    fs.collection(CONFIG.collection).where('domain','==',domain).onSnapshot(s=>{
      Object.keys(domainStats).forEach(k=>delete domainStats[k]);
      s.forEach(d=>{const n=d.data();const u=n.url;(domainStats[u]=domainStats[u]||{o:0,r:0})[n.resolved?'r':'o']++;});
      renderDomain();
    });

    /* ---- helpers */
    const row=html=>{const d=$('div',{borderBottom:'1px solid #eee',padding:'.5rem',display:'flex',gap:'.5rem',alignItems:'flex-start'});d.innerHTML=html;return d;};

    function renderPage(){pageList.innerHTML='';pageNotes.filter(n=>pageFilter==='all'||(pageFilter==='open'&&!n.resolved)||(pageFilter==='resolved'&&n.resolved)).forEach(n=>{
        const r=row(`<input type='checkbox' ${n.resolved?'checked':''}><div style='flex:1;cursor:pointer'>${n.snippet||n.text.slice(0,80)}</div>`);
        r.id=`fw-${n.id}`;
        r.querySelector('div').onclick=()=>window.scrollTo({top:n.y-100,behavior:'smooth'});
        r.querySelector('input').onchange=e=>fs.collection(CONFIG.collection).doc(n.id).update({resolved:e.target.checked});
        pageList.appendChild(r);
    });}

    function renderDomain(){domainList.innerHTML='';Object.entries(domainStats).sort((a,b)=>b[1].o-a[1].o).forEach(([u,s])=>{
      const r=row(`<div style='flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer' title='${u}'>${u.replace(/^https?:\/\//,'')}</div><span style='font-size:11px;color:#777'>${s.o}/${s.o+s.r}</span>`);
      r.onclick=()=>window.open(u,'_blank');domainList.appendChild(r);
    });}

  })();

  /* --------------------------------------------------------------------- */
  // pins & markup flow
  const pin=(n)=>{const p=$('div',{position:'absolute',top:`${n.y}px`,left:`${n.x}px`,transform:'translate(-50%,-50%)',background:n.resolved?'#4caf50':'#0070f3',color:'#fff',borderRadius:'50%',width:'18px',height:'18px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',cursor:'pointer',zIndex:9998});p.textContent='+';p.className='__fw_pin';p.onclick=()=>document.getElementById(`fw-${n.id}`)?.scrollIntoView({behavior:'smooth'});document.body.appendChild(p);};

  let ov=null;
  const enter=()=>{inMarkup=true;setBtn();ov=$('div',{position:'fixed',inset:0,background:'rgba(0,0,0,.05)',zIndex:9998,cursor:'crosshair'});ov.addEventListener('click',pick,{once:true});document.body.appendChild(ov);};
  const exit=()=>{inMarkup=false;setBtn();ov?.remove();ov=null;};

  function pick(e){e.preventDefault();const{x,y}=e;exit();const tgt=document.elementFromPoint(x,y);const sel=cssSel(tgt);const snip=(tgt.innerText||tgt.alt||tgt.value||'').trim().slice(0,120);
    const box=$('div',{position:'fixed',top:`${y+10}px`,left:`${x+10}px`,background:'#fff',border:'1px solid #ccc',borderRadius:'4px',padding:'8px',width:'240px',zIndex:10001,boxShadow:'0 2px 8px rgba(0,0,0,.15)'});
    box.innerHTML="<textarea rows='3' style='width:100%;box-sizing:border-box'></textarea><div style='text-align:right;margin-top:4px'><button>Save</button></div>";
    const ta=box.querySelector('textarea');ta.value=snip?snip+' – ':'';
    box.querySelector('button').onclick=async()=>{const txt=ta.value.trim();if(!txt)return alert('Comment cannot be empty');try{const fs=await getFirestore();await fs.collection(CONFIG.collection).add({url:location.href,domain:location.hostname,selector:sel,x,y,text:txt,snippet:snip,created:Date.now(),resolved:false});box.remove();}catch(err){console.error('FW save',err);alert('Could not save note');}};
    document.body.appendChild(box);
  }

  const addPin=pin; // alias for listener scope
  toggle.onclick=()=>inMarkup?exit():enter();
})();
