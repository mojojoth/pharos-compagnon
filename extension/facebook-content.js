(() => {
  'use strict';
  if(globalThis.__pharosCompanionLoaded) return;
  globalThis.__pharosCompanionLoaded=true;
  const adapter=globalThis.PharosFacebook;
  function scan(root=document) {
    for(const comment of adapter.discover(root)) {
      if([...comment.querySelectorAll('[data-pharos-button]')].some(b=>b.closest('[role="article"]')===comment||!comment.matches('[role="article"]'))) continue;
      const button=document.createElement('button');
      button.type='button';button.setAttribute('data-pharos-button','');button.className='pharos-companion-button';button.textContent='PHAROS';
      button.title='Collecter ce commentaire et préparer un signalement';
      button.addEventListener('click',async event=>{
        event.preventDefault();event.stopPropagation();if(!event.isTrusted||button.disabled) return;
        button.disabled=true;button.textContent='Collecte…';
        try {
          const source=adapter.extract(comment);
          const result=await chrome.runtime.sendMessage({type:'COLLECT',source});
          if(!result?.ok) throw new Error(result?.error||'Collecte impossible.');
          button.textContent=result.data.duplicate?'Déjà collecté ✓':'Collecté ✓';
        } catch(e) {button.textContent='Réessayer PHAROS';button.title=(e.message||'Rechargez Facebook après une mise à jour de l’extension.');}
        finally {button.disabled=false;}
      });
      adapter.insertionPoint(comment).appendChild(button);
    }
  }
  const pending=new Set();let timer;
  const observer=new MutationObserver(changes=>{
    for(const change of changes) for(const node of change.addedNodes) if(node.nodeType===1&&!node.hasAttribute('data-pharos-button')) {
      pending.add(node.closest('[role="article"]')||node);
    }
    if(pending.size&&!timer) timer=setTimeout(()=>{timer=null;for(const node of pending) if(node.isConnected) scan(node);pending.clear();},300);
  });
  scan();observer.observe(document.body,{childList:true,subtree:true});
  chrome.runtime.onMessage.addListener((m,_s,reply)=>{if(m.type==='RESCAN'){scan();reply({ok:true});}});
})();
