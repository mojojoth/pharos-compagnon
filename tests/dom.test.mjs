import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {JSDOM}=require(process.env.PHAROS_JSDOM_PATH||'jsdom');
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8eoAAAAASUVORK5CYII=';
function event(){const listeners=[];return {addListener:f=>listeners.push(f),emit:(...args)=>listeners.forEach(f=>f(...args))};}
const onChanged=event();
function area(name){const values={};return {values,accessLevel:'',async setAccessLevel({accessLevel}){this.accessLevel=accessLevel;},async get(keys){if(keys===null)return structuredClone(values);const result={};for(const k of typeof keys==='string'?[keys]:keys)if(k in values)result[k]=structuredClone(values[k]);return result;},async set(input){const changes={};for(const [key,value]of Object.entries(input)){changes[key]={oldValue:values[key],newValue:structuredClone(value)};values[key]=structuredClone(value);}onChanged.emit(changes,name);},async remove(keys){for(const k of typeof keys==='string'?[keys]:keys)delete values[k];}};}
const uiSender={id:'test-extension',url:'chrome-extension://test-extension/dashboard.html'};
const fbSender={id:'test-extension',frameId:0,url:'https://www.facebook.com/post/123',tab:{id:1,url:'https://www.facebook.com/post/123',windowId:1}};
const tabs=new Map([[1,{...fbSender.tab}]]);let nextTab=10,activeId=1,switchOnCapture=false;
globalThis.chrome={
 storage:{local:area('local'),session:area('session'),onChanged},
 runtime:{id:'test-extension',getURL:p=>'chrome-extension://test-extension/'+p,onMessage:event(),onInstalled:event()},
 contextMenus:{removeAll:async()=>{},create:()=>{},onClicked:event()},
 tabs:{async create({url}){const tab={id:nextTab++,url,windowId:1};tabs.set(tab.id,tab);return {...tab};},async update(id,{url}){tabs.get(id).url=url;return {...tabs.get(id)};},async query(){return [{...tabs.get(activeId)}];},async captureVisibleTab(){if(switchOnCapture)activeId=999;return png;},onRemoved:event()}
};
const {handle}=await import('../extension/background.js');
chrome.runtime.sendMessage=async message=>{try{return {ok:true,data:await handle(message,uiSender)};}catch(e){return {ok:false,error:e.message};}};
const fbHtml=await read('tests/fixtures/facebook.html'),portalHtml=await read('tests/fixtures/pharos.html');
const facebookAdapter=await read('extension/connectors/facebook-urls.js')+'\n'+await read('extension/connectors/facebook.js'),facebookContent=await read('extension/facebook-content.js');
const officialAdapter=await read('extension/connectors/pharos.js'),officialContent=await read('extension/pharos-content.js');
async function until(fn,timeout=5000){const start=Date.now();while(!fn()){if(Date.now()-start>timeout)throw new Error('Condition de test non atteinte.');await new Promise(r=>setTimeout(r,20));}}
function dom(html,url,sender){
 const d=new JSDOM(html,{url,runScripts:'dangerously',pretendToBeVisual:true});
 // jsdom has no trusted input source. Retain the registered handler so the test
 // can supply a simulated browser-trusted event without weakening production.
 d.pharosClickHandlers=new WeakMap();
 const add=d.window.EventTarget.prototype.addEventListener;
 d.window.EventTarget.prototype.addEventListener=function(type,fn,...options){if(type==='click'&&this.hasAttribute?.('data-pharos-button'))d.pharosClickHandlers.set(this,fn);return add.call(this,type,fn,...options);};
 d.window.chrome={runtime:{sendMessage:async m=>{try{return {ok:true,data:await handle(m,sender)};}catch(e){return {ok:false,error:e.message};}},onMessage:event()}};
 d.window.HTMLElement.prototype.getClientRects=function(){return this.hidden||this.style.display==='none'?[]:[{width:20,height:20}];};
 return d;
}
let main,reply;
test('Stockage réservé aux contextes de confiance et messages non autorisés refusés',async()=>{
 await handle({type:'LIST'},uiSender);
 assert.equal(chrome.storage.local.accessLevel,'TRUSTED_CONTEXTS');assert.equal(chrome.storage.session.accessLevel,'TRUSTED_CONTEXTS');
 for(const type of ['LIST','GET','EXPORT','SAVE','DELETE','OPEN_PHAROS','CAPTURE'])await assert.rejects(()=>handle({type,id:'x'},fbSender),/refusée/);
 await assert.rejects(()=>handle({type:'COLLECT'}, {...fbSender,url:'https://www.facebook.com.evil.test/'}),/refusée/);
 await assert.rejects(()=>handle({type:'COLLECT'}, {...fbSender,frameId:2}),/refusée/);
});
test('Facebook : deux commentaires reconnus, aucun dossier créé sans clic',async()=>{
 const d=dom(fbHtml,fbSender.url,fbSender);
 try{d.window.eval(facebookAdapter);d.window.eval(facebookContent);assert.equal(d.window.document.querySelectorAll('[data-pharos-button]').length,2);assert.equal((await handle({type:'LIST'},uiSender)).length,0);}
 finally{d.window.close();}
});
test('Facebook : extraction parent/réponse, emoji, URL et collecte au clic',async()=>{
 const d=dom(fbHtml,fbSender.url,fbSender);
 try{
  d.window.eval(facebookAdapter);d.window.eval(facebookContent);
  const extracted=d.window.PharosFacebook.extract(d.window.document.getElementById('comment-one'));
  assert.equal(extracted.author,'Compte Exemple');assert.equal(extracted.commentText,'Commentaire fictif pour vérifier la collecte. ✊');assert.equal(extracted.commentUrl,'https://www.facebook.com/post/123?comment_id=456');assert.equal(extracted.postUrl,'https://www.facebook.com/post/123');
  const response=d.window.PharosFacebook.extract(d.window.document.getElementById('reply-one'));assert.equal(response.author,'Compte Réponse');assert.equal(response.commentText,'Réponse fictive distincte.');assert.match(response.commentUrl,/reply_comment_id=789/);
  const button=d.window.document.querySelector('#comment-one > .actions [data-pharos-button]');
  button.click();await new Promise(r=>setTimeout(r,20));assert.equal((await handle({type:'LIST'},uiSender)).length,0);
  await d.pharosClickHandlers.get(button)({isTrusted:true,preventDefault(){},stopPropagation(){}});
  await until(()=>d.window.document.querySelector('#comment-one > .actions [data-pharos-button]').textContent==='Collecté ✓');
  const list=await handle({type:'LIST'},uiSender);assert.equal(list.length,1);main=await handle({type:'GET',id:list[0].id},uiSender);
  const again=await handle({type:'COLLECT',source:extracted},fbSender);assert.equal(again.duplicate,true);assert.equal(again.id,main.id);
  const res=await handle({type:'COLLECT',source:response},fbSender);reply=await handle({type:'GET',id:res.id},uiSender);assert.equal((await handle({type:'LIST'},uiSender)).length,2);
 }finally{d.window.close();}
});
test('Facebook : avatar ignoré pour le nom, retours à la ligne et repli signalé',()=>{
 const d=dom(fbHtml,fbSender.url,fbSender);
 try{d.window.eval(facebookAdapter);const block=d.window.document.getElementById('comment-one');const avatar=d.window.document.createElement('a');avatar.href='/compte.exemple';avatar.innerHTML='<img alt="Photo de profil du compte">';block.prepend(avatar);block.querySelector('[data-comment-text]').innerHTML='<div>Première ligne.</div><div>Deuxième ligne.<br>Troisième ligne.</div><button role="button">Voir plus</button>';const collected=d.window.PharosFacebook.extract(block);assert.equal(collected.author,'Compte Exemple');assert.match(collected.commentText,/Première ligne\.\nDeuxième ligne\.\nTroisième ligne\./);assert.equal(collected.truncated,true);}
 finally{d.window.close();}
});
test('Facebook : wrapper de mise en page et lien cité dans le texte isolés',()=>{
 const d=dom('<div role="article" aria-label="Commentaire de Exemple" id="wrapper"><div dir="auto"><a href="/auteur">Exemple</a><div dir="auto" data-comment-text>Message avec un <a href="/post/other?comment_id=other">lien cité</a>.</div><div><a href="/post/123?comment_id=correct"><time>1 h</time></a><button role="button">Répondre</button></div></div></div>',fbSender.url,fbSender);
 try{d.window.eval(facebookAdapter);const r=d.window.PharosFacebook.extract(d.window.document.getElementById('wrapper'));assert.equal(r.commentText,'Message avec un lien cité.');assert.equal(r.author,'Exemple');assert.match(r.commentUrl,/comment_id=correct/);}
 finally{d.window.close();}
});
test('Facebook : MutationObserver ajoute le bouton aux nouveaux commentaires',async()=>{
 const d=dom(fbHtml,fbSender.url,fbSender);
 try{d.window.eval(facebookAdapter);d.window.eval(facebookContent);d.window.document.getElementById('dynamic').innerHTML='<div role="article" aria-label="Commentaire nouveau" id="later"><a href="/new">Nouveau Compte</a><div dir="auto">Nouveau texte.</div><a href="/post/123?comment_id=900">1 min</a></div>';await until(()=>d.window.document.querySelector('#later [data-pharos-button]'));assert.equal(d.window.document.querySelectorAll('[data-pharos-button]').length,3);assert.equal((await handle({type:'LIST'},uiSender)).length,2);}
 finally{d.window.close();}
});
test('Édition et conflit de version : collecte originale conservée',async()=>{
 const before=structuredClone(main.source);
 main=await handle({type:'SAVE',id:main.id,expectedUpdatedAt:main.updatedAt,draft:{...main.draft,category:'hate',visibility:'public',victim:'no',context:'Contexte fictif.'},notes:'Note privée',status:'prepared',receipt:''},uiSender);
 assert.deepEqual(main.source,before);assert.equal(main.status,'prepared');
 await assert.rejects(()=>handle({type:'SAVE',id:main.id,expectedUpdatedAt:'2000-01-01T00:00:00Z',draft:main.draft},uiSender),/autre onglet/);
});
test('PHAROS : visibilité non vérifiée, catégorie et lien manquants expliqués',async()=>{
 await assert.rejects(()=>handle({type:'OPEN_PHAROS',id:reply.id},uiSender),/visibilité/);
 const manual=await handle({type:'CREATE_MANUAL'},uiSender);assert.equal(manual.source.commentText,'');
 await handle({type:'DELETE',id:manual.id},uiSender);
});
test('PHAROS : transfert par onglet, aucune note privée, expiration',async()=>{
 await handle({type:'OPEN_PHAROS',id:main.id,autoAdvance:true},uiSender);
 const tab=[...tabs.values()].at(-1);assert.equal(tab.url,'https://internet-signalement.gouv.fr/etape/contenu');
 const s={id:'test-extension',url:tab.url,tab,frameId:0};
 const h=await handle({type:'HANDOFF'},s);assert.equal(h.id,main.id);assert.equal(h.victim,'no');assert.equal(h.description.includes('Note privée'),false);
 assert.equal(await handle({type:'HANDOFF'},{...s,tab:{id:999}}),null);
 await chrome.storage.session.set({['handoff:'+tab.id]:{...h,expiresAt:Date.now()-1}});assert.equal(await handle({type:'HANDOFF'},s),null);
});
test('PHAROS : préremplissage et avancement jusqu’aux informations, aucun envoi',async()=>{
 await handle({type:'OPEN_PHAROS',id:main.id,autoAdvance:true},uiSender);
 const tab=[...tabs.values()].at(-1),sender={id:'test-extension',url:tab.url,tab,frameId:0};
 const d=dom(portalHtml,tab.url,sender);
 try{
  d.window.eval(officialAdapter);d.window.eval(officialContent);
  await until(()=>d.window.location.pathname==='/etape/informations');
  assert.equal(d.window.document.getElementById('personal-name').value,'');assert.equal(d.window.informationClicks,0);assert.equal(d.window.finalClicks,0);
  assert.equal(d.window.PharosOfficial.stage(),'manual');
 }finally{d.window.close();}
});
test('PHAROS : un onglet indépendant ne reçoit pas de panneau',async()=>{
 const d=dom(portalHtml,'https://internet-signalement.gouv.fr/etape/contenu',{id:'test-extension',frameId:0,url:'https://internet-signalement.gouv.fr/etape/contenu',tab:{id:987}});
 try{d.window.eval(officialAdapter);d.window.eval(officialContent);await new Promise(r=>setTimeout(r,20));assert.equal(d.window.document.querySelector('[data-pharos-companion-panel]'),null);}
 finally{d.window.close();}
});
test('PHAROS : champs existants conservés, textes longs et expiration bloqués',()=>{
 const url='https://internet-signalement.gouv.fr/etape/identifier',d=dom(portalHtml,url,{id:'test-extension',frameId:0,url,tab:{id:988}});
 try{
  d.window.eval(officialAdapter);const api=d.window.PharosOfficial;
  const h={expiresAt:Date.now()+10000,url:'https://www.facebook.com/post/123',description:'a'.repeat(4001),observedAt:'2026-11-10T10:00:00Z',victim:'no'};
  let result=api.fill(h);assert.equal(result.ok,false);assert.match(result.message,/trop long/);assert.equal(d.window.document.querySelector('textarea').value,'');assert.equal(api.advance(result),false);
  d.window.document.querySelector('input[placeholder="https://exemple.fr"]').value='https://www.facebook.com/other';result=api.fill({...h,description:'Test'});assert.equal(result.ok,false);assert.equal(d.window.document.querySelector('input[placeholder="https://exemple.fr"]').value,'https://www.facebook.com/other');
  assert.equal(api.fill({expiresAt:Date.now()-1}).ok,false);
 }finally{d.window.close();}
});
test('PHAROS : avancement désactivé, catégorie autre laissée au déclarant',async()=>{
 await handle({type:'OPEN_PHAROS',id:main.id,autoAdvance:false},uiSender);const tab=[...tabs.values()].at(-1);
 const d=dom(portalHtml,tab.url,{id:'test-extension',frameId:0,url:tab.url,tab});
 try{d.window.eval(officialAdapter);d.window.eval(officialContent);await until(()=>d.window.document.querySelector('input:checked'));await new Promise(r=>setTimeout(r,350));assert.equal(d.window.location.pathname,'/etape/contenu');const result=d.window.PharosOfficial.fill({category:'other',expiresAt:Date.now()+5000});assert.equal(result.ok,false);}
 finally{d.window.close();}
});
test('Captures : uniquement depuis le popup ; onglet actif contrôlé',async()=>{
 await assert.rejects(()=>handle({type:'CAPTURE',id:main.id},uiSender),/bouton de l’extension/);
 const popup={id:'test-extension',url:'chrome-extension://test-extension/popup.html'};
 activeId=1;await chrome.storage.session.set({'last:1':main.id});const captured=await handle({type:'CAPTURE',id:main.id},popup);assert.equal(captured.count,1);
 switchOnCapture=true;await assert.rejects(()=>handle({type:'CAPTURE',id:main.id},popup),/onglet a changé/);switchOnCapture=false;activeId=1;
 assert.equal((await handle({type:'GET',id:main.id},uiSender)).screenshots.length,1);
});
test('Sauvegardes : ajout sans écrasement, contrôles d’intégrité avant toute écriture',async()=>{
 const backup=await handle({type:'EXPORT'},uiSender),same=await handle({type:'IMPORT',backup},uiSender);assert.deepEqual(same,{added:0,skipped:2});
 await handle({type:'DELETE',id:reply.id},uiSender);const restore=await handle({type:'IMPORT',backup},uiSender);assert.deepEqual(restore,{added:1,skipped:1});
 const altered=structuredClone(backup);altered.records[0].source.commentText='Altération';await assert.rejects(()=>handle({type:'IMPORT',backup:altered},uiSender),/Empreinte/);assert.equal((await handle({type:'LIST'},uiSender)).length,2);
});
test('Recollecte avec nom retrouvé : nouvelle fiche, ancien relevé intact',async()=>{
 const source={...main.source,commentUrl:'https://www.facebook.com/post/123?comment_id=771',author:''};
 const first=await handle({type:'COLLECT',source},fbSender),second=await handle({type:'COLLECT',source:{...source,author:'Compte Retrouvé'}},fbSender);
 assert.notEqual(second.id,first.id);assert.equal(second.duplicate,false);assert.equal((await handle({type:'GET',id:first.id},uiSender)).source.author,'');assert.equal((await handle({type:'GET',id:second.id},uiSender)).source.author,'Compte Retrouvé');
 await handle({type:'DELETE',id:first.id},uiSender);await handle({type:'DELETE',id:second.id},uiSender);
});
test('PHAROS : un ancien lien de profil est refusé avant toute ouverture de formulaire',async()=>{
 let r=await handle({type:'CREATE_MANUAL'},uiSender);
 r=await handle({type:'SAVE',id:r.id,expectedUpdatedAt:r.updatedAt,draft:{...r.draft,text:'Texte fictif',visibility:'public',category:'hate',commentUrl:'https://www.facebook.com/compte?comment_id=456',postUrl:'https://www.facebook.com/compte'},notes:'',receipt:'',status:'draft'},uiSender);
 const before=tabs.size;await assert.rejects(()=>handle({type:'OPEN_PHAROS',id:r.id},uiSender),/profil/);assert.equal(tabs.size,before);
 r=await handle({type:'SAVE',id:r.id,expectedUpdatedAt:r.updatedAt,draft:{...r.draft,commentUrl:'',postUrl:''},notes:'',receipt:'',status:'draft'},uiSender);
 await assert.rejects(()=>handle({type:'OPEN_PHAROS',id:r.id},uiSender),/manque/);assert.equal(tabs.size,before);await handle({type:'DELETE',id:r.id},uiSender);
});
test('PHAROS : Oui coche la case victime et Non la décoche',()=>{
 const url='https://internet-signalement.gouv.fr/etape/identifier';
 for(const choice of ['yes','no']){
  const d=dom(portalHtml,url,{id:'test-extension',frameId:0,url,tab:{id:900}});
  try{d.window.eval(officialAdapter);const box=d.window.document.getElementById('identifier_checkbox__je-suis-la-victime-du-signalement');box.checked=choice!=='yes';const result=d.window.PharosOfficial.fill({expiresAt:Date.now()+10000,url:'https://www.facebook.com/post/123',description:'Texte fictif.',observedAt:'2026-11-10T10:00:00Z',victim:choice});assert.equal(result.ok,true);assert.equal(box.checked,choice==='yes');}
  finally{d.window.close();}
 }
});
test('PHAROS : le choix victime doit être explicite dans la fiche',async()=>{
 let r=await handle({type:'CREATE_MANUAL'},uiSender);
 r=await handle({type:'SAVE',id:r.id,expectedUpdatedAt:r.updatedAt,draft:{...r.draft,text:'Texte fictif',visibility:'public',category:'hate',postUrl:'https://www.facebook.com/post/123',victim:''},notes:'',receipt:'',status:'draft'},uiSender);
 const before=tabs.size;await assert.rejects(()=>handle({type:'OPEN_PHAROS',id:r.id},uiSender),/victime/);assert.equal(tabs.size,before);await handle({type:'DELETE',id:r.id},uiSender);
});
test('PHAROS : une correction manuelle de la case victime est conservée',()=>{
 const url='https://internet-signalement.gouv.fr/etape/identifier',d=dom(portalHtml,url,{id:'test-extension',frameId:0,url,tab:{id:901}});
 try{d.window.eval(officialAdapter);const h={expiresAt:Date.now()+10000,url:'https://www.facebook.com/post/123',description:'Texte fictif.',observedAt:'2026-11-10T10:00:00Z',victim:'yes'};const api=d.window.PharosOfficial;assert.equal(api.fill(h).ok,true);const box=d.window.document.getElementById('identifier_checkbox__je-suis-la-victime-du-signalement');box.click();const result=api.fill(h);assert.equal(result.ok,false);assert.equal(box.checked,false);assert.match(result.message,/conservée/);}
 finally{d.window.close();}
});
test('Tableau de bord : affichage, saisie, aperçu et sauvegarde par les contrôles réels',async()=>{
 const d=dom(await read('extension/dashboard.html'),'chrome-extension://test-extension/dashboard.html#'+main.id,uiSender);
 const previous={window:globalThis.window,document:globalThis.document,location:globalThis.location,confirm:globalThis.confirm};
 Object.assign(globalThis,{window:d.window,document:d.window.document,location:d.window.location,confirm:()=>true});
 try{
  await import('../extension/dashboard.js');await until(()=>!d.window.document.getElementById('editor').hidden);
  assert.equal(d.window.document.getElementById('author').value,'Compte Exemple');assert.equal(d.window.document.querySelectorAll('.record-item').length,2);
  const input=d.window.document.getElementById('context');input.value='Contexte modifié par le formulaire de test.';input.dispatchEvent(new d.window.Event('input',{bubbles:true}));
  const victim=d.window.document.getElementById('victim');assert.equal(victim.value,'no');victim.value='yes';victim.dispatchEvent(new d.window.Event('input',{bubbles:true}));
  assert.match(d.window.document.getElementById('preview').value,/Contexte modifié/);
  d.window.document.getElementById('save').click();await until(()=>d.window.document.getElementById('toast').textContent==='Fiche enregistrée.');
  assert.equal((await handle({type:'GET',id:main.id},uiSender)).draft.context,'Contexte modifié par le formulaire de test.');
  assert.equal((await handle({type:'GET',id:main.id},uiSender)).draft.victim,'yes');
  const workspace=d.window.document.querySelector('.workspace');workspace.scrollTop=600;
  const other=[...d.window.document.querySelectorAll('.record-item')].find(b=>b.querySelector('.record-author').textContent==='Compte Réponse');other.click();
  await until(()=>d.window.document.getElementById('title').textContent==='Compte Réponse');assert.equal(workspace.scrollTop,0);
 }finally{d.window.close();Object.assign(globalThis,previous);}
});
