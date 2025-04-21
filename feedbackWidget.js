// feedbackWidget.js – v1.9 (fix Firestore index error, graceful fallback)
// ---------------------------------------------------------------------------
//  ✱ Removes offending orderBy() to avoid composite‑index requirement.
//  ✱ Sorts snapshots client‑side so no extra indexes are needed.
//  ✱ Adds try/catch so button & sidebars stay alive even if Firestore fails.
// ---------------------------------------------------------------------------
(function(){
  const VERSION='1.9';
  if(document.getElementById('__fw_btn')) return;

  const cfg={firebaseConfig:{apiKey:"AIzaSyBtzYoN-ZCxclNcf4O4jB_ZIYocAmJsq8k",authDomain:"markup-d1dc8.firebaseapp.com",projectId:"markup-d1dc8",storageBucket:"markup-d1dc8.appspot.com",messagingSenderId:"720023666477",appId:"1:720023666477:web:8cf09bd8ad49bcaee75da4"},col:'website_feedback',label:`Markup v${VERSION}`};

  async function db(){const imp=src=>new Promise(r=>{if([...document.scripts].some(s=>s.src.includes(src)))return r();const e=document.createElement('script');e.src=src;e.async=1;e.onload=r;document.head.appendChild(e);});await imp('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');await imp('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js');if(!firebase.apps.length) firebase.initializeApp(cfg.firebaseConfig);return firebase.firestore();}

  const selOf=el=>{if(!(el instanceof Element))return'';const p=[];while(el&&el!==document.body){let s=el.nodeName.toLowerCase();if(el.id){s+='#'+el.id;p.unshift(s);break;}let sib=el,n=1;while((sib=sib.previousElementSibling)) if(sib.nodeName.toLowerCase()===s) n++;s+=`:nth-of-type(${n})`;p.unshift(s);el=el.parentElement;}return p.join(' > ');};

  const cssBtn={position:'fixed',bottom:'16px',right:'16px',zIndex:10000,padding:'8px 12px',borderRadius:'4px',background:'#0070f3',color:'#fff',border:'none',cursor:'pointer',fontSize:'14px',boxShadow:'0 2px 8px rgba(0,0,0,.15)'};
  const mk=(t,s)=>Object.assign(document.createElement(t),{style:Object.assign({},s)});
  const btn=mk('button',cssBtn);btn.id='__fw_btn';btn.textContent=cfg.label;document.body.appendChild(btn);

  /* sidebars */
  const sb=(pos)=>{const d=mk('div',{position:'fixed',top:0,[pos]:0,width:'300px',height:'100%',background:'#fff',border:`${pos==='right'?'Left':'Right'}:1px solid #ddd`,boxShadow:`${pos==='right'?'-':'2'}px 0 8px rgba(0,0,0,.1)`,zIndex:9999,fontFamily:'sans-serif',display:'flex',flexDirection:'column',overflow:'hidden'});document.body.appendChild(d);return d;};
  const right=sb('right'),left=sb('left');
  right.innerHTML=`<div style='padding:.5rem;border-bottom:1px solid #ddd;font-size:14px;font-weight:600;display:flex'>Notes <span style='margin-left:auto;font-size:12px;opacity:.6'>v${VERSION}</span></div><div id='filt' style='display:flex;font-size:12px;border-bottom:1px solid #eee'><button data-f='all' style='flex:1'>All</button><button data-f='open' style='flex:1'>Open</button><button data-f='resolved' style='flex:1'>Resolved</button></div><div id='plist' style='flex:1;overflow:auto;font-size:12px'></div>`;
  left.innerHTML=`<div style='padding:.5rem;border-bottom:1px solid #ddd;font-size:14px;font-weight:600'>Domain</div><div id='dlist' style='flex:1;overflow:auto;font-size:12px'></div>`;
  const pList=right.querySelector('#plist'),dList=left.querySelector('#dlist');
  let pFilter='all';right.querySelectorAll('button[data-f]').forEach(b=>b.onclick=()=>{pFilter=b.dataset.f;renderPage();});

  let overlay=null,inMarkup=false;const upd=()=>btn.textContent=(inMarkup?`Navigate v${VERSION}`:cfg.label);

  function pin(x,y,id,res){const p=mk('div',{position:'absolute',top:`${y}px`,left:`${x}px`,transform:'translate(-50%,-50%)',background:res?'#4caf50':'#0070f3',color:'#fff',borderRadius:'50%',width:'18px',height:'18px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',cursor:'pointer',zIndex:9998'});p.textContent='+';p.onclick=()=>document.getElementById(`item-${id}`)?.scrollIntoView({behavior:'smooth',block:'center'});document.body.appendChild(p);}

  (async()=>{
    let firestore;try{firestore=await db();}catch(e){console.error('Firestore init failed',e);return;}
    const domain=location.hostname;
    const pageNotes=[],domainAgg={};

    /* page listener without orderBy to avoid composite index */
    firestore.collection(cfg.col).where('url','==',location.href).onSnapshot(s=>{
      pageNotes.length=0;document.querySelectorAll('.__fw_pin').forEach(el=>el.remove());
      s.forEach(doc=>pageNotes.push({...doc.data(),id:doc.id}));
      pageNotes.sort((a,b)=>a.created-b.created); // client sort
      pageNotes.forEach(n=>pin(n.x,n.y,n.id,n.resolved));
      renderPage();
    },err=>console.error('page listener error',err));

    /* domain aggregation */
    firestore.collection(cfg.col).where('domain','==',domain).onSnapshot(s=>{
      Object.keys(domainAgg).forEach(k=>delete domainAgg[k]);
      s.forEach(doc=>{const d=doc.data();const u=d.url;(domainAgg[u]=domainAgg[u]||{open:0,res:0})[d.resolved?'res':'open']++;});
      renderDomain();
    });

    function makeRow(html){const r=mk('div',{borderBottom:'1px solid #eee',padding:'.5rem',display:'flex',gap:'.5rem',alignItems:'flex-start'});r.innerHTML=html;return r;}

    function renderPage(){pList.innerHTML='';pageNotes.filter(n=>pFilter==='all'||(pFilter==='open'&&!n.resolved)||(pFilter==='resolved'&&n.resolved)).forEach(n=>{const row=makeRow(`<input type='checkbox' ${n.resolved?'checked':''}><div style='flex:1;cursor:pointer'>${n.snippet||n.text.slice(0,80)}</div>`);row.id=`item-${n.id}`;row.querySelector('div').onclick=()=>window.scrollTo({top:n.y-100,behavior:'smooth'});row.querySelector('input').onchange=e=>firestore.collection(cfg.col).doc(n.id).update({resolved:e.target.checked});pList.appendChild(row);});}

    function renderDomain(){dList.innerHTML='';Object.entries(domainAgg).sort((a,b)=>b[1].open-a[1].open).forEach(([url,s])=>{const tot=s.open+s.res;const r=makeRow(`<div style='flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer' title='${url}'>${url.replace(/^https?:\/\//,'')}</div><span style='font-size:11px;color:#999'>${s.open}/${tot}</span>`);r.onclick=()=>window.open(url,'_blank');dList.appendChild(r);});}

    function enter(){inMarkup=true;upd();overlay=mk('div',{position:'fixed',inset:0,zIndex:9998,cursor:'crosshair',background:'rgba(0,0,0,.05)'});overlay.addEventListener('click',pick,{once:true});document.body.appendChild(overlay);}function exit(){inMarkup=false;overlay?.remove();overlay=null;upd();}
    function pick(e){e.preventDefault();const{x,y}=e;exit();const tgt=document.elementFromPoint(x,y);const sel=selOf(tgt);const snip=(tgt.innerText||tgt.alt||tgt.value||'').trim().slice(0,120);const box=mk('div',{position:'fixed',top:`${y+10}px`,left:`${x+10}px`,zIndex:10001,background:'#fff',border:'1px solid #ccc',padding:'8px',borderRadius:'4px',width:'240px',boxShadow:'0 2px 8px rgba(0,0,0,.15)'});box.innerHTML=`<textarea rows='3' style='width:100%;box-sizing:border-box'></textarea><div style='text-align:right;margin-top:4px'><button>Save</button></div>`;const ta=box.querySelector('textarea');ta.value=snip?`${snip} – `:'';box.querySelector('button').onclick=async()=>{const txt=ta.value.trim();if(!txt)return alert('Comment cannot be empty');await firestore.collection(cfg.col).add({url:location.href,domain,selector:sel,x,y,text:txt,snippet:snip,created:Date.now(),resolved:false});box.remove();};document.body.appendChild(box);}btn.onclick=()=>inMarkup?exit():enter();upd();
  })();
})();
