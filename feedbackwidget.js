// feedbackWidget.js – v1.6 (bookmarklet‑ready, version badge)
// ---------------------------------------------------------------------------
//  ✱ Annotate *any* webpage – even sites you don’t own – via bookmarklet.
//  ✱ Duplicate‑injection guard (id="__fw_btn").
//  ✱ Shows version number (v1.6) on the floating toggle button.
// ---------------------------------------------------------------------------
(function(){
  const VERSION = '1.6';
  if(document.getElementById('__fw_btn')) return; // already injected

  // -----------------------------------------------------------------------
  // Firebase config (public keys) -----------------------------------------
  // -----------------------------------------------------------------------
  const defaultConfig={
    firebaseConfig:{
      apiKey:"AIzaSyBtzYoN-ZCxclNcf4O4jB_ZIYocAmJsq8k",
      authDomain:"markup-d1dc8.firebaseapp.com",
      projectId:"markup-d1dc8",
      storageBucket:"markup-d1dc8.appspot.com",
      messagingSenderId:"720023666477",
      appId:"1:720023666477:web:8cf09bd8ad49bcaee75da4",
      measurementId:"G-9ZTDJEPTJ9"
    },
    collection:"website_feedback",
    buttonLabel:`Markup v${VERSION}`
  };

  const state={...defaultConfig};

  // -----------------------------------------------------------------------
  // Firestore helper -------------------------------------------------------
  // -----------------------------------------------------------------------
  async function getFirestore(){
    if(window.firebase && firebase.apps && firebase.apps.length){
      return firebase.firestore();
    }
    const ensure=src=>new Promise(res=>{if([...document.scripts].some(s=>s.src.includes(src)))return res();const el=document.createElement('script');el.src=src;el.async=true;el.onload=res;document.head.appendChild(el);});
    await ensure('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
    await ensure('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js');
    if(!firebase.apps.length) firebase.initializeApp(state.firebaseConfig);
    return firebase.firestore();
  }

  // Stable selector --------------------------------------------------------
  const selectorOf=el=>{if(!(el instanceof Element))return'';const p=[];while(el&&el.nodeType===1&&el!==document.body){let s=el.nodeName.toLowerCase();if(el.id){s+='#'+el.id;p.unshift(s);break;}let sib=el,n=1;while((sib=sib.previousElementSibling)) if(sib.nodeName.toLowerCase()===s) n++;s+=`:nth-of-type(${n})`;p.unshift(s);el=el.parentNode;}return p.join(' > ');};

  // UI helpers -------------------------------------------------------------
  function makeButton(lbl){const b=document.createElement('button');b.id='__fw_btn';b.textContent=lbl;Object.assign(b.style,{position:'fixed',bottom:'16px',right:'16px',zIndex:10000,padding:'8px 12px',borderRadius:'4px',background:'#0070f3',color:'#fff',border:'none',cursor:'pointer',fontSize:'14px',boxShadow:'0 2px 8px rgba(0,0,0,.15)'});return b;}

  function commentBox(x,y,onSave){const w=document.createElement('div');Object.assign(w.style,{position:'fixed',top:`${y+10}px`,left:`${x+10}px`,zIndex:10001,background:'#fff',border:'1px solid #ccc',padding:'8px',borderRadius:'4px',width:'240px',boxShadow:'0 2px 8px rgba(0,0,0,.15)'});w.innerHTML=`<textarea rows="3" style="width:100%;box-sizing:border-box"></textarea><div style="text-align:right;margin-top:4px"><button style="padding:4px 10px;border:none;background:#0070f3;color:#fff;border-radius:3px;cursor:pointer">Save</button></div>`;const ta=w.querySelector('textarea');w.querySelector('button').onclick=()=>{const txt=ta.value.trim();if(!txt)return alert('Comment can’t be empty');onSave(txt).then(()=>w.remove());};document.body.appendChild(w);} 

  // -----------------------------------------------------------------------
  // Main -------------------------------------------------------------------
  // -----------------------------------------------------------------------
  (async()=>{
    const db=await getFirestore();
    const btn=makeButton(state.buttonLabel);
    document.body.appendChild(btn);

    let overlay=null,inMarkup=false;
    const update=()=>{btn.textContent=(inMarkup?`Navigate v${VERSION}`:`Markup v${VERSION}`);};

    function enter(){inMarkup=true;update();overlay=document.createElement('div');Object.assign(overlay.style,{position:'fixed',inset:0,zIndex:9999,cursor:'crosshair',background:'rgba(0,0,0,.05)'});overlay.addEventListener('click',pick,{once:true});document.body.appendChild(overlay);}  
    function exit(){inMarkup=false;overlay?.remove();overlay=null;update();}

    async function pick(e){e.preventDefault();const{x,y}=e;exit();const target=document.elementFromPoint(x,y);const sel=selectorOf(target);commentBox(x,y,async txt=>{await db.collection(state.collection).add({url:location.href,selector:sel,x,y,text:txt,created:Date.now()});alert('Feedback sent – thank you!');});}

    btn.onclick=()=>inMarkup?exit():enter();
    update();
  })();
})();
