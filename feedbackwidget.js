// feedbackWidget.js – v1.7 (pins + sidebar list w/ resolve filter)
// ---------------------------------------------------------------------------
//  ✱ Adds a small “+” pin at every comment location. Clicking toggles note.
//  ✱ Sidebar (right edge) lists notes for current URL: snippet, resolve box.
//  ✱ Filter buttons: All • Open • Resolved.
//  ✱ Firestore schema: {url,selector,x,y,text,created,resolved:false}
// ---------------------------------------------------------------------------
(function(){
  const VERSION='1.7';
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
    collection:"website_feedback",
    label:`Markup v${VERSION}`
  };

  async function ensureFirestore(){
    const ensure=src=>new Promise(r=>{if([...document.scripts].some(s=>s.src.includes(src)))return r();const e=document.createElement('script');e.src=src;e.async=1;e.onload=r;document.head.appendChild(e);});
    await ensure('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
    await ensure('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js');
    if(!firebase.apps.length) firebase.initializeApp(cfg.firebaseConfig);
    return firebase.firestore();
  }

  const selOf=el=>{if(!(el instanceof Element))return'';const p=[];while(el&&el!==document.body){let s=el.nodeName.toLowerCase();if(el.id){s+='#'+el.id;p.unshift(s);break;}let sib=el,n=1;while((sib=sib.previousElementSibling)) if(sib.nodeName.toLowerCase()===s) n++;s+=`:nth-of-type(${n})`;p.unshift(s);el=el.parentElement;}return p.join(' > ');};

  function makeBtn(lbl){const b=document.createElement('button');b.id='__fw_btn';b.textContent=lbl;Object.assign(b.style,{position:'fixed',bottom:'16px',right:'16px',zIndex:10000,padding:'8px 12px',borderRadius:'4px',background:'#0070f3',color:'#fff',border:'none',cursor:'pointer',fontSize:'14px',boxShadow:'0 2px 8px rgba(0,0,0,.15)'});return b;}

  function makeSidebar(){
    const side=document.createElement('div');side.id='__fw_side';Object.assign(side.style,{position:'fixed',top:0,right:0,width:'320px',height:'100%',background:'#fff',borderLeft:'1px solid #ddd',boxShadow:'-2px 0 8px rgba(0,0,0,.1)',zIndex:10000,fontFamily:'sans-serif',display:'flex',flexDirection:'column'});
    side.innerHTML=`<div style="display:flex;gap:.5rem;padding:.5rem;border-bottom:1px solid #ddd;align-items:center;font-size:14px;font-weight:600">Feedback <span style="margin-left:auto;font-size:12px;opacity:.6">v${VERSION}</span></div>
      <div id="fw-filters" style="display:flex;gap:.25rem;padding:.5rem;border-bottom:1px solid #eee;font-size:12px">
         <button data-filter="all" style="flex:1">All</button>
         <button data-filter="open" style="flex:1">Open</button>
         <button data-filter="resolved" style="flex:1">Resolved</button>
      </div>
      <div id="fw-list" style="flex:1;overflow:auto;font-size:12px"></div>`;
    document.body.appendChild(side);
    return side;
  }

  function pinAt(x,y,id,resolved){
    const pin=document.createElement('div');pin.dataset.id=id;pin.title='Click to open note';pin.textContent='+';Object.assign(pin.style,{position:'absolute',top:`${y}px`,left:`${x}px`,transform:'translate(-50%,-50%)',background:resolved?'#4caf50':'#0070f3',color:'#fff',borderRadius:'50%',width:'18px',height:'18px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',cursor:'pointer',zIndex:9999});
    pin.onclick=()=>document.querySelector(`#fw-item-${id}`)?.scrollIntoView({behavior:'smooth',block:'center'});
    document.body.appendChild(pin);
  }

  (async()=>{
    const db=await ensureFirestore();
    const btn=makeBtn(cfg.label);document.body.appendChild(btn);
    const sidebar=makeSidebar();
    const listEl=sidebar.querySelector('#fw-list');

    let overlay=null,inMarkup=false,filter='all';
    const updateBtn=()=>btn.textContent=(inMarkup?`Navigate v${VERSION}`:`Markup v${VERSION}`);

    // filter buttons
    sidebar.querySelectorAll('#fw-filters button').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;render();});

    const notes=[]; // local cache

    // live listener
    db.collection(cfg.collection).where('url','==',location.href).orderBy('created','asc').onSnapshot(snap=>{
      notes.length=0;
      document.querySelectorAll('.__fw_pin').forEach(p=>p.remove());
      snap.forEach(doc=>notes.push({...doc.data(),id:doc.id}));
      notes.forEach(n=>pinAt(n.x,n.y,n.id,n.resolved));
      render();
    });

    function render(){
      listEl.innerHTML='';
      notes.filter(n=>filter==='all'||(filter==='open'&&!n.resolved)||(filter==='resolved'&&n.resolved)).forEach(n=>{
        const row=document.createElement('div');row.id=`fw-item-${n.id}`;row.style.borderBottom='1px solid #eee';row.style.padding='.5rem';row.style.display='flex';row.style.gap='.5rem';
        row.innerHTML=`<input type='checkbox' ${n.resolved?'checked':''} style='margin:2px'/> <div style='flex:1;cursor:pointer'>${n.text.slice(0,60)}</div>`;
        // navigate on click
        row.querySelector('div').onclick=()=>window.scrollTo({top:n.y-100,left:0,behavior:'smooth'});
        // toggle resolved
        row.querySelector('input').onchange=e=>db.collection(cfg.collection).doc(n.id).update({resolved:e.target.checked});
        listEl.appendChild(row);
      });
    }

    function enter(){inMarkup=true;updateBtn();overlay=document.createElement('div');Object.assign(overlay.style,{position:'fixed',inset:0,zIndex:9998,cursor:'crosshair',background:'rgba(0,0,0,.05)'});overlay.addEventListener('click',pick,{once:true});document.body.appendChild(overlay);}
    function exit(){inMarkup=false;overlay?.remove();overlay=null;updateBtn();}

    function pick(e){e.preventDefault();const{x,y}=e;exit();const target=document.elementFromPoint(x,y);const selector=selOf(target);
      const box=document.createElement('div');Object.assign(box.style,{position:'fixed',top:`${y+10}px`,left:`${x+10}px`,zIndex:10001,background:'#fff',border:'1px solid #ccc',padding:'8px',borderRadius:'4px',width:'240px',boxShadow:'0 2px 8px rgba(0,0,0,.15)'});
      box.innerHTML=`<textarea rows='3' style='width:100%;box-sizing:border-box'></textarea><div style='text-align:right;margin-top:4px'><button>Save</button></div>`;
      const ta=box.querySelector('textarea');box.querySelector('button').onclick=async()=>{const txt=ta.value.trim();if(!txt)return alert('Comment cannot be empty');await db.collection(cfg.collection).add({url:location.href,selector,x,y,text:txt,created:Date.now(),resolved:false});box.remove();};
      document.body.appendChild(box);
    }

    btn.onclick=()=>inMarkup?exit():enter();
    updateBtn();
  })();
})();
