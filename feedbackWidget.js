// feedbackWidget.js – v1.8 (snippet, domain sidebar)
// ---------------------------------------------------------------------------
//  ✱ Saves snippet, selector, full URL & domain to Firestore
//     schema: {url, domain, selector, x, y, text, snippet, created, resolved}
//  ✱ Right sidebar = notes for current URL (unchanged)
//  ✱ NEW left sidebar = all notes across this domain, grouped by page
//    click row → navigate to page; badge shows open/resolved counts
// ---------------------------------------------------------------------------
(function(){
  const VERSION='1.8';
  if(document.getElementById('__fw_btn')) return; // duplicate guard

  const cfg={
    firebaseConfig:{
      apiKey:"AIzaSyBtzYoN-ZCxclNcf4O4jB_ZIYocAmJsq8k",
      authDomain:"markup-d1dc8.firebaseapp.com",
      projectId:"markup-d1dc8",
      storageBucket:"markup-d1dc8.appspot.com",
      messagingSenderId:"720023666477",
      appId:"1:720023666477:web:8cf09bd8ad49bcaee75da4"
    },
    col:"website_feedback",
    label:`Markup v${VERSION}`
  };

  /* ------------------------------------------------------------------- */
  async function db(){
    const load=src=>new Promise(r=>{if([...document.scripts].some(s=>s.src.includes(src)))return r();const e=document.createElement('script');e.src=src;e.async=1;e.onload=r;document.head.appendChild(e);});
    await load('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
    await load('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js');
    if(!firebase.apps.length) firebase.initializeApp(cfg.firebaseConfig);
    return firebase.firestore();
  }

  const selOf=el=>{if(!(el instanceof Element))return'';const p=[];while(el&&el!==document.body){let s=el.nodeName.toLowerCase();if(el.id){s+='#'+el.id;p.unshift(s);break;}let sib=el,n=1;while((sib=sib.previousElementSibling)) if(sib.nodeName.toLowerCase()===s) n++;s+=`:nth-of-type(${n})`;p.unshift(s);el=el.parentElement;}return p.join(' > ');};

  /* ---------------- UI helpers --------------------------------------- */
  const css={btn:{position:'fixed',bottom:'16px',right:'16px',zIndex:10000,padding:'8px 12px',borderRadius:'4px',background:'#0070f3',color:'#fff',border:'none',cursor:'pointer',fontSize:'14px',boxShadow:'0 2px 8px rgba(0,0,0,.15)'}};
  const make=(tag,styles)=>Object.assign(document.createElement(tag),{style:Object.assign({},styles)});

  function makeBtn(lbl){const b=make('button',css.btn);b.id='__fw_btn';b.textContent=lbl;return b;}

  function sidebar(pos='right'){const side=make('div',{position:'fixed',top:0,[pos]:0,width:'300px',height:'100%',background:'#fff',border:`${pos==='right'?'Left':'Right'}:1px solid #ddd`,boxShadow:`${pos==='right'?'-':'2'}px 0 8px rgba(0,0,0,.1)`,zIndex:9999,fontFamily:'sans-serif',display:'flex',flexDirection:'column',overflow:'hidden'});
    document.body.appendChild(side);return side;}

  function pin(x,y,id,resolved){const p=make('div',{position:'absolute',top:`${y}px`,left:`${x}px`,transform:'translate(-50%,-50%)',background:resolved?'#4caf50':'#0070f3',color:'#fff',borderRadius:'50%',width:'18px',height:'18px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',cursor:'pointer',zIndex:9998});p.textContent='+';p.onclick=()=>document.querySelector(`#fw-item-${id}`)?.scrollIntoView({behavior:'smooth',block:'center'});document.body.appendChild(p);}  

  /* ---------------- Main init ---------------------------------------- */
  (async()=>{
    const firestore=await db();
    const domain=location.hostname;
    const btn=makeBtn(cfg.label);document.body.appendChild(btn);

    /* --- Right sidebar (page notes) --- */
    const right=sidebar('right');
    right.innerHTML=`<div style="padding:.5rem;border-bottom:1px solid #ddd;font-size:14px;font-weight:600;display:flex;gap:.5rem;align-items:center">Notes<br><span style="margin-left:auto;font-size:12px;opacity:.6">v${VERSION}</span></div>
      <div id="r-filt" style="display:flex;font-size:12px;border-bottom:1px solid #eee"><button data-f='all' style='flex:1'>All</button><button data-f='open' style='flex:1'>Open</button><button data-f='resolved' style='flex:1'>Resolved</button></div>
      <div id="r-list" style="flex:1;overflow:auto;font-size:12px"></div>`;
    const rList=right.querySelector('#r-list');let rFilter='all';right.querySelectorAll('button[data-f]').forEach(b=>b.onclick=()=>{rFilter=b.dataset.f;renderPage();});

    /* --- Left sidebar (domain pages) --- */
    const left=sidebar('left');
    left.innerHTML=`<div style="padding:.5rem;border-bottom:1px solid #ddd;font-size:14px;font-weight:600">Domain</div>
      <div id="d-list" style="flex:1;overflow:auto;font-size:12px"></div>`;
    const dList=left.querySelector('#d-list');

    /* --- Live listeners --- */
    const pageNotes=[], domainAgg={};

    firestore.collection(cfg.col).where('url','==',location.href).orderBy('created','asc').onSnapshot(s=>{pageNotes.length=0;document.querySelectorAll('.__fw_pin').forEach(el=>el.remove());s.forEach(doc=>{const n={...doc.data(),id:doc.id};pageNotes.push(n);pin(n.x,n.y,n.id,n.resolved);});renderPage();});

    firestore.collection(cfg.col).where('domain','==',domain).onSnapshot(s=>{
      Object.keys(domainAgg).forEach(k=>delete domainAgg[k]);
      s.forEach(doc=>{const d=doc.data();const url=d.url;domainAgg[url]=domainAgg[url]||{open:0,resolved:0};d.resolved?domainAgg[url].resolved++:domainAgg[url].open++;});
      renderDomain();
    });

    /* --- Render helpers --- */
    function row(html){const div=make('div',{borderBottom:'1px solid #eee',padding:'.5rem',display:'flex',gap:'.5rem',alignItems:'flex-start'});div.innerHTML=html;return div;}

    function renderPage(){rList.innerHTML='';pageNotes.filter(n=>rFilter==='all'||(rFilter==='open'&&!n.resolved)||(rFilter==='resolved'&&n.resolved)).forEach(n=>{
        const r=row(`<input type='checkbox' ${n.resolved?'checked':''} style='margin:2px'><div style='flex:1;cursor:pointer'>${n.snippet||n.text.slice(0,80)}</div>`);
        r.id=`fw-item-${n.id}`;
        r.querySelector('div').onclick=()=>window.scrollTo({top:n.y-100,behavior:'smooth'});
        r.querySelector('input').onchange=e=>firestore.collection(cfg.col).doc(n.id).update({resolved:e.target.checked});
        rList.appendChild(r);
    });}

    function renderDomain(){dList.innerHTML='';Object.entries(domainAgg).sort((a,b)=>b[1].open-a[1].open).forEach(([url,stat])=>{
        const total=stat.open+stat.resolved;const rowEl=row(`<div style='flex:1;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis' title='${url}'>${url.replace(/^https?:\/\//,'')}</div><span style='font-size:11px;color:#999'>${stat.open}/${total}</span>`);
        rowEl.onclick=()=>window.open(url,'_blank');dList.appendChild(rowEl);
    });}

    /* --- Markup flow --- */
    let overlay=null,inMarkup=false;const updateBtn=()=>btn.textContent=(inMarkup?`Navigate v${VERSION}`:`Markup v${VERSION}`);

    function enter(){inMarkup=true;updateBtn();overlay=make('div',{position:'fixed',inset:0,zIndex:9998,cursor:'crosshair',background:'rgba(0,0,0,.05)'});overlay.addEventListener('click',pick,{once:true});document.body.appendChild(overlay);}  
    function exit(){inMarkup=false;overlay?.remove();overlay=null;updateBtn();}

    function pick(e){e.preventDefault();const{x,y}=e;exit();const tgt=document.elementFromPoint(x,y);const selector=selOf(tgt);
      const snippet=(tgt.innerText||tgt.alt||tgt.value||'').trim().slice(0,120);
      const box=make('div',{position:'fixed',top:`${y+10}px`,left:`${x+10}px`,zIndex:10001,background:'#fff',border:'1px solid #ccc',padding:'8px',borderRadius:'4px',width:'240px',boxShadow:'0 2px 8px rgba(0,0,0,.15)'});
      box.innerHTML=`<textarea rows='3' style='width:100%;box-sizing:border-box'></textarea><div style='text-align:right;margin-top:4px'><button>Save</button></div>`;
      const ta=box.querySelector('textarea');ta.value=snippet?`${snippet} – `:'';
      box.querySelector('button').onclick=async()=>{
        const text=ta.value.trim();if(!text) return alert('Comment cannot be empty');
        await firestore.collection(cfg.col).add({url:location.href,domain,selector,x,y,text,snippet,created:Date.now(),resolved:false});box.remove();};
      document.body.appendChild(box);
    }

    btn.onclick=()=>inMarkup?exit():enter();updateBtn();
  })();
})();
