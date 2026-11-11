(() => {
  'use strict';
  const official=globalThis.PharosOfficial;
  async function start() {
    const response=await chrome.runtime.sendMessage({type:'HANDOFF'});
    const h=response?.ok&&response.data;if(!h) return;
    const host=document.createElement('div');host.setAttribute('data-pharos-companion-panel','');
    host.style.cssText='position:fixed;right:16px;bottom:16px;z-index:2147483647;width:min(350px,calc(100vw - 32px));';
    const shadow=host.attachShadow({mode:'open'});
    const style=document.createElement('style');style.textContent=`:host{all:initial}*{box-sizing:border-box}section{font:14px/1.5 system-ui;color:#163333;border:1px solid #b9d9d0;background:#fff;border-radius:16px;box-shadow:0 12px 45px #0a302d33;padding:18px;max-height:70vh;overflow:auto}header{display:flex;justify-content:space-between;align-items:center}b{font-size:16px}small{display:block;color:#617773}p{margin:12px 0}button{font:600 13px system-ui;border:1px solid #bed4cd;border-radius:9px;background:#f2f8f5;color:#145a50;padding:9px 12px;cursor:pointer;margin:3px 2px}button.primary{background:#116b5d;color:#fff;border-color:#116b5d}textarea{width:100%;height:105px;border:1px solid #ccdcd6;border-radius:8px;font:12px system-ui;padding:8px}label{font-size:12px;display:block;margin-top:10px}a{color:#146b5d}summary{cursor:pointer}#status{background:#eef6f2;padding:10px;border-radius:8px}button:focus-visible{outline:3px solid #239e89}footer{font-size:11px;color:#647870;margin-top:12px}`;
    shadow.appendChild(style);
    const section=document.createElement('section');
    section.innerHTML='<header><b>PHAROS Compagnon</b><button id="fold" title="Réduire le panneau">−</button></header><small>Assistant indépendant · Brouillon local</small><div id="body"><p id="status" role="status">Préparation…</p><button class="primary" id="fill">Préremplir cette étape</button><button id="pause">Mettre en pause</button><details><summary>Copier les informations</summary><label>Lien du contenu<textarea id="url" readonly></textarea></label><button id="copy-url">Copier le lien</button><label>Description<textarea id="description" readonly></textarea></label><button id="copy-description">Copier la description</button></details><footer>Seules les étapes Contenu et Description peuvent être préparées et avancées. Vos coordonnées, les contrôles du portail et l’envoi restent à votre main. Session : 30 minutes.</footer></div>';
    shadow.appendChild(section);document.documentElement.appendChild(host);
    const $=id=>shadow.getElementById(id);
    $('url').value=h.url;$('description').value=h.description;
    let paused=false,busy=false,timer,advancedStage='',previousPath='';
    const status=message=>{$('status').textContent=message;};
    $('fold').onclick=()=>{const hidden=!$('body').hidden;$('body').hidden=hidden;$('fold').textContent=hidden?'+':'−';};
    async function copy(id) {
      try{await navigator.clipboard.writeText($(id).value);status('Copié.');}
      catch{$(id).focus();$(id).select();status('Texte sélectionné : utilisez ⌘C pour copier.');}
    }
    $('copy-url').onclick=()=>copy('url');$('copy-description').onclick=()=>copy('description');
    $('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Reprendre':'Mettre en pause';status(paused?'Assistant en pause.':'Assistant repris.');if(!paused) prepare();};
    function retry(manual){clearTimeout(timer);timer=setTimeout(()=>prepare(manual),100);}
    async function prepare(manual=false) {
      if(busy||paused) return;
      if(h.expiresAt<=Date.now()) {status('Brouillon expiré. Rouvrez PHAROS depuis la fiche.');observer.disconnect();return;}
      busy=true;
      const path=location.pathname;
      if(path!==previousPath){previousPath=path;advancedStage='';}
      try {
        const result=official.fill(h);status(result.message);
        if(result.pending){retry(manual);return;}
        if(result.ok&&h.autoAdvance&&!manual&&advancedStage!==path) {
          // Let the portal framework update its validation, then check the exact button.
          await new Promise(resolve=>setTimeout(resolve,250));
          if(paused||location.pathname!==path) return;
          const verified=official.fill(h);status(verified.message);
          if(verified.pending){retry(manual);return;}
          if(official.advance(verified)) {advancedStage=path;status('Étape préparée. Passage à la suivante…');}
        }
      } finally {busy=false;}
    }
    $('fill').onclick=()=>prepare(true);
    const observer=new MutationObserver(changes=>{
      if(changes.every(c=>host.contains(c.target)||c.target===host)) return;
      clearTimeout(timer);timer=setTimeout(()=>prepare(),300);
    });
    observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
    setTimeout(()=>{paused=true;observer.disconnect();$('url').value='';$('description').value='';h.description='';h.url='';status('Brouillon expiré. Rouvrez PHAROS depuis la fiche.');$('fill').disabled=true;},Math.max(0,h.expiresAt-Date.now()));
    await prepare();
  }
  start().catch(()=>{});
})();
