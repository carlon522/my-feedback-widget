// feedbackWidget.js – v1.5 (bookmarklet‑ready, duplicate‑proof)
// ---------------------------------------------------------------------------
//  ✱ Annotate *any* webpage – even sites you don’t own – by injecting this
//    script via a bookmarklet, <script> tag, or browser extension.
//  ✱ Built for Firebase (Spark plan) – writes to your collection, no auth.
//  ✱ Duplicate‑injection guard so multiple clicks don’t spawn extra buttons.
// ---------------------------------------------------------------------------
(function(){
  // Exit early if we’re already running on the page ------------------------
  if(document.getElementById('__fw_btn')) return;

  // -----------------------------------------------------------------------
  // 🔧 Your Firebase project (safe public keys) ----------------------------
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
    buttonLabel:"Markup"
  };

  const state={...defaultConfig};

  // -----------------------------------------------------------------------
  // Firestore helper – supports compat or modular SDK ----------------------
  // -----------------------------------------------------------------------
  async function getFirestore(){
    // If compat already loaded & initialised --------------------------------
    if(window.firebase && firebase.apps && firebase.apps.length){
      return firebase.firestore();
    }
    // Load compat SDKs on demand -------------------------------------------
    async function ensure(src){
      return new Promise(res=>{
        if([...document.scripts].some(s=>s.src.includes(src))) return res();
        const el=document.createElement('script');
        el.src=src;
        el.async=true;
        el.onload=res;
        document.head.appendChild(el);
      });
    }
    await ensure('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
    await ensure('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js');
    if(!firebase.apps.length) firebase.initializeApp(state.firebaseConfig);
    return firebase.firestore();
  }

  // -----------------------------------------------------------------------
  // Tiny util: stable CSS selector for an element --------------------------
  // -----------------------------------------------------------------------
  function cssSelector(el){
    if(!(el instanceof Element)) return '';
    const parts=[];
    while(el && el.nodeType===1 && el!==document.body){
      let sel=el.nodeName.toLowerCase();
      if(el.id){sel+='#'+el.id;parts.unshift(sel);break;}
      let sib=el,nth=1;while((sib=sib.previousElementSibling)) if(sib.nodeName.toLowerCase()===sel) nth++;
      sel+=`:nth-of-type(${nth})`;
      parts.unshift(sel);
      el=el.parentNode;
    }
    return parts.join(' > ');
  }

  // -----------------------------------------------------------------------
  // UI bits ----------------------------------------------------------------
  // -----------------------------------------------------------------------
  function makeButton(label){
    const b=document.createElement('button');
    b.id='__fw_btn';
    b.textContent=label;
    Object.assign(b.style,{
      position:'fixed',bottom:'16px',right:'16px',zIndex:10000,
      padding:'8px 12px',borderRadius:'4px',background:'#0070f3',color:'#fff',
      border:'none',cursor:'pointer',fontSize:'14px',
      boxShadow:'0 2px 8px rgba(0,0,0,.15)'
    });
    return b;
  }

  function commentBox(x,y,saveCb){
    const wrap=document.createElement('div');
    Object.assign(wrap.style,{
      position:'fixed',top:`${y+10}px`,left:`${x+10}px`,zIndex:10001,
      background:'#fff',border:'1px solid #ccc',padding:'8px',borderRadius:'4px',width:'240px',
      boxShadow:'0 2px 8px rgba(0,0,0,.15)'
    });
    wrap.innerHTML=`<textarea rows="3" style="width:100%;box-sizing:border-box"></textarea>
      <div style="text-align:right;margin-top:4px">
        <button style="padding:4px 10px;border:none;background:#0070f3;color:#fff;border-radius:3px;cursor:pointer">Save</button>
      </div>`;
    const ta=wrap.querySelector('textarea');
    wrap.querySelector('button').onclick=()=>{
      const txt=ta.value.trim();
      if(!txt) return alert('Comment can’t be empty');
      saveCb(txt).then(()=>wrap.remove());
    };
    document.body.appendChild(wrap);
  }

  // -----------------------------------------------------------------------
  // Main flow --------------------------------------------------------------
  // -----------------------------------------------------------------------
  (async()=>{
    const db=await getFirestore();
    const btn=makeButton(state.buttonLabel);
    document.body.appendChild(btn);

    let overlay=null,inMarkup=false;
    function update(){btn.textContent=inMarkup?'Navigate':'Markup';}

    function enter(){
      inMarkup=true;update();
      overlay=document.createElement('div');
      Object.assign(overlay.style,{position:'fixed',inset:0,zIndex:9999,cursor:'crosshair',background:'rgba(0,0,0,.05)'});
      overlay.addEventListener('click',pick,{once:true});
      document.body.appendChild(overlay);
    }
    function exit(){inMarkup=false;overlay?.remove();overlay=null;update();}

    async function pick(ev){
      ev.preventDefault();const {clientX:x,clientY:y}=ev;exit();
      const target=document.elementFromPoint(x,y);
      const selector=cssSelector(target);
      commentBox(x,y, async text=>{
        await db.collection(state.collection).add({
          url:location.href,selector,x,y,text,created:Date.now()
        });
        alert('Feedback sent – thank you!');
      });
    }

    btn.onclick=()=>inMarkup?exit():enter();
  })();
})();
