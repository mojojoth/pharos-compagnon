import {newRecord,cleanDraft,description,summary,text,facebookUrl,facebookLinks,isOfficial,STATUSES,imageFromData,verifyImport} from './core.js';
const prefix='record:';
const ready=Promise.all([
  chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'}),
  chrome.storage.session.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'})
]);
let writes=Promise.resolve();
function serial(fn) { const pending=writes.then(fn); writes=pending.catch(()=>{}); return pending; }
async function record(id) {
  if(typeof id!=='string'||!/^[a-f0-9-]{36}$/i.test(id)) throw new Error('Fiche introuvable.');
  const r=(await chrome.storage.local.get(prefix+id))[prefix+id];
  if(!r) throw new Error('Fiche introuvable.'); return r;
}
async function all() {
  const values=await chrome.storage.local.get(null);
  return Object.entries(values).filter(([k])=>k.startsWith(prefix)).map(([,v])=>v).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
async function store(r) { await chrome.storage.local.set({[prefix+r.id]:r}); return r; }
async function openEditor(id='') { return chrome.tabs.create({url:chrome.runtime.getURL('dashboard.html')+(id?'#'+id:'')}); }
function isUI(s) { return s.id===chrome.runtime.id && typeof s.url==='string' && s.url.startsWith(chrome.runtime.getURL('')); }
function isFacebook(s) { return s.id===chrome.runtime.id && s.frameId===0 && Boolean(facebookUrl(s.url)) && s.tab?.id!==undefined; }
function isPortal(s) { return s.id===chrome.runtime.id && s.frameId===0 && isOfficial(s.url) && s.tab?.id!==undefined; }
async function collect(input,tab) {
  const r=await newRecord({...input,pageUrl:tab.url,observedAt:new Date().toISOString(),platform:'facebook'});
  // Improved metadata gets a new original instead of reopening an incomplete
  // v1.0.0 collection or changing an existing original.
  const previous=r.source.commentUrl && (await all()).find(x=>
    x.source.commentUrl===r.source.commentUrl&&x.source.commentText===r.source.commentText&&
    x.source.author===r.source.author&&x.source.authorUrl===r.source.authorUrl&&x.source.postUrl===r.source.postUrl);
  const chosen=previous||await store(r);
  await chrome.storage.session.set({['last:'+tab.id]:chosen.id});
  await openEditor(chosen.id);
  return {id:chosen.id,duplicate:Boolean(previous)};
}
export async function handle(m,s) {
  await ready;
  if(!m||typeof m.type!=='string') throw new Error('Action inconnue.');
  if(isFacebook(s) && m.type==='COLLECT') return serial(()=>collect(m.source||{},s.tab));
  if(isPortal(s) && m.type==='HANDOFF') {
    const key='handoff:'+s.tab.id, h=(await chrome.storage.session.get(key))[key];
    if(!h || h.expiresAt<Date.now()) { if(h) await chrome.storage.session.remove(key); return null; }
    return h;
  }
  if(!isUI(s)) throw new Error('Action refusée.');
  switch(m.type) {
    case 'LIST': return (await all()).map(summary);
    case 'GET': return record(m.id);
    case 'OPEN_DASHBOARD': await openEditor(m.id); return true;
    case 'CREATE_MANUAL': return serial(async()=>{
      const r=await newRecord({commentText:'',platform:'manual',captureMethod:'manual'});
      await store(r); return r;
    });
    case 'SAVE': return serial(async()=>{
      const r=await record(m.id);
      if(m.expectedUpdatedAt!==r.updatedAt) throw new Error('Cette fiche a changé dans un autre onglet. Rechargez-la avant de modifier.');
      r.draft=cleanDraft(m.draft,r.source); r.notes=text(m.notes);r.receipt=text(m.receipt,1000);
      r.status=Object.hasOwn(STATUSES,m.status)?m.status:r.status;
      r.updatedAt=new Date().toISOString();return store(r);
    });
    case 'DELETE': return serial(async()=>{await record(m.id);await chrome.storage.local.remove(prefix+m.id);return true;});
    case 'EXPORT': return {app:'pharos-compagnon',schemaVersion:1,exportedAt:new Date().toISOString(),records:await all()};
    case 'IMPORT': return serial(async()=>{
      const incoming=await verifyImport(m.backup), existing=new Set((await all()).map(r=>r.id));
      const additions=incoming.filter(r=>!existing.has(r.id));
      if(additions.length) await chrome.storage.local.set(Object.fromEntries(additions.map(r=>[prefix+r.id,r])));
      return {added:additions.length,skipped:incoming.length-additions.length};
    });
    case 'ADD_IMAGE': return serial(async()=>{
      const r=await record(m.id); if(r.screenshots.length>=5) throw new Error('Cinq captures maximum par fiche.');
      r.screenshots.push(await imageFromData(m.dataUrl,{method:'attachment',sourceUrl:r.source.pageUrl}));
      r.updatedAt=new Date().toISOString();return store(r);
    });
    case 'REMOVE_IMAGE': return serial(async()=>{
      const r=await record(m.id);
      if(m.expectedUpdatedAt!==r.updatedAt)throw new Error('Cette fiche a changé dans un autre onglet. Rechargez-la avant de retirer la capture.');
      const index=r.screenshots.findIndex(image=>image.id===m.imageId);
      if(index<0)throw new Error('Cette capture n’est plus présente dans la fiche. Rechargez la fiche.');
      r.screenshots.splice(index,1);
      r.updatedAt=new Date().toISOString();return store(r);
    });
    case 'POPUP_STATE': {
      const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
      const id=tab&&(await chrome.storage.session.get('last:'+tab.id))['last:'+tab.id];
      let last=null; if(id) try { last=summary(await record(id)); } catch {}
      return {count:(await all()).length,last,canCapture:Boolean(last&&facebookUrl(tab?.url))};
    }
    case 'CAPTURE': return serial(async()=>{
      if(!s.url.endsWith('/popup.html')) throw new Error('Ouvrez le bouton de l’extension sur Facebook pour capturer.');
      const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
      const id=tab&&(await chrome.storage.session.get('last:'+tab.id))['last:'+tab.id];
      if(!id || id!==m.id || !facebookUrl(tab?.url)) throw new Error('Revenez sur l’onglet Facebook du commentaire puis cliquez sur l’extension.');
      const r=await record(id);if(r.screenshots.length>=5) throw new Error('Cinq captures maximum par fiche.');
      const dataUrl=await chrome.tabs.captureVisibleTab(tab.windowId,{format:'png'});
      const [stillActive]=await chrome.tabs.query({active:true,currentWindow:true});
      if(stillActive?.id!==tab.id || stillActive.url!==tab.url) throw new Error('L’onglet a changé : capture abandonnée.');
      r.screenshots.push(await imageFromData(dataUrl,{sourceUrl:tab.url,method:'viewport'}));r.updatedAt=new Date().toISOString();await store(r);return {count:r.screenshots.length};
    });
    case 'OPEN_PHAROS': {
      const r=await record(m.id),d=r.draft;
      if(d.visibility!=='public') throw new Error('Confirmez la visibilité publique du contenu dans la fiche avant de préparer PHAROS.');
      if(d.commentUrl&&!facebookLinks.commentUrl(d.commentUrl))throw new Error('Le lien du commentaire ne désigne pas un commentaire Facebook reconnu. S’il pointe vers un profil, collectez à nouveau le commentaire ou corrigez ce champ.');
      if(d.postUrl&&!facebookLinks.postUrl(d.postUrl))throw new Error('Le lien de la publication ne désigne pas une publication Facebook reconnue. Corrigez ce champ avant de préparer PHAROS.');
      const url=facebookLinks.commentUrl(d.commentUrl)||facebookLinks.postUrl(d.postUrl)||facebookLinks.postUrl(r.source.pageUrl);
      if(!url)throw new Error('Le lien de la publication ou du commentaire manque. Le profil de l’auteur ne peut pas être utilisé comme lien du contenu signalé.');
      if(!d.text.trim()) throw new Error('Renseignez le contenu du commentaire.');
      if(!d.category) throw new Error('Choisissez la catégorie du signalement dans la fiche.');
      if(!['yes','no'].includes(d.victim))throw new Error('Choisissez Oui ou Non pour « Je suis la victime du signalement » dans la fiche.');
      const tab=await chrome.tabs.create({url:'about:blank'});
      try {
        await chrome.storage.session.set({['handoff:'+tab.id]:{id:r.id,category:d.category,victim:d.victim,url,description:description(r),observedAt:r.source.observedAt,autoAdvance:m.autoAdvance===true,expiresAt:Date.now()+30*60*1000}});
        await chrome.tabs.update(tab.id,{url:'https://internet-signalement.gouv.fr/etape/contenu'});
      } catch(error) {await chrome.storage.session.remove('handoff:'+tab.id);throw error;}
      return true;
    }
    default: throw new Error('Action inconnue.');
  }
}
chrome.runtime.onMessage.addListener((m,s,reply)=>{
  handle(m,s).then(data=>reply({ok:true,data})).catch(e=>reply({ok:false,error:e.message||'Une erreur est survenue.'}));
  return true;
});
chrome.runtime.onInstalled.addListener(async()=>{
  await ready;await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({id:'pharos-selection',title:'Préparer un signalement PHAROS avec cette sélection',contexts:['selection'],documentUrlPatterns:['https://www.facebook.com/*','https://facebook.com/*','https://m.facebook.com/*','https://mbasic.facebook.com/*']});
});
chrome.contextMenus.onClicked.addListener((info,tab)=>{
  if(info.menuItemId!=='pharos-selection'||!tab?.id||!facebookUrl(tab.url)) return;
  serial(async()=>{await ready;return collect({commentText:info.selectionText,rawVisibleText:info.selectionText,commentUrl:'',postUrl:'',captureMethod:'selection'},tab);}).catch(()=>openEditor());
});
chrome.tabs.onRemoved.addListener(id=>{chrome.storage.session.remove(['handoff:'+id,'last:'+id]);});
